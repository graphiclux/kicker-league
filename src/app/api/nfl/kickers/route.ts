// src/app/api/nfl/kickers/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SleeperPlayer = {
  player_id: string;
  full_name: string;
  position: string;
  team: string | null;
  active?: boolean;
  depth_chart_order?: number;
  depth_chart_position?: string | null;
  injury_status?: string | null;
  injury_notes?: string | null;
};

export type KickerInfo = {
  playerId: string;
  name: string;
  team: string;
  injuryStatus: string | null;
  injuryNotes: string | null;
};

/**
 * Helper to choose the "current" kicker for a team from a list
 * of K-position players on that team.
 */
function pickTeamKicker(players: SleeperPlayer[]): KickerInfo | null {
  if (!players.length) return null;

  // Prefer:
  //  - depth_chart_position "K"
  //  - active players
  //  - lowest depth_chart_order
  const sorted = [...players].sort((a, b) => {
    const aIsK = a.depth_chart_position === "K" ? 0 : 1;
    const bIsK = b.depth_chart_position === "K" ? 0 : 1;

    const aActive = a.active ? 0 : 1;
    const bActive = b.active ? 0 : 1;

    const aOrder = a.depth_chart_order ?? 999;
    const bOrder = b.depth_chart_order ?? 999;

    if (aIsK !== bIsK) return aIsK - bIsK;
    if (aActive !== bActive) return aActive - bActive;
    if (aOrder !== bOrder) return aOrder - bOrder;

    return (a.full_name || "").localeCompare(b.full_name || "");
  });

  const p = sorted[0];
  if (!p.team) return null;

  return {
    playerId: p.player_id,
    name: p.full_name || `${p.team} kicker`,
    team: p.team,
    injuryStatus: p.injury_status ?? null,
    injuryNotes: p.injury_notes ?? null,
  };
}

export async function GET() {
  try {
    const sleeperRes = await fetch(
      "https://api.sleeper.app/v1/players/nfl",
      {
        // Cache on the edge for 30 minutes
        next: { revalidate: 1800 },
      }
    );

    if (!sleeperRes.ok) {
      return NextResponse.json(
        { ok: false, error: "Failed to fetch Sleeper players" },
        { status: 502 }
      );
    }

    const json = (await sleeperRes.json()) as Record<
      string,
      SleeperPlayer
    >;

    const allPlayers = Object.values(json);

    const kickers = allPlayers.filter(
      (p) => p.position === "K" && p.team
    );

    const byTeam = new Map<string, SleeperPlayer[]>();
    for (const p of kickers) {
      if (!p.team) continue;
      const list = byTeam.get(p.team) ?? [];
      list.push(p);
      byTeam.set(p.team, list);
    }

    const result: Record<string, KickerInfo> = {};

    for (const [team, players] of byTeam.entries()) {
      const chosen = pickTeamKicker(players);
      if (chosen) {
        result[team] = chosen;
      }
    }

    return NextResponse.json({
      ok: true,
      source: "sleeper",
      updatedAt: new Date().toISOString(),
      kickers: result,
    });
  } catch (err: any) {
    console.error("Error in /api/nfl/kickers:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
