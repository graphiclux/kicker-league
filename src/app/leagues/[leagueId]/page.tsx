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
  latestWeek?: number | null;
  availableWeeks?: number[];
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
        <main className="min-h-screen bg-[#faf8f4] text-slate-900 flex items-center justify-center">
          <p className="text-xs text-slate-500">Loading league…</p>
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

  const initialSeason = Number(searchParams.get("season") ?? 2025);
  const initialWeekParam = searchParams.get("week");

  const [season, setSeason] = useState<number>(initialSeason);
  const [week, setWeek] = useState<number | undefined>(
    initialWeekParam ? Number(initialWeekParam) : undefined
  );
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [appliedDefaultWeek, setAppliedDefaultWeek] = useState(false);

  const url = useMemo(() => {
    const q = new URLSearchParams();
    q.set("season", String(season));
    if (week != null && Number.isFinite(week)) {
      q.set("week", String(week));
    }
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

  // If no week was specified in the URL, adopt the API's chosen week (latestWeek),
  // but only do this once to avoid infinite loops.
  useEffect(() => {
    if (!appliedDefaultWeek && week == null && data?.week != null) {
      setWeek(data.week);
      setAppliedDefaultWeek(true);
    }
  }, [appliedDefaultWeek, week, data?.week]);

  const leagueName = data?.league?.name ?? "League";
  const availableWeeks = data?.availableWeeks ?? [];
  const effectiveWeek = week ?? data?.week;

  const showRows = data?.ok && (data.rows?.length ?? 0) > 0;

  return (
    <main className="min-h-screen bg-[#faf8f4] text-slate-900">
      <header className="border-b border-slate-200 bg-[#faf8f4]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              {leagueName}
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              Season {season}
              {effectiveWeek ? ` • Week ${effectiveWeek}` : null}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-800">
              Weekly leaderboard
            </h2>
            <p className="text-xs text-slate-500">
              See how each kicker team scored for a given week.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs sm:text-sm flex items-center gap-1.5">
              <span className="text-slate-500">Season</span>
              <input
                className="border border-slate-300 bg-white rounded px-2 py-1 w-24 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                type="number"
                value={season}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSeason(val);
                  // reset week so API can choose appropriate latest week when season changes
                  setWeek(undefined);
                  setAppliedDefaultWeek(false);
                }}
              />
            </label>

            <label className="text-xs sm:text-sm flex items-center gap-1.5">
              <span className="text-slate-500">Week</span>
              {availableWeeks.length > 0 ? (
                <select
                  className="border border-slate-300 bg-white rounded px-2 py-1 w-28 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                  value={effectiveWeek ?? ""}
                  onChange={(e) => setWeek(Number(e.target.value))}
                >
                  {availableWeeks.map((w) => (
                    <option key={w} value={w}>
                      Week {w}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="border border-slate-200 bg-slate-50 rounded px-2 py-1 w-24 text-sm text-slate-400"
                  value={effectiveWeek ?? ""}
                  disabled
                  placeholder="No scores yet"
                />
              )}
            </label>

            <button
              onClick={load}
              className="inline-flex items-center rounded-full bg-slate-900 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Error state */}
        {!data?.ok && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {data?.error ?? "Failed to load leaderboard"}
          </div>
        )}

        {/* Empty state */}
        {data?.ok && (data.rows?.length ?? 0) === 0 && (
          <div className="rounded-xl border border-yellow-100 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
            No scores found for this week yet. Once kicks are imported and
            scored, they’ll appear here.
          </div>
        )}

        {/* Leaderboard rows */}
        {showRows && (
          <div className="space-y-3">
            {data!.rows!.map((r, i) => (
              <div
                key={r.leagueTeamId}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lime-100 text-xs font-semibold text-lime-900">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-semibold text-slate-900">
                        {r.nflTeam} — {r.nflTeamName}
                      </div>
                      <div className="text-xs text-slate-500">
                        Owner: {r.owner.name ?? r.owner.email} • Draft #
                        {r.draftSlot}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                      Total Points
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-lime-600">
                      {r.points}
                    </div>
                  </div>
                </div>

                {r.breakdown.length > 0 ? (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <div className="text-xs font-semibold text-slate-600 mb-2">
                      Play breakdown
                    </div>
                    <ul className="space-y-1 text-xs text-slate-700">
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
                  <div className="mt-3 text-xs text-slate-400">
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
