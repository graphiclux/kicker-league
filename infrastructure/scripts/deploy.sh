#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
test -f .env.production || { echo 'Create .env.production first.'; exit 1; }
if grep -Eq 'REPLACE_|OWNER_PASSWORD|APP_PASSWORD|example.com' .env.production; then echo 'Production environment still contains placeholders.'; exit 1; fi
chmod 600 .env.production
compose=(docker compose --env-file .env.production -f infrastructure/production/compose.yml)
"${compose[@]}" config --quiet
# Pull versioned images built in CI for linux/amd64 or linux/arm64 as appropriate.
"${compose[@]}" pull api web worker
"${compose[@]}" up -d postgres redis
"${compose[@]}" run --rm migrate
"${compose[@]}" up -d api worker web nginx
"${compose[@]}" ps
