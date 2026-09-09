#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
backup_path=${1:?Pass a .dump backup path}
# Restore into a separate disposable database; never overwrite aing.
docker compose exec -T postgres createdb -U aing aing_restore_check
docker compose exec -T postgres pg_restore -U aing -d aing_restore_check --exit-on-error < "$backup_path"
docker compose exec -T postgres psql -U aing -d aing_restore_check -c 'SELECT count(*) AS nfl_teams FROM "NflTeam"; SELECT count(*) AS audits FROM "AuditLog";'
docker compose exec -T postgres dropdb -U aing aing_restore_check
