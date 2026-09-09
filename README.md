# And It’s No Good

A self-hosted fantasy football application where poor kicking earns points. The repository contains the Next.js web app, NestJS API, Expo mobile app, shared TypeScript scoring/validation/API client, PostgreSQL schema and migrations, Redis/BullMQ worker, Socket.IO updates, and Nginx local/OVH configurations.

## Open the local application

**https://anditsnogood.ddev.site/**

The app runs in its own Docker Compose project, `aing`. Only its Nginx gateway joins `ddev_default`. The existing DDEV router terminates local HTTPS. No app port 8080 is published. Other DDEV projects and their databases are separate.

Local demo sign-in:

- Email: `admin@anditsnogood.local`
- Password: `NoGoodDemo2026!`
- Other demo members: `alex@anditsnogood.local`, `jordan@anditsnogood.local`, `sam@anditsnogood.local`, with the same password.

**These are development accounts.** Demo leagues and imported events are explicitly fictional. Production seeding does not create them. Current real kicker assignments and NFL results are maintained through Super Admin; this repository does not pretend the fixtures are live NFL data.

The completed “The Shank Tank · Demo” league demonstrates BUF starter +2 and replacement +3 = +5, DAL −1, KC +1, PHI +3. “Fresh Misfortune · Demo Draft” is an open four-member draft lobby.

## Local tooling

Docker Desktop, Docker Compose, an existing DDEV router, and `mkcert` are required. Node is not required on the host for the web/API stack. Use Node 22 and pnpm 10.17.1 on the host for native mobile development.

```sh
make setup         # build, migrate, start, seed, register local HTTPS route
make dev           # rebuild changed application images and start services
make down          # stop only this application; preserve data volumes
make logs
make migrate
make seed
make test
make typecheck
make integration   # full HTTP/Postgres/Redis/Socket.IO checks
make e2e           # browser checks (downloads Chromium in test container)
make mobile-check
make backup
make restore-check FILE=backups/aing-TIMESTAMP.dump
```

`make reset-db` requires typing `DELETE-AING`; it removes only this Compose project's volumes. Use it only when intentionally discarding local data.

Local service addresses:

- Application and API: https://anditsnogood.ddev.site/ and `/api`
- Swagger: https://anditsnogood.ddev.site/api/docs
- Mailpit: http://localhost:8027 (registration verification and password reset mail)
- Adminer: http://localhost:8081 — PostgreSQL server `postgres`, database/user `aing`, password from `.env`
- PostgreSQL and Redis: internal Docker network only, no published host ports

The route installer creates a certificate for only `anditsnogood.ddev.site`, stores its ignored local copy in `.local-certs`, and registers an additive DDEV dynamic route. It does not alter another project's route. If the global DDEV router is recreated, run `bash infrastructure/scripts/ddev-route.sh` again. Do not delete DDEV's global volume to stop this application.

## Product rules

- Leagues support **2–32** teams. One fantasy team per owner per league.
- A single-round draft assigns **one NFL franchise’s kicking position**, with uniqueness enforced per league and per fantasy team in PostgreSQL.
- The commissioner can configure capacity, schedule, clock, order, and membership before drafting. At least two members must be present; the league need not fill its maximum capacity.
- The worker enforces timeouts. Auto-picks use the owner's ordered preferences, then available franchise codes alphabetically. Pause/resume preserves remaining time. Scheduled time is a not-before gate; the commissioner explicitly starts the draft.
- A picked roster is immutable. No trades, waivers, bench, substitutions, or lineup management.
- All kicking events for the franchise count regardless of who kicked. An individual moving to another franchise does not move the fantasy roster.
- A week without kicking events, including a bye, scores zero. Standings use season cumulative points; equal totals share a competition rank. Name sorts ties for stable display.
- FG miss/blocked/failed ≤29 yards: **+2**. At ≥30: **+1**.
- Missed/failed XP: **+3**. Blocked XP: **+3**. Made XP: **0**.
- Made FG ≥51 yards: **−1**. A 50-yard make is **0**. UNKNOWN is **0**, awaiting correction.
- Each season references an immutable database scoring version. The engine uses that season’s version, not the latest settings.

See [architecture](docs/ARCHITECTURE.md), [CSV contracts](docs/IMPORTS.md), [OVH deployment](docs/DEPLOYMENT.md), [verification log](BUILD_LOG.md), and [remaining external validation](TODO.md).

## Repository map

- `apps/api/src`: authentication, authorization, REST, draft/scoring services, realtime gateway
- `apps/web/app`: responsive web app and global styling
- `apps/mobile/app`: Expo Router native client
- `packages/core/src`: shared scoring, validation, types, API client, CSV/nflverse normalization
- `workers/scoring-worker`: queued imports, automatic draft clock, notification delivery, outbox processing
- `prisma`: schema, checked-in SQL migration, product invariant triggers, development seed
- `tests`: scoring/normalization unit tests, Supertest integration tests, Playwright browser checks
- `infrastructure`: Docker image, DDEV routing, production Compose, Nginx, backup/deployment helpers

## Mobile

```sh
corepack enable
pnpm install --frozen-lockfile
cp apps/mobile/.env.example apps/mobile/.env
pnpm --filter @aing/mobile start
```

A simulator on this Mac can use the local URL after trusting the local CA. A physical phone cannot use a `ddev.site` hostname that resolves to the phone's own loopback address: configure reachable DNS/LAN routing plus a trusted certificate, or point the app to the deployed HTTPS API. Do not weaken production TLS verification.

The app includes email/password login/registration, SecureStore refresh tokens, token rotation, league creation/joining, live draft and auto-pick preferences, standings, event breakdowns, inbox, preferences, and device registration. Email action links open the web flow; the mobile user can refresh verification status afterward. Super Admin bulk data workflows are in the web app.

`pnpm --filter @aing/mobile export` produces both native bundles. Signing/installing on a physical device needs Apple/Google credentials and platform tooling. Set `EXPO_PUBLIC_EAS_PROJECT_ID` for push registration and optional server `EXPO_ACCESS_TOKEN`. Actual delivery requires configured APNs/FCM credentials.
