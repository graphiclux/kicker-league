import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session-user";

/**
 * GET /api/leagues/:leagueId/leaderboard?season=2025&week=1
 * - Season standings: total points per team across all weeks
 * - Weekly leaderboard: points for the selected week
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

    // Current user (for currentUserTeamId)
    // This will require the caller to be authenticated; matches your (app) group usage.
    let userId: string | null = null;
    try {
      const sessionUser = await requireUserId();
      userId = sessionUser.userId;
    } catch {
      // If this endpoint is ever hit unauthenticated, we just won't have currentUserTeamId
      userId = null;
    }

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

    const teams = league.teams;

    // Figure out which team (if any) belongs to the current user
    const currentUserTeamId =
      userId != null
        ? teams.find((t) => t.ownerId === userId)?.id ?? null
        : null;

    // All scores for this league + season (for season-long totals + available weeks)
    const allSeasonScores = await db.score.findMany({
      where: { leagueId, season },
    });

    // Scores for this specific week
    const scoresThisWeek = await db.score.findMany({
      where: { leagueId, season, week },
      include: {
        leagueTeam: true,
      },
    });

    // NFL team full names (nice display)
    const nflTeams = await db.nflTeam.findMany();
    const nameByAbbr = new Map(nflTeams.map((t) => [t.abbr, t.name]));

    // ---- Season totals (sum across all weeks) ----
    const sumByTeamId = new Map<string, number>();
    for (const s of allSeasonScores) {
      const prev = sumByTeamId.get(s.leagueTeamId) ?? 0;
      sumByTeamId.set(s.leagueTeamId, prev + (s.points ?? 0));
    }

    const seasonTotals = teams.map((t) => {
      const totalPoints = sumByTeamId.get(t.id) ?? 0;
      return {
        leagueTeamId: t.id,
        nflTeam: t.nflTeam,
        nflTeamName: nameByAbbr.get(t.nflTeam) ?? t.nflTeam,
        teamName: t.teamName ?? null,
        owner: {
          name: t.owner?.name ?? null,
          email: t.owner?.email ?? "",
        },
        draftSlot: t.draftSlot,
        totalPoints,
      };
    });

    // Sort season standings by total points desc
    seasonTotals.sort((a, b) => b.totalPoints - a.totalPoints);

    // ---- Weekly rows (current week) ----
    const scoreByTeamId = new Map(
      scoresThisWeek.map((s) => [s.leagueTeamId, s])
    );

    const rows = teams.map((t) => {
      const s = scoreByTeamId.get(t.id);
      const points = s?.points ?? 0;
      const breakdown =
        ((s?.breakdown as Array<{ desc: string; pts: number }>) ??
          []) as Array<{ desc: string; pts: number }>;

      return {
        leagueTeamId: t.id,
        nflTeam: t.nflTeam,
        nflTeamName: nameByAbbr.get(t.nflTeam) ?? t.nflTeam,
        teamName: t.teamName ?? null,
        owner: {
          name: t.owner?.name ?? null,
          email: t.owner?.email ?? "",
        },
        draftSlot: t.draftSlot,
        points,
        breakdown,
      };
    });

    // Sort weekly leaderboard by points desc
    rows.sort((a, b) => b.points - a.points);

    // Available weeks / latest week from allSeasonScores
    const weeks = Array.from(
      new Set(allSeasonScores.map((s) => s.week).filter((w) => w != null))
    ) as number[];

    weeks.sort((a, b) => a - b);

    const latestWeek = weeks.length > 0 ? weeks[weeks.length - 1] : null;

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
      latestWeek,
      availableWeeks: weeks,
      seasonTotals,
      rows,
      currentUserTeamId,
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
