"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

// Local type for kicker info as used in this component
type LocalKickerInfo = {
  name?: string | null;
  headshot?: string | null;
  team?: string | null;
  position?: string | null;
  bye_week?: number | null;
  latest_news?: {
    injury_status?: string | null;
  } | null;
};

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

type KickersResponse = {
  ok: boolean;
  source?: string;
  updatedAt?: string;
  kickers?: Record<string, LocalKickerInfo>;
  error?: string;
};

export const dynamic = "force-dynamic";

/**
 * Map injury_status -> label + severity
 */
function interpretInjuryStatus(status: string | null | undefined) {
  if (!status) return { label: "Healthy", level: "ok" as const };

  const normalized = status.toUpperCase();

  if (["OUT", "O", "IR", "PUP", "SUS"].includes(normalized)) {
    return { label: normalized, level: "bad" as const };
  }

  if (["DOUBTFUL", "D"].includes(normalized)) {
    return { label: normalized, level: "bad" as const };
  }

  if (["QUESTIONABLE", "Q"].includes(normalized)) {
    return { label: normalized, level: "warn" as const };
  }

  if (["PROBABLE", "P"].includes(normalized)) {
    return { label: normalized, level: "ok" as const };
  }

  // catch-all unknown
  return { label: normalized, level: "warn" as const };
}

/**
 * Which weeks we show in the dropdown – limited to 1–18
 */
const WEEK_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 1);

/**
 * Simple kicker initials for avatar.
 */
function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export default function LeaguePageWrapper({
  params,
}: {
  params: { leagueId: string };
}) {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center py-10">
          <p className="text-xs text-slate-500">Loading league…</p>
        </div>
      }
    >
      <LeaguePageInner params={params} />
    </Suspense>
  );
}

