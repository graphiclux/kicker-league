import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/leagues
 * Body: { name: string, seasonYear: number, commissionerEmail: string, commissionerName?: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, seasonYear, commissionerEmail, commissionerName } = body || {};

    if (!name || !seasonYear || !commissionerEmail) {
      return NextResponse.json(
        { ok: false, error: "Missing name, seasonYear, or commissionerEmail" },
        { status: 400 }
      );
    }

    // Upsert commissioner user
    const user = await db.user.upsert({
      where: { email: commissionerEmail },
      update: { name: commissionerName ?? undefined },
      create: { email: commissionerEmail, name: commissionerName ?? null },
    });

    // Create league
    const league = await db.league.create({
      data: {
        name,
        seasonYear,
        commissionerId: user.id,
      },
      select: {
        id: true,
        name: true,
        seasonYear: true,
        commissionerId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, league });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/leagues
 * Optional query: ?season=2025
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const season = searchParams.get("season");
    const where = season ? { seasonYear: Number(season) } : {};
    const leagues = await db.league.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, seasonYear: true, commissionerId: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, leagues });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
