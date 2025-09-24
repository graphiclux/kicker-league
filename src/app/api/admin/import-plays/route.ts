import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Play = {
  gameId: string;
  possession: string;
  playType: "field_goal" | "extra_point";
  result: "made" | "missed";
  distance?: number | null;
  blocked?: boolean | null;
};

async function doImport(season: number, week: number, plays: Play[]) {
  // idempotent: wipe and re-insert week
  await db.kickPlay.deleteMany({ where: { season, week } });
  if (plays.length) {
    await db.kickPlay.createMany({
      data: plays.map(p => ({
        season,
        week,
        gameId: p.gameId,
        possession: p.possession.toUpperCase(),
        playType: p.playType,
        result: p.result,
        distance: p.distance ?? null,
        blocked: !!p.blocked,
      })),
    });
  }
}

// POST /api/admin/import-plays?season=2025&week=1
export async function POST(req: Request) {
  const url = new URL(req.url);
  const season = Number(url.searchParams.get("season") ?? 2025);
  const week = Number(url.searchParams.get("week") ?? 1);

  // Only enforced if ADMIN_KEY is set in env
  const adminKey = req.headers.get("x-admin-key");
  if (process.env.ADMIN_KEY && adminKey !== process.env.ADMIN_KEY) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const plays = (body as any)?.plays as Play[] | undefined;
  if (!Array.isArray(plays)) {
    return NextResponse.json({ ok: false, error: "Body must include plays: Play[]" }, { status: 400 });
  }

  await doImport(season, week, plays);
  return NextResponse.json({ ok: true, season, week, inserted: plays.length });
}

// GET helper so you can verify the route is live
export async function GET(req: Request) {
  const url = new URL(req.url);
  const season = Number(url.searchParams.get("season") ?? 2025);
  const week = Number(url.searchParams.get("week") ?? 1);
  const count = await db.kickPlay.count({ where: { season, week } });
  return NextResponse.json({
    ok: true,
    season,
    week,
    count,
    note: "POST plays to this same URL to (re)import for the week.",
  });
}
