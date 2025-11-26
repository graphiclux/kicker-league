import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session-user";

/**
 * POST /api/leagues/:leagueId/claim-team
 * Body: { teamName: string, nflTeam?: string }
 *
 * - Ensures the user is in the league (via requireUserId + membership enforced elsewhere)
 * - Ensures the user doesn't already have a team in this league
 * - Either:
 *   - uses a requested nflTeam if it's not already claimed
 *   - OR auto-assigns the next available nflTeam slot
 * - Sets draftSlot to the next integer after existing teams
 */
export async function POST(
  req: NextRequest,
  ctx: { params: { leagueId: string } }
) {
  const { userId } = await requireUserId();
  const leagueId = ctx.params.leagueId;

  const body = await req.json().catch(() => ({} as any));
  const teamNameRaw =
    typeof body.teamName === "string" ? body.teamName.trim() : "";
  const requestedNflTeam =
    typeof body.nflTeam === "string" ? body.nflTeam.trim().toUpperCase() : "";

  if (!teamNameRaw) {
    return NextResponse.json(
      { ok: false, error: "Team name is required." },
      { status: 400 }
    );
  }

  if (teamNameRaw.length > 50) {
    return NextResponse.json(
      { ok: false, error: "Team name must be 50 characters or fewer." },
      { status: 400 }
    );
  }

  // Load league + existing teams
  const league = await db.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: true,
    },
  });

  if (!league) {
    return NextResponse.json(
      { ok: false, error: "League not found." },
      { status: 404 }
    );
  }

  // Check if user already has a team
  const existingForUser = league.teams.find((t) => t.ownerId === userId);
  if (existingForUser) {
    return NextResponse.json(
      { ok: false, error: "You already have a team in this league." },
      { status: 400 }
    );
  }

  // Enforce maxTeams
  if (league.teams.length >= league.maxTeams) {
    return NextResponse.json(
      { ok: false, error: "This league is full. No more team slots available." },
      { status: 409 }
    );
  }

  // Determine which NFL team to assign
  const usedNflTeams = new Set(league.teams.map((t) => t.nflTeam));

  let chosenNflTeam: string | null = null;

  if (requestedNflTeam && !usedNflTeams.has(requestedNflTeam)) {
    chosenNflTeam = requestedNflTeam;
  } else {
    // Auto-pick from all NFL teams
    const allNflTeams = await db.nflTeam.findMany();
    const firstAvailable = allNflTeams.find((t) => !usedNflTeams.has(t.abbr));
    if (!firstAvailable) {
      return NextResponse.json(
        {
          ok: false,
          error: "No available NFL team slots left to assign in this league.",
        },
        { status: 409 }
      );
    }
    chosenNflTeam = firstAvailable.abbr;
  }

  // Extra safety + TS narrowing
  if (!chosenNflTeam) {
    return NextResponse.json(
      {
        ok: false,
        error: "Could not determine an NFL team to assign.",
      },
      { status: 500 }
    );
  }

  // Next draftSlot
  const maxSlot =
    league.teams.reduce((max, t) => Math.max(max, t.draftSlot), 0) || 0;
  const nextDraftSlot = maxSlot + 1;

  const team = await db.leagueTeam.create({
    data: {
      leagueId,
      ownerId: userId,
      nflTeam: chosenNflTeam, // now narrowed to string
      draftSlot: nextDraftSlot,
      teamName: teamNameRaw,
    },
  });

  return NextResponse.json({ ok: true, team });
}