function LeaguePageInner({ params }: { params: { leagueId: string } }) {
  const searchParams = useSearchParams();
  const leagueId = params.leagueId;

  const initialSeason = useMemo(() => {
    const fromUrl = searchParams.get("season");
    if (fromUrl && !Number.isNaN(Number(fromUrl))) {
      return Number(fromUrl);
    }
    return undefined;
  }, [searchParams]);

  const initialWeek = useMemo(() => {
    const fromUrl = searchParams.get("week");
    if (fromUrl && !Number.isNaN(Number(fromUrl))) {
      return Number(fromUrl);
    }
    return undefined;
  }, [searchParams]);

  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [season, setSeason] = useState<number | undefined>(initialSeason);
  const [week, setWeek] = useState<number | undefined>(initialWeek);
  const [loading, setLoading] = useState(false);
  const [appliedDefaultWeek, setAppliedDefaultWeek] = useState(false);

  const [kickers, setKickers] = useState<Record<string, LocalKickerInfo>>({});
  const [kickersLoaded, setKickersLoaded] = useState(false);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (season) params.set("season", String(season));
    if (week) params.set("week", String(week));
    // MUST match: src/app/api/leagues/[leagueId]/leaderboard/route.ts
    return `/api/leagues/${leagueId}/leaderboard?${params.toString()}`;
  }, [leagueId, season, week]);

  async function loadLeaderboard() {
    setLoading(true);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const contentType = res.headers.get("content-type") || "";

      // If not JSON at all (HTML error page, redirect, etc.)
      if (!contentType.includes("application/json")) {
        const text = await res.text().catch(() => "");
        console.error(
          "Leaderboard API non-JSON response:",
          res.status,
          text.slice(0, 200)
        );
        setData({
          ok: false,
          error:
            res.status === 404
              ? "Leaderboard API not found. Check the route path."
              : "Leaderboard API returned a non-JSON response.",
        });
        return;
      }

      const json = (await res.json()) as LeaderboardResponse;

      // If the API itself reports an error (ok: false)
      if (!res.ok || !json.ok) {
        console.error(
          "Leaderboard API error payload:",
          res.status,
          json.error
        );
        setData({
          ok: false,
          error:
            json.error ??
            (res.status === 404
              ? "Leaderboard API not found. Check the route path."
              : `Leaderboard API error (status ${res.status}).`),
        });
        return;
      }

      // Happy path – valid data
      setData(json);

      if (!week && json.latestWeek && !appliedDefaultWeek) {
        setWeek(json.latestWeek);
        setAppliedDefaultWeek(true);
      }

      if (!season && json.season) {
        setSeason(json.season);
      }
    } catch (e: any) {
      console.error("Failed to load leaderboard:", e);
      setData({ ok: false, error: e?.message ?? "Failed to load" });
    } finally {
      setLoading(false);
    }
  }

  async function loadKickers() {
    try {
      const res = await fetch("/api/nfl/kickers", {
        cache: "no-store",
      });
      const json = (await res.json()) as KickersResponse;
      if (json.ok && json.kickers) {
        setKickers(json.kickers);
      }
    } catch (e) {
      console.error("Failed to load kickers", e);
    } finally {
      setKickersLoaded(true);
    }
  }

  useEffect(() => {
    loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    loadKickers();
  }, []);

  const rows = data?.rows ?? [];
  const showRows = data?.ok && rows.length > 0;

  const availableWeeks = useMemo(() => {
    const weeksFromData = data?.availableWeeks ?? [];
    if (
      weeksFromData.length === 0 ||
      weeksFromData.some((w) => w < 1 || w > 18)
    ) {
      // fallback to 1..18 if we don't have or trust the data
      return WEEK_OPTIONS;
    }
    return weeksFromData;
  }, [data?.availableWeeks]);

  const selectedWeek = week ?? data?.week ?? data?.latestWeek ?? 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Header: league + filters */}
      <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
              {data?.league?.name ?? "League leaderboard"}
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Weekly kicker scoring for{" "}
              <span className="font-semibold text-slate-800">
                {data?.season ?? "this season"}
              </span>
              . Select a week to see how each kicker performed.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <label className="text-xs sm:text-sm flex items-center gap-1.5">
              <span className="text-slate-500">Season</span>
              <input
                className="border border-slate-300 bg-white rounded-lg px-2 py-1 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                type="number"
                value={season ?? ""}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSeason(val || undefined);
                  setAppliedDefaultWeek(false);
                }}
              />
            </label>

            <label className="text-xs sm:text-sm flex items-center gap-1.5">
              <span className="text-slate-500">Week</span>
              <select
                className="border border-slate-300 bg-white rounded-lg px-2 py-1 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                value={selectedWeek}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setWeek(val || undefined);
                  setAppliedDefaultWeek(true);
                }}
              >
                {availableWeeks.map((w) => (
                  <option key={w} value={w}>
                    Week {w}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => loadLeaderboard()}
              disabled={loading}
              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Error */}
        {!data?.ok && data?.error && (
          <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {data.error}
          </div>
        )}
      </div>

      {/* Main content: leaderboard + kickers sidebar */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)]">
        {/* Leaderboard */}
        <div className="space-y-3">
          {data?.ok && (rows.length ?? 0) === 0 && (
            <div className="rounded-xl border border-yellow-100 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              No scores found for this week yet. Once kicks are imported and
              scored, they’ll appear here.
            </div>
          )}

          {showRows &&
            rows.map((r, i) => {
              const kicker = kickers[r.nflTeam];
              const kickerName = kicker?.name ?? `${r.nflTeam} kicker`;
              const injury = interpretInjuryStatus(
                kicker?.latest_news?.injury_status
              );
              const initials = getInitials(kickerName);
              const rank = i + 1;

              return (
                <div
                  key={r.leagueTeamId}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4 sm:py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-2xl bg-slate-900 text-white sm:h-12 sm:w-12">
                        {kicker?.headshot ? (
                          <Image
                            src={kicker.headshot}
                            alt={kickerName}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold sm:text-sm">
                            {initials}
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            #{rank.toString().padStart(2, "0")}
                          </div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {r.nflTeam}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-slate-900">
                          {kickerName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {r.nflTeamName} · Draft slot #{r.draftSlot}
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

                  {/* Kicker + breakdown */}
                  <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)]">
                    {/* Kicker info */}
                    <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                      <div className="flex flex-col text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">
                          {kicker?.team ?? r.nflTeam} ·{" "}
                          {kicker?.position ?? "K"}
                        </span>

                        <span className="mt-0.5">
                          Bye week:{" "}
                          {kicker?.bye_week
                            ? `Week ${kicker.bye_week}`
                            : "Unknown"}
                        </span>

                        {injury.level !== "ok" && (
                          <span
                            className={
                              injury.level === "bad"
                                ? "mt-0.5 inline-flex w-fit items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700"
                                : "mt-0.5 inline-flex w-fit items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                            }
                          >
                            {injury.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Scoring breakdown
                      </div>
                      {r.breakdown.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          No breakdown available for this week.
                        </p>
                      ) : (
                        <ul className="space-y-1 text-xs text-slate-600">
                          {r.breakdown.map((b, idx) => (
                            <li
                              key={idx}
                              className="flex items-center justify-between gap-2"
                            >
                              <span className="truncate">{b.desc}</span>
                              <span className="font-mono text-[11px] text-slate-800">
                                {b.pts > 0 ? `+${b.pts}` : b.pts}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Kickers sidebar */}
        <aside className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  NFL Kicker pool
                </div>
                <div className="text-xs text-slate-500">
                  Live status & bye weeks for all current kickers.
                </div>
              </div>
              {data?.week && (
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-50">
                  Week {data.week}
                </span>
              )}
            </div>

            {!kickersLoaded && (
              <p className="mt-2 text-xs text-slate-500">
                Loading kickers & injury statuses…
              </p>
            )}

            {kickersLoaded && Object.keys(kickers).length === 0 && (
              <p className="mt-2 text-xs text-slate-500">
                No kicker data available right now.
              </p>
            )}

            {kickersLoaded && Object.keys(kickers).length > 0 && (
              <div className="mt-3 max-h-[420px] space-y-1.5 overflow-y-auto pr-1 text-xs">
                {Object.entries(kickers)
                  .sort(([, a], [, b]) => {
                    const nameA = a.name ?? "";
                    const nameB = b.name ?? "";
                    return nameA.localeCompare(nameB);
                  })
                  .map(([k, v]) => {
                    const injury = interpretInjuryStatus(
                      v.latest_news?.injury_status
                    );
                    return (
                      <div
                        key={k}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-600">
                            {v.team}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {v.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px]">
                          {v.bye_week && (
                            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-50">
                              Bye {v.bye_week}
                            </span>
                          )}
                          {injury.level !== "ok" && (
                            <span
                              className={
                                injury.level === "bad"
                                  ? "rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700"
                                  : "rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700"
                              }
                            >
                              {injury.label}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
