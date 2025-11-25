import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request, ctx: { params: { leagueId: string } }) {
  const leagueId = ctx.params.leagueId;
  const { searchParams } = new URL(req.url);

  const seasonParam = searchParams.get("season");
  const weekParam = searchParams.get("week");

  const season = seasonParam ? Number(seasonParam) : 2025;

  if (!Number.isFinite(season)) {
    return NextResponse.json(
      { ok: false, error: "Invalid season" },
      { status: 400 }
    );
  }

  const league = await db.league.findUnique({
    where: { id: leagueId },
    include: { teams: { include: { owner: true } } },
  });
  if (!league) {
    return NextResponse.json(
      { ok: false, error: "League not found" },
      { status: 404 }
    );
  }

  // Find all weeks that have a Score for this league+season
  const allScoreWeeks = await db.score.findMany({
    where: { leagueId, season },
    select: { week: true },
    distinct: ["week"],
  });

  const availableWeeks = Array.from(
    new Set(allScoreWeeks.map((s) => s.week))
  ).sort((a, b) => a - b);

  const latestWeek =
    availableWeeks.length > 0
      ? availableWeeks[availableWeeks.length - 1]
      : null;

  let week: number;

  if (weekParam) {
    const parsed = Number(weekParam);
    week =
      Number.isFinite(parsed) && parsed > 0
        ? parsed
        : latestWeek ?? 1;
  } else {
    // If no week provided in URL, use latest week if we have scores
    week = latestWeek ?? 1;
  }

  // Scores for this league/team/season/week
  const scores = await db.score.findMany({
    where: { leagueId, season, week },
  });

  const scoreByTeamId = new Map<string, (typeof scores)[number]>();
  for (const s of scores) {
    scoreByTeamId.set(s.leagueTeamId, s);
  }

  // Map NFL team abbr -> full name
  const nflTeams = await db.nflTeam.findMany();
  const nameByAbbr = new Map<string, string>(
    nflTeams.map((t) => [t.abbr, t.name])
  );

  const rows = league.teams
    .map((t) => {
      const s = scoreByTeamId.get(t.id);
      return {
        leagueTeamId: t.id,
        nflTeam: t.nflTeam,
        nflTeamName: nameByAbbr.get(t.nflTeam) ?? t.nflTeam,
        owner: {
          name: t.owner?.name ?? null,
          email: t.owner?.email ?? "",
        },
        draftSlot: t.draftSlot,
        points: s?.points ?? 0,
        breakdown:
          (s?.breakdown as Array<{ desc: string; pts: number }> | undefined) ??
          [],
      };
    })
    .sort((a, b) => b.points - a.points);

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
    availableWeeks,
    rows,
  });
}
