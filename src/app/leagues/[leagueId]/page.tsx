"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Row = {
  leagueTeamId: string;
  nflTeam: string;
  nflTeamName: string;
  owner: { name: string | null; email: string };
  draftSlot: number;
  points: number;
  breakdown: { desc: string; pts: number }[];
};

type LeaderboardResponse = {
  ok: boolean;
  league?: { id: string; name: string; seasonYear: number; maxTeams: number };
  season?: number;
  week?: number;
  rows?: Row[];
  error?: string;
};

export const dynamic = "force-dynamic";

export default function LeaguePageWrapper({
  params,
}: {
  params: { leagueId: string };
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
          <p className="text-xs text-slate-400">Loading league…</p>
        </main>
      }
    >
      <LeaguePageInner params={params} />
    </Suspense>
  );
}

function LeaguePageInner({ params }: { params: { leagueId: string } }) {
  const searchParams = useSearchParams();
  const leagueId = params.leagueId;

  const [season, setSeason] = useState<number>(
    Number(searchParams.get("season") ?? 2025)
  );
  const [week, setWeek] = useState<number>(
    Number(searchParams.get("week") ?? 1)
  );
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const url = useMemo(() => {
    const q = new URLSearchParams({
      season: String(season),
      week: String(week),
    });
    // NOTE: we call the app route at /leagues/[leagueId]/leaderboard
    return `/leagues/${leagueId}/leaderboard?` + q.toString();
  }, [leagueId, season, week]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json()) as LeaderboardResponse;
      setData(json);
    } catch (e: any) {
      setData({ ok: false, error: e?.message ?? "Failed to load" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const leagueName = data?.league?.name ?? "League";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {leagueName} — Leaderboard
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Season {season} • Week {week}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs sm:text-sm flex items-center gap-1.5">
              <span className="text-slate-400">Season</span>
              <input
                className="border border-slate-700 bg-slate-900 rounded px-2 py-1 w-24 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                type="number"
                value={season}
                onChange={(e) => setSeason(Number(e.target.value))}
              />
            </label>
            <label className="text-xs sm:text-sm flex items-center gap-1.5">
              <span className="text-slate-400">Week</span>
              <input
                className="border border-slate-700 bg-slate-900 rounded px-2 py-1 w-20 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                type="number"
                min={1}
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
              />
            </label>
            <button
              onClick={load}
              className="inline-flex items-center rounded-lg bg-lime-500 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-lime-400 transition-colors"
              disabled={loading}
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Error state */}
        {!data?.ok && (
          <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {data?.error ?? "Failed to load leaderboard"}
          </div>
        )}

        {/* Empty state */}
        {data?.ok && (data.rows?.length ?? 0) === 0 && (
          <div className="rounded-lg border border-yellow-900/50 bg-yellow-950/30 px-3 py-2 text-sm text-yellow-100">
            No scores found for this week yet. Once kicks are imported and
            scored, they’ll appear here.
          </div>
        )}

        {/* Leaderboard rows */}
        {data?.ok && (data.rows?.length ?? 0) > 0 && (
          <div className="space-y-3">
            {data.rows!.map((r, i) => (
              <div
                key={r.leagueTeamId}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-100">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-50">
                        {r.nflTeam} — {r.nflTeamName}
                      </div>
                      <div className="text-xs text-slate-400">
                        Owner: {r.owner.name ?? r.owner.email} • Draft #
                        {r.draftSlot}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Total Points
                    </div>
                    <div className="text-2xl font-bold text-lime-400">
                      {r.points}
                    </div>
                  </div>
                </div>

                {r.breakdown.length > 0 ? (
                  <div className="mt-3 border-t border-slate-800 pt-3">
                    <div className="text-xs font-semibold text-slate-300 mb-2">
                      Play breakdown
                    </div>
                    <ul className="space-y-1 text-xs text-slate-200">
                      {r.breakdown.map((b, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between"
                        >
                          <span>{b.desc}</span>
                          <span className="font-semibold">
                            {b.pts > 0 ? `+${b.pts}` : b.pts}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-slate-500">
                    No qualifying plays this week.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
