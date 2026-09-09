# Architecture and invariants

Nginx routes `/api` and `/socket.io` to NestJS and other requests to Next.js. Both web and Expo use one API and the shared core types/validation. PostgreSQL is authoritative. Redis supplies BullMQ, realtime pub/sub, auth throttling, and worker heartbeat. No fantasy totals are accepted from clients or NFL providers.

## Transactions and drafts

All league membership/order/state/pick writes obtain a PostgreSQL row lock on the league, then re-read the state. A unique composite FK guarantees a roster's fantasy team is in the same league. Unique indexes enforce one roster per fantasy team, one NFL franchise per league, and one pick number per league. Database triggers limit inserts to the current draft slot and prevent roster updates/deletes.

Membership capacity is checked in both the API and a trigger under the same league row lock. Owner/league identity cannot move. The first complete pick advances exactly once; racing requests fail without side effects. The persisted deadline allows worker recovery after restarts and does not rely on browser timers. Multiple workers serialize timeout picks through the league lock.

An immutable roster row is also the complete one-round pick record, retaining pick number, displayed kicker, source and timestamp. FantasyTeam.draftOrder is the single draft slot; a separate redundant DraftPick table is unnecessary.

## Global scoring

Normalized kicking events preserve kicker identity/name, NFL team, game/provider IDs, result, distance, raw input, import, point calculation/version, and void history. Player assignments support informational current/backup lists and historical intervals. Scoring never requires the player to match the current assignment.

A team/week score is calculated once, across all active events. Standings join each fantasy roster to those global scores. No separate league totals can drift from the global source.

An advisory transaction lock on `(season, week)` serializes imports, recalculation and lock changes. A batch touching multiple weeks acquires locks in consistent sorted order. Points, global aggregates, audit rows, import completion and realtime outbox entries commit together. A failed transaction applies no partial changes. It records the failure on the import outside the rolled-back transaction.

Immutable audit and scoring-rule tables reject UPDATE/DELETE. Corrections and voids retain before/after data, actor, reason, and timestamp. The season's rule reference cannot be reassigned. A production runtime DB role has no DDL/TRUNCATE privileges and additionally lacks UPDATE/DELETE on immutable tables.

## Imports and reliable delivery

Preview rows, errors, warnings, match results and total calculations are persisted. Confirmation enqueues via a database outbox; losing Redis connectivity during confirmation cannot lose the import intent. The worker dispatches outbox records to BullMQ with deterministic job IDs. An already completed batch is a no-op.

Realtime delivery is at-least-once; clients invalidate queries and fetch authoritative state, so duplicate broadcasts are harmless. Ten-second query polling provides recovery if a socket event is missed. Worker heartbeat is exposed by health status. Draft notifications and score updates carry only identifiers; league socket rooms require membership.

Inbox notifications are created transactionally once per score-update outbox record. Device pushes are at-least-once: a process crash after provider acceptance but before acknowledgement can result in duplicate device notifications. Tickets are followed by receipt checks, and invalid device tokens are removed. External push delivery is not a scoring dependency.

## Authentication

Argon2id password hashes; short-lived signed access JWTs with issuer, audience, algorithm restrictions and a session ID. Refresh secrets are random opaque values; only SHA-256 hashes are stored. Refresh rotates using an atomic compare-and-update. Logout, reset and suspension revoke sessions; each authenticated request checks session/user state.

Web access stays in memory and HttpOnly SameSite cookies; native refresh storage is OS SecureStore. No password/token persists in web localStorage. CSRF checks reject untrusted origins and cross-site writes. Production cookies are Secure. Nginx and Redis rate-limit authentication. Email verification and reset links are single-use, hashed, expiring tokens. Local mail is captured by Mailpit; production uses SMTP.

## Operational boundary

Local Compose is optimized for inspectability and includes development tools. Production Compose omits Mailpit/Adminer and all internal service host ports, uses a DML-only application database role, production env validation, TLS Nginx, health checks, memory limits, non-root Node processes, dropped capabilities, and bounded logs. Application images retain tooling needed by the migration/test commands; split/pruned runtime images are a future image-size optimization, not a different runtime architecture.
