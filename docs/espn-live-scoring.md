# ESPN scoring

The `nfl-sync` Compose service polls ESPN's public NFL scoreboard every 10 minutes. It fetches games in progress and games that started within the last 48 hours, including final games for corrections. It checks today's and the preceding two UTC dates to cross midnight and weekly schedule boundaries. Regular-season games only; preseason and postseason are not mapped into regular-season fantasy weeks.

The corresponding season and scoring rules must already exist. The local database has 2026 configured. Historical 2024 results remain available and are not deleted at kickoff.

Each game is validated against individual kicker field-goal and extra-point made/attempt totals. Unknown descriptions or incomplete feeds block that game's import and are logged. Future polls retry. Successful checks write a health heartbeat, including checks with no games underway. The container becomes unhealthy after prolonged failures; Docker does not automatically restart a merely unhealthy container.

Imports use stable ESPN game/play/kick identifiers and content hashes. Queued/completed unchanged games are not queued again. Database locks prevent concurrent duplicate queues. The existing scoring worker applies season rules and emits the existing score-update notifications shared by web and mobile. ESPN names and headshots are saved for participating kickers. This does not implement an injury or depth-chart feed.

Audited Super Admin corrections and voids take precedence over provider refreshes. A validated nonempty game snapshot can void removed provider plays. An entirely empty feed is not treated as proof that every prior kick was removed; that rare case needs admin reconciliation. Other providers' active events in the same team/week block ESPN imports to prevent double scoring. Do not import nflverse into active ESPN scopes without reconciling sources first.

No API key or subscription is configured. These public endpoints are undocumented and have no verified update-time guarantee. Ten minutes is our polling interval, not a provider latency promise. Commercial reuse rights remain unverified. The Mac and Docker must stay running for local updates; the OVH Compose configuration also includes this service.

Verification:
- `pnpm test` includes ESPN parsing/scheduling regression cases.
- `pnpm exec tsx tests/espn-integration.ts` creates a separate PostgreSQL schema, applies migrations, and checks a real completed game, scores, headshots, idempotency, admin corrections, source removals, and locked weeks. The schema is retained for inspection.
- `docker compose logs --tail=50 nfl-sync worker` shows polling and import results.
- `docker compose ps nfl-sync` shows feed health.
