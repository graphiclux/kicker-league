// src/app/api/cron/weekly-score/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scoreKick } from "@/lib/scoring";

/**
 * Sums KickPlay -> writes to Score per league team.
 * NOW: uses ?season=&week= query params (defaults to 2025 / 1).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const seasonParam = searchParams.get("season");
  const weekParam = searchParams.get("week");

  const season = seasonParam ? Number(seasonParam) : 2025;
  const week = weekParam ? Number(weekParam) : 1;

  if (!Number.isFinite(season) || !Number.isFinite(week) || week < 1) {
    return NextResponse.json(
      { ok: false, error: "Invalid season or week" },
      { status: 400 }
    );
  }

  // 1) Sum points per NFL team from KickPlay for that season/week
  const plays = await db.kickPlay.findMany({ where: { season, week } });

  const perTeam = new Map<string, number>();
  const perTeamBreakdown = new Map<
    string,
    Array<{ desc: string; pts: number }>
  >();

  for (const p of plays) {
    const pts = scoreKick({
      playType: p.playType as any,
      result: p.result as any,
      distance: p.distance,
      blocked: p.blocked,
    });

    const key = p.possession;
    perTeam.set(key, (perTeam.get(key) || 0) + pts);

    const arr = perTeamBreakdown.get(key) || [];
    const label =
      p.playType === "field_goal"
        ? `${p.result.toUpperCase()} FG ${p.distance ?? "?"}y`
        : `${p.result.toUpperCase()} XP${
            p.blocked ? " (blocked)" : ""
          }`;
    arr.push({ desc: label, pts });
    perTeamBreakdown.set(key, arr);
  }

  // 2) Apply to all leagues in that season
  const leagues = await db.league.findMany({
    where: { seasonYear: season },
    include: { teams: true },
  });

  for (const L of leagues) {
    for (const t of L.teams) {
      const points = perTeam.get(t.nflTeam) || 0;
      const breakdown = perTeamBreakdown.get(t.nflTeam) || [];
      await db.score.upsert({
        where: {
          leagueTeamId_season_week: {
            leagueTeamId: t.id,
            season,
            week,
          },
        },
        update: { points, breakdown },
        create: {
          leagueId: L.id,
          leagueTeamId: t.id,
          season,
          week,
          points,
          breakdown,
        },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    season,
    week,
    teamsComputed: Array.from(perTeam.entries()).map(([team, pts]) => ({
      team,
      pts,
    })),
  });
}
