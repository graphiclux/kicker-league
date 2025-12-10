// src/app/api/cron/sportsblaze-daily-boxscores/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Ingests SportsBlaze daily boxscores for a given date and
 * converts kicker boxscore totals into KickPlay rows.
 *
 * Idempotent-ish: uses current KickPlay counts per game/team/result
 * and only inserts the "delta" since last run.
 *
 * Usage (example):
 *   /api/cron/sportsblaze-daily-boxscores?date=2025-02-09
 *
 * If date is omitted it defaults to today's UTC date (YYYY-MM-DD).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");

  const todayUtc = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const date = dateParam || todayUtc;

  const apiKey = process.env.SPORTSBLAZE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "SPORTSBLAZE_API_KEY is not set" },
      { status: 500 }
    );
  }

  const endpoint = `https://api.sportsblaze.com/nfl/v1/boxscores/daily/${date}.json?key=${apiKey}`;

  let data: any;
  try {
    const resp = await fetch(endpoint, { cache: "no-store" });
    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        {
          ok: false,
          error: `SportsBlaze error: ${resp.status} ${resp.statusText}`,
          body: text,
        },
        { status: 502 }
      );
    }
    data = await resp.json();
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to fetch SportsBlaze", detail: String(err) },
      { status: 502 }
    );
  }

  const games: any[] = data?.games ?? [];
  const summary: any[] = [];
  let totalPlaysCreated = 0;

  // NOTE: KickPlay model:
  // id, season, week, gameId, possession, playType, distance, result, blocked
  // We'll approximate distance later – for now we set null and rely
  // on results (made/missed) + XP vs FG.
  for (const game of games) {
    const seasonYear: number | undefined = game?.season?.year;
    const week: number | undefined = game?.season?.week;
    const gameId: string | undefined = game?.id;

    if (!seasonYear || !week || !gameId) continue;

    const perSideStats: any[] = [];

    for (const side of ["away", "home"] as const) {
      const team = game?.teams?.[side];
      const teamId: string | undefined = team?.id;
      const teamName: string | undefined = team?.name;
      const possession = teamId || teamName;
      if (!possession) continue;

      const roster: any[] = game?.rosters?.[side] ?? [];
      const kicker = roster.find((p) => p.position === "K");
      if (!kicker) continue;

      const stats = kicker.stats ?? {};

      const fgAttempts: number = stats.field_goals_attempts ?? 0;
      const fgMade: number = stats.field_goals_made ?? 0;
      const fgMissed: number = stats.field_goals_missed ?? 0;

      const xpAttempts: number = stats.extra_points_attempts ?? 0;
      const xpMade: number = stats.extra_points_made ?? 0;
      const xpMissed: number = stats.extra_points_missed ?? 0;
      const xpBlocked: number = stats.extra_points_blocked ?? 0;

      perSideStats.push({
        side,
        possession,
        fgAttempts,
        fgMade,
        fgMissed,
        xpAttempts,
        xpMade,
        xpMissed,
        xpBlocked,
      });

      // ---- Idempotent diffing vs existing KickPlay rows ----

      // Helper to count existing plays for this game/team
      const baseWhere = {
        season: seasonYear,
        week,
        gameId,
        possession,
      } as const;

      const [existingFgMade, existingFgMissed, existingXpMade, existingXpMissed, existingXpBlocked] =
        await Promise.all([
          db.kickPlay.count({
            where: {
              ...baseWhere,
              playType: "field_goal",
              result: "made",
            },
          }),
          db.kickPlay.count({
            where: {
              ...baseWhere,
              playType: "field_goal",
              result: "missed",
            },
          }),
          db.kickPlay.count({
            where: {
              ...baseWhere,
              playType: "extra_point",
              result: "made",
            },
          }),
          db.kickPlay.count({
            where: {
              ...baseWhere,
              playType: "extra_point",
              result: "missed",
              blocked: false,
            },
          }),
          db.kickPlay.count({
            where: {
              ...baseWhere,
              playType: "extra_point",
              result: "missed",
              blocked: true,
            },
          }),
        ]);

      const toCreateFgMade = Math.max(0, fgMade - existingFgMade);
      const toCreateFgMissed = Math.max(0, fgMissed - existingFgMissed);
      const toCreateXpMade = Math.max(0, xpMade - existingXpMade);
      const toCreateXpMissed = Math.max(0, xpMissed - existingXpMissed);
      const toCreateXpBlocked = Math.max(0, xpBlocked - existingXpBlocked);

      const newPlays = [];

      // NOTE: distance is unknown per attempt; we leave it null for now.
      for (let i = 0; i < toCreateFgMade; i++) {
        newPlays.push({
          season: seasonYear,
          week,
          gameId,
          possession,
          playType: "field_goal",
          distance: null,
          result: "made",
          blocked: false,
        });
      }

      for (let i = 0; i < toCreateFgMissed; i++) {
        newPlays.push({
          season: seasonYear,
          week,
          gameId,
          possession,
          playType: "field_goal",
          distance: null,
          result: "missed",
          blocked: false,
        });
      }

      for (let i = 0; i < toCreateXpMade; i++) {
        newPlays.push({
          season: seasonYear,
          week,
          gameId,
          possession,
          playType: "extra_point",
          distance: null,
          result: "made",
          blocked: false,
        });
      }

      // Non-blocked missed XPs
      for (let i = 0; i < toCreateXpMissed; i++) {
        newPlays.push({
          season: seasonYear,
          week,
          gameId,
          possession,
          playType: "extra_point",
          distance: null,
          result: "missed",
          blocked: false,
        });
      }

      // Blocked XPs (treated as missed, blocked=true)
      for (let i = 0; i < toCreateXpBlocked; i++) {
        newPlays.push({
          season: seasonYear,
          week,
          gameId,
          possession,
          playType: "extra_point",
          distance: null,
          result: "missed",
          blocked: true,
        });
      }

      if (newPlays.length > 0) {
        await db.kickPlay.createMany({
          data: newPlays,
        });
        totalPlaysCreated += newPlays.length;
      }
    }

    if (perSideStats.length > 0) {
      summary.push({
        gameId,
        date,
        season: seasonYear,
        week,
        sides: perSideStats,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    date,
    totalPlaysCreated,
    gamesProcessed: summary.length,
    games: summary,
  });
}
