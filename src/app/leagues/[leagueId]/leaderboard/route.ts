import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request, ctx: { params: { leagueId: string } }) {
  const leagueId = ctx.params.leagueId;
  const { searchParams } = new URL(req.url);
  const season = Number(searchParams.get("season") ?? 2025);
  const week = Number(searchParams.get("week") ?? 1);

  const league = await db.league.findUnique({
    where: { id: leagueId },
    include: { teams: { include: { owner: true } } },
  });
  if (!league) return NextResponse.json({ ok: false, error: "League not found" }, { status: 404 });

  const scores = await db.score.findMany({
    where: { leagueId, season, week },
    include: { leagueTeam: true },
  });

  const nflTeams = await db.nflTeam.findMany();
  const nameByAbbr = new Map(nflTeams.map(t => [t.abbr, t.name]));
  const scoreByTeamId = new Map(scores.map(s => [s.leagueTeamId, s]));

  const rows = league.teams.map(t => {
    const s = scoreByTeamId.get(t.id);
    return {
      leagueTeamId: t.id,
      nflTeam: t.nflTeam,
      nflTeamName: nameByAbbr.get(t.nflTeam) ?? t.nflTeam,
      owner: { name: t.owner?.name ?? null, email: t.owner?.email ?? "" },
      draftSlot: t.draftSlot,
      points: s?.points ?? 0,
      breakdown: (s?.breakdown as Array<{desc: string; pts: number}> | undefined) ?? [],
    };
  }).sort((a,b) => b.points - a.points);

  return NextResponse.json({
    ok: true,
    league: { id: league.id, name: league.name, seasonYear: league.seasonYear, maxTeams: league.maxTeams },
    season, week, rows
  });
}
