# CSV and correction contracts

Use **Super Admin → Imports**. Choose EVENT or SUMMARY, select/paste a CSV, enter the reason, then validate. Preview persists the exact payload; editing the textarea requires another preview. Review errors, scope-replacement warnings, NFL matches and points, then confirm. The worker records COMPLETED or FAILED in history. The whole import is atomic; a failed import can be retried after resolving the cause.

## Event columns

Required: `season,week,nfl_team,kicker,event_type,distance,result`.

Optional: `event_id,game_id,occurred_at` (ISO datetime including offset).

`event_type`: FIELD_GOAL or EXTRA_POINT. `result`: MADE, MISSED, BLOCKED, FAILED, UNKNOWN. Field goals require an integer distance 1–100; XP distance must be blank. Week must be 1–22. Franchise abbreviations use the seeded 32-team canonical codes.

**With event_id on every row:** incremental upsert keyed by provider plus event ID. Reusing an ID changes the event with before/after audit data. An ID cannot silently move between team/week/season; void the old event and add a distinct ID. Omitted IDs are not implicitly deleted. Corrections from an external provider are deliberate updates to the same source identity.

**Without event_id on all rows:** full snapshot for each included franchise/week. Previous active events from every provider in that scope are voided, then the snapshot is applied. Include the entire team/week. Do not import a single replacement event without an event ID or you would intentionally replace its scope. Mixed identified/unidentified files are rejected.

A snapshot containing two identical kicks legitimately counts two plays; stable snapshot IDs include the row occurrence. Repeating the complete snapshot cannot accumulate points.

## Summary columns

`season,week,nfl_team,fg_miss_under_30,fg_miss_30_plus,xp_miss_block,fg_made_over_50`

Counts must be integers 0–30. One row per franchise/week. A summary always replaces that entire scope, including previous event-provider data. A zero row removes previous points and leaves an explicit zero team/week score.

Summary records use synthetic band distances 29, 30 and 51 and the identity “Team summary (individual unknown).” These are not asserted actual distances or kicker identities. The UI shows this provenance. `xp_miss_block` uses the XP miss score; if a season distinguishes XP misses and blocks, use event imports to preserve that distinction.

Sample files in `fixtures/` are fictional and for testing only. The core score calculation never changes merely because the source was CSV, summary or nflverse.

## Corrections and locks

Select season/week in the top controls and a franchise in Super Admin → Events. Edit result/distance/kicker, add a missing event, or void/restore an event. Every operation requires a reason and updates all affected league standings. Weeks can be locked/unlocked or globally recalculated. An import preview rejects locked scopes; execution checks locks again to prevent preview/confirm races.

## nflverse

`NflverseProvider` accepts NFL play-by-play CSV field_goal_attempt / extra_point_attempt rows, maps results/team aliases, and keys events by game_id/play_id. Configure `NFLVERSE_PBP_URL` as an HTTPS CSV endpoint; `{season}` and `{week}` placeholders are expanded by the server. Only an administrator can request sync. It produces the same reviewable preview before confirmation. Limits: 100 MB response, request timeout, no redirects. Empty/invalid weeks fail validation.

No endpoint is invented or silently enabled. A real source URL and its update cadence must be verified before treating the application as live scoring. CSV works fully independently.
