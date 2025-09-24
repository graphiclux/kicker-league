"use client";
import { useEffect, useMemo, useState } from "react";

type Row = {
  leagueTeamId: string;
  nflTeam: string;
  nflTeamName: string;
  owner: { name: string | null; email: string };
  draftSlot: number;
  points: number;
  breakdown: { desc: string; pts: number }[];
};

export default function LeaguePage({ params, searchParams }: {
  params: { leagueId: string },
  searchParams?: { season?: string; week?: string }
}) {
  const leagueId = params.leagueId;
  const [season, setSeason] = useState<number>(Number(searchParams?.season ?? 2025));
  const [week, setWeek] = useState<number>(Number(searchParams?.week ?? 1));
  const [data, setData] = useState<{
    ok: boolean;
    league?: { id: string; name: string; seasonYear: number; maxTeams: number };
    rows?: Row[];
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const url = useMemo(() => {
    const q = new URLSearchParams({ season: String(season), week: String(week) });
    return `/api/leagues/${leagueId}/leaderboard?` + q.toString();
  }, [leagueId, season, week]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setData({ ok: false, error: e?.message ?? "Failed to load" });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [url]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold">{data?.league?.name ?? "League"} — Leaderboard</h1>
          <p className="text-sm text-gray-500">Season {season} • Week {week}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Season&nbsp;
            <input className="border rounded px-2 py-1 w-24" type="number"
              value={season} onChange={(e) => setSeason(Number(e.target.value))} />
          </label>
          <label className="text-sm">Week&nbsp;
            <input className="border rounded px-2 py-1 w-20" type="number" min={1} max={18}
              value={week} onChange={(e) => setWeek(Number(e.target.value))} />
          </label>
          <button onClick={load} className="px-3 py-2 rounded bg-black text-white disabled:opacity-50" disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {!data?.ok && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {data?.error ?? "Failed to load leaderboard"}
        </div>
      )}

      {data?.ok && (data.rows?.length ?? 0) === 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
          No teams yet. Join the league and pick a team.
        </div>
      )}

      {data?.ok && (data.rows?.length ?? 0) > 0 && (
        <div className="space-y-3">
          {data!.rows!.map((r, i) => (
            <div key={r.leagueTeamId} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-xl font-bold w-6 text-right">{i + 1}</div>
                  <div>
                    <div className="font-semibold">{r.nflTeam} — {r.nflTeamName}</div>
                    <div className="text-sm text-gray-500">
                      Owner: {r.owner.name ?? r.owner.email} • Draft #{r.draftSlot}
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-bold">{r.points}</div>
              </div>

              {r.breakdown.length > 0 ? (
                <div className="mt-3">
                  <div className="text-sm font-medium mb-1">Play breakdown</div>
                  <ul className="text-sm list-disc pl-5 space-y-1">
                    {r.breakdown.map((b, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>{b.desc}</span>
                        <span className="font-semibold">{b.pts > 0 ? `+${b.pts}` : b.pts}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-3 text-sm text-gray-500">No qualifying plays this week.</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
