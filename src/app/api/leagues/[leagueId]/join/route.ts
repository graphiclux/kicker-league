import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  // Very light shape check – you can swap this for a real validator if you want
  if (!trimmed.includes("@") || !trimmed.includes(".")) return null;
  return trimmed;
}

// POST /api/leagues/:leagueId/join
// Body: { email: string, name?: string, nflTeam: string, draftSlot?: number }
export async function POST(
  req: Request,
  ctx: { params: { leagueId: string } }
) {
  try {
    const leagueId = ctx.params.leagueId;
    const body = await req.json().catch(() => ({}));
    const rawEmail = body?.email;
    const rawName = body?.name;
    const rawNflTeam = body?.nflTeam;
    const rawDraftSlot = body?.draftSlot;

    const email = normalizeEmail(rawEmail);
    const name =
      typeof rawName === "string" && rawName.trim().length > 0
        ? rawName.trim()
        : null;

    if (!email || !rawNflTeam) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid email or nflTeam" },
        { status: 400 }
      );
    }

    const league = await db.league.findUnique({ where: { id: leagueId } });
    if (!league) {
      return NextResponse.json(
        { ok: false, error: "League not found" },
        { status: 404 }
      );
    }

    // Optional: if you later add a boolean to control public join
    // if (!league.publicJoinEnabled) {
    //   return NextResponse.json(
    //     { ok: false, error: "This league is not accepting public joins" },
    //     { status: 403 }
    //   );
    // }

    // Normalize team code
    const team = String(rawNflTeam).toUpperCase().trim();

    // Validate team exists
    const validTeam = await db.nflTeam.findUnique({ where: { abbr: team } });
    if (!validTeam) {
      return NextResponse.json(
        { ok: false, error: `Invalid NFL team: ${team}` },
        { status: 400 }
      );
    }

    // Enforce max teams
    const currentCount = await db.leagueTeam.count({ where: { leagueId } });
    if (currentCount >= league.maxTeams) {
      return NextResponse.json(
        { ok: false, error: "League is full" },
        { status: 409 }
      );
    }

    // Upsert user (keyed by email)
    const user = await db.user.upsert({
      where: { email },
      update: { name: name ?? undefined },
      create: { email, name },
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

    // Determine and clamp draft slot if provided
    let slot: number;
    if (typeof rawDraftSlot === "number" && Number.isInteger(rawDraftSlot)) {
      const minSlot = 1;
      const maxSlot = league.maxTeams;
      slot = Math.min(Math.max(rawDraftSlot, minSlot), maxSlot);
    } else {
      slot = currentCount + 1;
    }

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
        leagueId: true,
        nflTeam: true,
        draftSlot: true,
        owner: { select: { email: true, name: true, id: true } },
      },
    });

    return NextResponse.json({ ok: true, leagueTeam });
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    if (msg.includes("Unique constraint") || msg.includes("P2002")) {
      return NextResponse.json(
        { ok: false, error: "Conflict: team or owner already in league" },
        { status: 409 }
      );
    }
    console.error("[Join League] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
