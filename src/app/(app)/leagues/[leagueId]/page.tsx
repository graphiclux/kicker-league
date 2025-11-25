"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import type { KickerInfo } from "@/app/api/nfl/kickers/route";

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
  kickers?: Record<string, KickerInfo>;
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

  if (["Q", "QUESTIONABLE", "D", "DOUBTFUL"].includes(normalized)) {
    return { label: normalized, level: "warn" as const };
  }

  return { label: normalized, level: "warn" as const };
}

/**
 * Local team logo helper.
 * If you drop files into /public/logos/teams/buf.svg, kc.svg, etc.,
 * this will use them. If not, we still show a fallback text avatar.
 */
function getTeamLogoSrc(teamAbbr: string) {
  return `https://sleepercdn.com/images/team_logos/nfl/${teamAbbr.toLowerCase()}.png`;
}

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

  const initialSeason = Number(searchParams.get("season") ?? 2025);
  const initialWeekParam = searchParams.get("week");

  const [season, setSeason] = useState<number>(initialSeason);
  const [week, setWeek] = useState<number | undefined>(
    initialWeekParam ? Number(initialWeekParam) : undefined
  );
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [appliedDefaultWeek, setAppliedDefaultWeek] = useState(false);

  const [kickers, setKickers] = useState<Record<string, KickerInfo>>({});
  const [kickersLoaded, setKickersLoaded] = useState(false);

  const url = useMemo(() => {
    const q = new URLSearchParams();
    q.set("season", String(season));
    if (week != null && Number.isFinite(week)) {
      q.set("week", String(week));
    }
    return `/leagues/${leagueId}/leaderboard?` + q.toString();
  }, [leagueId, season, week]);

  async function loadLeaderboard() {
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
  const rows = data?.rows ?? [];

  const weeklyKicks =
    showRows && effectiveWeek != null
      ? rows.flatMap((r) =>
          r.breakdown.map((b) => ({
            team: r.nflTeam,
            teamName: r.nflTeamName,
            ownerName: r.owner.name ?? r.owner.email,
            desc: b.desc,
            pts: b.pts,
          }))
        )
      : [];

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Top controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900">
            {leagueName} — Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Season {season}
            {effectiveWeek ? ` • Week ${effectiveWeek}` : null}
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
            onClick={loadLeaderboard}
            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Error */}
      {!data?.ok && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {data?.error ?? "Failed to load leaderboard"}
        </div>
      )}

      {/* Main content: leaderboard + kicks */}
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
              const kickerName =
                kicker?.name ?? `${r.nflTeam} kicker`;
              const injury = interpretInjuryStatus(
                kicker?.injuryStatus
              );

              const logoSrc = getTeamLogoSrc(r.nflTeam);
              const kickerInitials = getInitials(kickerName);

              return (
                <div
                  key={r.leagueTeamId}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4">
                    {/* Rank + team + logo + points */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lime-100 text-xs font-semibold text-lime-900">
                          {i + 1}
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Logo circle with optional image + fallback text */}
                          <div className="relative h-10 w-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-[11px] font-semibold text-slate-700">
                            {/* If you add /public/logos/teams/{abbr}.svg, this will show it.
                                If not, the team code text remains visible. */}
                            <span className="z-0">{r.nflTeam}</span>
                            <Image
                              src={logoSrc}
                              alt={`${r.nflTeam} logo`}
                              fill
                              className="object-contain z-10"
                              sizes="40px"
                              // Don't hide on error; just let the text underneath be visible.
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}

                            />
                          </div>
                          <div>
                            <div className="text-sm sm:text-base font-semibold text-slate-900">
                              {r.nflTeam} — {r.nflTeamName}
                            </div>
                            <div className="text-xs text-slate-500">
                              Owner: {r.owner.name ?? r.owner.email} •
                              Draft #{r.draftSlot}
                            </div>
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
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)]">
                      {/* Kicker info */}
                      <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-800">
                          {kickerInitials || r.nflTeam}
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold text-slate-800">
                            {kickerName}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500">
                              This week&apos;s kicker for {r.nflTeam}
                            </span>
                            {kickersLoaded && (
                              <span
                                className={[
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  injury.level === "ok" &&
                                    "bg-emerald-50 text-emerald-700 border border-emerald-100",
                                  injury.level === "warn" &&
                                    "bg-amber-50 text-amber-700 border border-amber-100",
                                  injury.level === "bad" &&
                                    "bg-red-50 text-red-700 border border-red-100",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {injury.label}
                              </span>
                            )}
                          </div>
                          {kicker?.injuryNotes && (
                            <div className="text-[10px] text-slate-500">
                              {kicker.injuryNotes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Play breakdown */}
                      {r.breakdown.length > 0 ? (
                        <div>
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
                        <div className="text-xs text-slate-400 flex items-center">
                          No qualifying plays for this team this week.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* This week's kicks */}
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                This week&apos;s kicks
              </h2>
              <p className="text-[11px] text-slate-500">
                All scoring plays for Week {effectiveWeek ?? "—"} across
                the league.
              </p>
            </div>
            {weeklyKicks.length > 0 && (
              <span className="text-[11px] text-slate-400">
                {weeklyKicks.length} plays
              </span>
            )}
          </div>

          {weeklyKicks.length === 0 ? (
            <div className="text-xs text-slate-400">
              No kicks recorded for this week yet.
            </div>
          ) : (
            <ul className="space-y-1.5 max-h-[480px] overflow-auto pr-1 text-xs">
              {weeklyKicks.map((k, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
                      {k.team}
                    </span>
                    <div>
                      <div className="text-[11px] text-slate-800">
                        {k.desc}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {k.teamName} • {k.ownerName}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-900">
                    {k.pts > 0 ? `+${k.pts}` : k.pts}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
