import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/leagues/:leagueId/join
// Body: { email: string, name?: string, nflTeam: string, draftSlot?: number }
export async function POST(
  req: Request,
  ctx: { params: { leagueId: string } }
) {
  try {
    const leagueId = ctx.params.leagueId;
    const { email, name, nflTeam, draftSlot } = await req.json();

    if (!email || !nflTeam) {
      return NextResponse.json({ ok: false, error: "Missing email or nflTeam" }, { status: 400 });
    }

    const league = await db.league.findUnique({ where: { id: leagueId } });
    if (!league) {
      return NextResponse.json({ ok: false, error: "League not found" }, { status: 404 });
    }

    // Normalize team code
    const team = String(nflTeam).toUpperCase().trim();

    // Validate team exists
    const validTeam = await db.nflTeam.findUnique({ where: { abbr: team } });
    if (!validTeam) {
      return NextResponse.json({ ok: false, error: `Invalid NFL team: ${team}` }, { status: 400 });
    }

    // Enforce max teams
    const currentCount = await db.leagueTeam.count({ where: { leagueId } });
    if (currentCount >= league.maxTeams) {
      return NextResponse.json({ ok: false, error: "League is full" }, { status: 409 });
    }

    // Upsert user
    const user = await db.user.upsert({
      where: { email },
      update: { name: name ?? undefined },
      create: { email, name: name ?? null },
    });

    // Check if this user already has a team in this league
    const alreadyOwner = await db.leagueTeam.findFirst({
      where: { leagueId, ownerId: user.id },
      select: { id: true, nflTeam: true },
    });
    if (alreadyOwner) {
      return NextResponse.json(
        { ok: false, error: "User already owns a team in this league" },
        { status: 409 }
      );
    }

    // Check if team already taken
    const alreadyTaken = await db.leagueTeam.findFirst({
      where: { leagueId, nflTeam: team },
      select: { id: true },
    });
    if (alreadyTaken) {
      return NextResponse.json(
        { ok: false, error: `Team ${team} is already taken` },
        { status: 409 }
      );
    }

    // Determine draft slot if not provided
    const slot = draftSlot ?? currentCount + 1;

    // Create league team
    const leagueTeam = await db.leagueTeam.create({
      data: {
        leagueId,
        nflTeam: team,
        ownerId: user.id,
        draftSlot: slot,
      },
      select: {
        id: true,
        nflTeam: true,
        draftSlot: true,
        owner: { select: { email: true, name: true, id: true } },
      },
    });

    return NextResponse.json({ ok: true, leagueTeam });
  } catch (err: any) {
    // Handle unique constraint collisions gracefully
    const msg = String(err?.message ?? err);
    if (msg.includes("Unique constraint") || msg.includes("P2002")) {
      return NextResponse.json({ ok: false, error: "Conflict: team or owner already in league" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
