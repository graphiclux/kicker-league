import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Play = {
  gameId: string;
  possession: string; // team abbr e.g. "BUF"
  playType: "field_goal" | "extra_point";
  result: "made" | "missed";
  distance?: number | null;
  // NOTE: we intentionally ignore "blocked" on insert to avoid schema mismatch
};

function normalize(p: Play) {
  return {
    gameId: String(p.gameId),
    possession: String(p.possession || "").toUpperCase(),
    playType: p.playType === "extra_point" ? "extra_point" : "field_goal",
    result: p.result === "made" ? "made" : "missed",
    distance:
      p.distance === undefined || p.distance === null || Number.isNaN(Number(p.distance))
        ? null
        : Number(p.distance),
  };
}

async function doImport(season: number, week: number, plays: Play[]) {
  // idempotent replace for the whole week
  await db.kickPlay.deleteMany({ where: { season, week } });

  if (!plays.length) return 0;

  // prepare rows and insert (skip fields that may not exist in your schema)
  const rows = plays.map(normalize).map((r) => ({
    season,
    week,
    gameId: r.gameId,
    possession: r.possession,
    playType: r.playType,
    result: r.result,
    distance: r.distance, // nullable OK
  }));

  // Insert in a single createMany. If you prefer batching, we can chunk into 200s.
  const res = await db.kickPlay.createMany({
    data: rows,
    skipDuplicates: true, // in case you add a unique constraint later
  });

  return res.count ?? rows.length;
}

// POST /api/admin/import-plays?season=2025&week=1
export async function POST(req: Request) {
  const url = new URL(req.url);
  const season = Number(url.searchParams.get("season") ?? 2025);
  const week = Number(url.searchParams.get("week") ?? 1);

  // Only enforced if ADMIN_KEY is set (you said you’re not using it now)
  const adminKey = req.headers.get("x-admin-key");
  if (process.env.ADMIN_KEY && adminKey !== process.env.ADMIN_KEY) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let plays: Play[] | undefined;
  try {
    const body = await req.json();
    plays = body?.plays;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(plays)) {
    return NextResponse.json({ ok: false, error: "Body must include plays: Play[]" }, { status: 400 });
  }

  try {
    const inserted = await doImport(season, week, plays);
    return NextResponse.json({ ok: true, season, week, inserted });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Prisma often includes helpful `.code` on the error; we can expose it if present
    const code = (err as any)?.code;
    return NextResponse.json({ ok: false, error: msg, code }, { status: 500 });
  }
}

// GET helper to verify route works and see current count
export async function GET(req: Request) {
  const url = new URL(req.url);
  const season = Number(url.searchParams.get("season") ?? 2025);
  const week = Number(url.searchParams.get("week") ?? 1);
  const count = await db.kickPlay.count({ where: { season, week } });
  return NextResponse.json({ ok: true, season, week, count });
}
