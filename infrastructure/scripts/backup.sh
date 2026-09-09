#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
umask 077
mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
if [ "${AING_PRODUCTION:-0}" = 1 ]; then
 docker compose --env-file .env.production -f infrastructure/production/compose.yml exec -T postgres pg_dump -U aing_owner -d aing -Fc > "backups/aing-${stamp}.dump"
else
 docker compose exec -T postgres pg_dump -U aing -d aing -Fc > "backups/aing-${stamp}.dump"
fi
test -s "backups/aing-${stamp}.dump"
printf 'Backup created: backups/aing-%s.dump\n' "$stamp"
