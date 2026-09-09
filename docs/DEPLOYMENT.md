# OVH deployment (Ubuntu 24.04 LTS)

The complete stack is self-hosted. No hosted database or Vercel dependency is required. This repository prepares deployment; it does not contain your OVH SSH credentials, public domain, SMTP credentials, or Apple/Google signing keys.

Use a VPS with at least 4 GB RAM for the runtime (8 GB recommended when building locally), Docker Engine and Compose v2+, public DNS pointed to it, and SSH key access. Restrict inbound traffic to SSH from approved addresses and public 80/443. Internal databases have no published ports. Keep the server patched and configure off-host monitoring of `/api/health`, worker heartbeat and disk space.

## Release

1. Run the local checks and commit/tag a release.
2. Build images for the server architecture. For example, on the server itself:
   `docker compose build api web worker` (building requires the local compose file but not its DDEV network).
   For a remote registry, use `docker buildx build --platform linux/amd64 -f infrastructure/docker.Dockerfile --target api -t REGISTRY/aing-api:VERSION --push .`, and repeat for web and worker. Use immutable tags/digests in production env; `latest` is only a local default.
3. Copy `infrastructure/production.env.example` to `.env.production` and replace every placeholder. Generate independent owner/app/JWT secrets with `openssl rand -hex 32`. `APP_DB_PASSWORD` must be exactly 64 lowercase hex characters. Set separate owner `MIGRATION_DATABASE_URL` and least-privilege `DATABASE_URL`. Configure actual SMTP.
4. Run production Compose using **only** `infrastructure/production/compose.yml`. It does not inherit development services, DDEV networks, or local ports.

```sh
docker compose --env-file .env.production -f infrastructure/production/compose.yml config --quiet
docker compose --env-file .env.production -f infrastructure/production/compose.yml up -d postgres redis
docker compose --env-file .env.production -f infrastructure/production/compose.yml run --rm migrate
```

Migration uses the owner role, provisions the DML-only runtime role, then seeds reference data only. A production environment fails startup with a development JWT secret or insecure cookies. Do not point production at the local demo database.

## First TLS certificate

Before starting Nginx, with public DNS already resolving to the server and port 80 free:

```sh
docker compose --env-file .env.production -f infrastructure/production/compose.yml --profile tls run --rm -p 80:80 certbot certonly --standalone --non-interactive --agree-tos --email YOUR_EMAIL -d YOUR_DOMAIN
docker compose --env-file .env.production -f infrastructure/production/compose.yml up -d api worker web nginx
```

Substitute the same `DOMAIN` configured in `.env.production`. The certbot service uses the same named certificate volume mounted read-only into Nginx. Subsequent renewals use the webroot shared volume; run `infrastructure/scripts/renew-tls.sh` twice daily via the server's systemd timer or deployment scheduler. It reloads Nginx after renewal. This is server configuration, not a Codex recurring automation.

## Create the initial Super Admin

Use a shell environment or secret manager to set ADMIN_EMAIL and ADMIN_PASSWORD (16+ characters). Do not put the password in shell history:

```sh
read -r -p 'Admin email: ' ADMIN_EMAIL
read -r -s -p 'Admin password: ' ADMIN_PASSWORD
export ADMIN_EMAIL ADMIN_PASSWORD
docker compose --env-file .env.production -f infrastructure/production/compose.yml run --rm -e ADMIN_EMAIL -e ADMIN_PASSWORD api pnpm exec tsx infrastructure/scripts/create-admin.ts
unset ADMIN_PASSWORD ADMIN_EMAIL
```

The bootstrap is create-only and audited. Existing admins are not overwritten. Configure NFL current kickers through Super Admin assignments and import real events after verifying the provider.

## Backups, restore, upgrades and rollback

`AING_PRODUCTION=1 bash infrastructure/scripts/backup.sh` creates a PostgreSQL custom-format dump with restrictive permissions. Schedule daily backups and after stat imports if required by recovery objectives. Copy dumps **encrypted off the server** (e.g. your configured restic repository or OVH object storage); an on-disk copy alone is not disaster recovery. Retention should match league-season history and your privacy policy.

Restore into a **new isolated database**, run `pg_restore --exit-on-error`, validate table counts/standings and immutable triggers, then deliberately switch DATABASE_URL. The local `restore-check.sh` demonstrates the isolated process. Never overwrite an active database during a routine test.

Before upgrades: backup, migrate once, roll out versioned images, check health/worker/import processing. Application rollback means restoring prior image tags **only if compatible with the current database schema**. A breaking schema rollback requires the saved database and coordinated maintenance. Migrations are forward-only; do not edit an already deployed migration.

The helper `deploy.sh` pulls configured images, validates env, runs migrations, and brings up production services. It assumes TLS certificates already exist and registry tags resolve. For locally built images, run the Compose commands above rather than the registry-pull helper.

## External validation still required

Actual OVH deployment, public certificate issuance, SMTP deliverability, mobile signing/device QA, provider freshness, and real push delivery require your external configuration. Local Compose, migrations, builds and automated tests can verify the application before those credentials are supplied. Do not represent synthetic fixtures as current live NFL data.
