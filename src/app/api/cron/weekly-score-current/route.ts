// src/app/api/cron/weekly-score-current/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cronAuth";
import { GET as runWeeklyScore } from "../weekly-score/route";

/**
 * Return { season, week } for the current NFL week.
 * For now this is hard-coded for the 2025 season:
 * - Season starts Sept 1, 2025
 * - Weeks are 7-day blocks from that date
 * - Clamped between 1 and 18
 *
 * You can tweak SEASON_START_UTC and regularSeasonWeeks as needed.
 */
function getCurrentSeasonWeek(now: Date = new Date()): { season: number; week: number } | null {
  const season = 2025;

  // Season start in UTC – adjust if you want exact Thursday of Week 1.
  const SEASON_START_UTC = new Date("2025-09-01T00:00:00Z");

  if (now.getTime() < SEASON_START_UTC.getTime()) {
    return null; // season hasn't started yet
  }

  const diffMs = now.getTime() - SEASON_START_UTC.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const regularSeasonWeeks = 18;
  let week = Math.floor(diffDays / 7) + 1;

  if (week < 1) week = 1;
  if (week > regularSeasonWeeks) week = regularSeasonWeeks; // clamp for now

  return { season, week };
}

export async function GET(req: Request) {
  // Reuse the same cron secret protection
  if (!isCronAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const now = new Date();
  const info = getCurrentSeasonWeek(now);

  if (!info) {
    return NextResponse.json(
      {
        ok: false,
        error: "Season has not started yet for auto-detect",
        now: now.toISOString(),
      },
      { status: 400 }
    );
  }

  const origUrl = new URL(req.url);
  const token = origUrl.searchParams.get("token") ?? undefined;

  // Build a URL for the existing /api/cron/weekly-score endpoint
  const base = `${origUrl.origin}/api/cron/weekly-score`;
  const outUrl = new URL(base);

  outUrl.searchParams.set("season", info.season.toString());
  outUrl.searchParams.set("week", info.week.toString());
  if (token) {
    outUrl.searchParams.set("token", token);
  }

  // Pass through method + headers; body is unused for GET.
  const nextReq = new Request(outUrl.toString(), {
    method: req.method,
    headers: req.headers,
  });

  // Delegate to the existing weekly-score logic
  const result = await runWeeklyScore(nextReq);

  // Optionally enrich the JSON response so you can see which week was used
  // without changing the existing handler. We'll try to wrap if it's JSON.
  try {
    const cloned = result.clone();
    const data = await cloned.json();
    return NextResponse.json({
      ...data,
      autoDetected: {
        season: info.season,
        week: info.week,
        now: now.toISOString(),
      },
    });
  } catch {
    // If it's not JSON, just return the original response
    return result;
  }
}
