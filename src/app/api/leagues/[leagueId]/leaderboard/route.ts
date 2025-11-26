import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/leagues/:leagueId/leaderboard?season=2025&week=1
 * Returns standings for that league/week with per-play breakdown.
 */
export async function GET(
  req: Request,
  ctx: { params: { leagueId: string } }
) {
  try {
    const leagueId = ctx.params.leagueId;
    const { searchParams } = new URL(req.url);
    const season = Number(searchParams.get("season") ?? 2025);
    const week = Number(searchParams.get("week") ?? 1);

    // Load league + teams + owners
    const league = await db.league.findUnique({
      where: { id: leagueId },
      include: {
        teams: {
          include: { owner: true },
        },
      },
    });

    if (!league) {
      return NextResponse.json(
        { ok: false, error: "League not found" },
        { status: 404 }
      );
    }

    // Scores for this league/week
    const scores = await db.score.findMany({
      where: { leagueId, season, week },
      include: {
        leagueTeam: true,
      },
    });

    // NFL team full names (to display nicely)
    const nflTeams = await db.nflTeam.findMany();
    const nameByAbbr = new Map(nflTeams.map((t) => [t.abbr, t.name]));

    // Map LeagueTeamId -> score
    const scoreByTeamId = new Map(scores.map((s) => [s.leagueTeamId, s]));

    // Build leaderboard rows for *all* teams in the league,
    // showing 0 if there is no Score row yet.
    const rows = league.teams.map((t) => {
      const s = scoreByTeamId.get(t.id);
      const points = s?.points ?? 0;
      const breakdown =
        ((s?.breakdown as Array<{ desc: string; pts: number }>) ??
          []) as Array<{ desc: string; pts: number }>;

      return {
        leagueTeamId: t.id,
        nflTeam: t.nflTeam,
        nflTeamName: nameByAbbr.get(t.nflTeam) ?? t.nflTeam,
        owner: {
          name: t.owner?.name ?? null,
          email: t.owner?.email ?? "",
        },
        draftSlot: t.draftSlot,
        points,
        breakdown,
      };
    });

    // Sort by points desc
    rows.sort((a, b) => b.points - a.points);

    return NextResponse.json({
      ok: true,
      league: {
        id: league.id,
        name: league.name,
        seasonYear: league.seasonYear,
        maxTeams: league.maxTeams,
      },
      season,
      week,
      rows,
    });
  } catch (err: any) {
    console.error("Error in leaderboard route:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ??
          "Unexpected error while loading leaderboard. Check server logs.",
      },
      { status: 500 }
    );
  }
}
