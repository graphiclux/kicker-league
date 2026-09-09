# Build log

## 502 gateway correction

- Confirmed Nginx retained the web container's previous IP after Compose recreated it: requests targeted `172.21.0.7:3000` while the healthy web container was at `172.21.0.8`.
- Changed local and production Nginx upstreams to use Docker DNS with shared upstream zones and automatic address refresh.
- Added a gateway health check that requests both the homepage and API, so a healthy API alone no longer masks a broken page route.
- Validated Nginx configuration, reloaded it, and confirmed the public HTTPS homepage returns HTTP 200 and API dependencies report healthy.

## 2026-09-09

- Created the pnpm/Turborepo monorepo with Next.js web, NestJS API, Expo Router mobile, shared core package, Prisma, worker, and Docker infrastructure.
- Added PostgreSQL schema and two checked-in migrations, including database checks/triggers for draft capacity, roster ownership, immutable audit/rules/rosters, and outbox retry fields.
- Added authentication, email verification/reset flows, refresh rotation, RBAC, league creation/joining, commissioner controls, one-round draft, automatic timeout picks, Socket.IO rooms, and standings.
- Added global event scoring, CSV event/summary imports, nflverse normalization, preview/confirm flow, idempotency, locked weeks, corrections, recalculation, audit logs, inbox notifications, Expo push registration, and retryable delivery.
- Added the responsive web experience and the Expo mobile experience.
- Added local DDEV HTTPS routing for `https://anditsnogood.ddev.site/` without publishing an application port.
- Added OVH production Compose/Nginx, TLS, backup/restore, release, runtime-role, and admin-bootstrap scripts.
- Applied migrations and seeded 32 NFL franchises, season 2026, development accounts, fictional demo leagues, and clearly labeled fictional sample events.
- Verification completed: 32 scoring/normalization unit tests, 91 HTTP/database/realtime integration checks, 6 desktop/mobile Playwright checks, API/web/mobile TypeScript checks, Expo iOS/Android export, production build, live `/api/health`, and dependency audit with no known vulnerabilities.
