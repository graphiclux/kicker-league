import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/leagues
 * Body: { name: string, seasonYear: number }
 * Creates a league where the current user is the commissioner and a member.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, seasonYear } = body || {};

  if (!name || !seasonYear) {
    return NextResponse.json(
      { ok: false, error: "Missing name or seasonYear" },
      { status: 400 }
    );
  }

  try {
    const league = await db.league.create({
      data: {
        name,
        seasonYear: Number(seasonYear),
        commissioner: { connect: { id: userId } },
        members: { connect: { id: userId } },
      },
    });

    return NextResponse.json({ ok: true, league });
  } catch (err: any) {
    console.error("Create league error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to create league" },
      { status: 500 }
    );
  }
}
