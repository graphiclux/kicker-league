// src/app/api/leagues/[leagueId]/team/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session-user";

export async function POST(
  req: NextRequest,
  ctx: { params: { leagueId: string } }
) {
  const { userId } = await requireUserId();
  const leagueId = ctx.params.leagueId;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const nflTeamRaw = String(body?.nflTeam ?? "").trim().toUpperCase();
  const teamNameRaw = String(body?.teamName ?? "").trim();

  if (!nflTeamRaw) {
    return NextResponse.json(
      { error: "nflTeam is required" },
      { status: 400 }
    );
  }

  // Make sure league exists and user is at least a member or commish
  const league = await db.league.findFirst({
    where: {
      id: leagueId,
      OR: [
        { commissionerId: userId },
        { members: { some: { id: userId } } },
      ],
    },
    include: {
      teams: true,
    },
  });

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  // See if user already has a team
  const existing = await db.leagueTeam.findFirst({
    where: {
      leagueId,
      ownerId: userId,
    },
  });

  const draftSlot =
    existing?.draftSlot ?? (league.teams.length > 0
      ? league.teams.length + 1
      : 1);

  const team = existing
    ? await db.leagueTeam.update({
        where: { id: existing.id },
        data: {
          nflTeam: nflTeamRaw,
          teamName: teamNameRaw || null,
          draftSlot,
        },
      })
    : await db.leagueTeam.create({
        data: {
          leagueId,
          ownerId: userId,
          nflTeam: nflTeamRaw,
          draftSlot,
          teamName: teamNameRaw || null,
        },
      });

  return NextResponse.json({ ok: true, team });
}
