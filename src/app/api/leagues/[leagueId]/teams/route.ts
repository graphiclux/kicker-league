import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/leagues/:leagueId/teams
export async function GET(
  _req: Request,
  ctx: { params: { leagueId: string } }
) {
  const leagueId = ctx.params.leagueId;

  const league = await db.league.findUnique({
    where: { id: leagueId },
    select: { id: true, name: true, seasonYear: true, maxTeams: true },
  });

  if (!league) {
    return NextResponse.json({ ok: false, error: "League not found" }, { status: 404 });
  }

  const teams = await db.leagueTeam.findMany({
    where: { leagueId },
    orderBy: { draftSlot: "asc" },
    select: {
      id: true,
      nflTeam: true,
      draftSlot: true,
      owner: { select: { email: true, name: true } },
    },
  });

  return NextResponse.json({ ok: true, league, teams });
}
