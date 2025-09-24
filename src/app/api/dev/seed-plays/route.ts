import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Inserts a few test plays for 2025 Week 1:
 *  BUF: FG missed 27y (+2), FG made 51y (-1) => net +1
 *  KC : XP missed (+3), FG missed 43y (+1)   => net +4
 */
export async function POST() {
  const season = 2025;
  const week = 1;

  // Clear any existing test data for a clean re-run
  await db.kickPlay.deleteMany({ where: { season, week } });

  await db.kickPlay.createMany({
    data: [
      // Bills
      { season, week, gameId: "BUF-W1", possession: "BUF", playType: "field_goal", distance: 27, result: "missed", blocked: false },
      { season, week, gameId: "BUF-W1", possession: "BUF", playType: "field_goal", distance: 51, result: "made",   blocked: false },

      // Chiefs
      { season, week, gameId: "KC-W1",  possession: "KC",  playType: "extra_point", result: "missed", blocked: false },
      { season, week, gameId: "KC-W1",  possession: "KC",  playType: "field_goal",  distance: 43, result: "missed", blocked: false },
    ],
  });

  return NextResponse.json({ inserted: true, season, week });
}
