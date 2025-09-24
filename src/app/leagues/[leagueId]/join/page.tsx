"use client";
import { useEffect, useState } from "react";

type Team = { abbr: string; name: string };

export default function JoinLeague({ params }: { params: { leagueId: string } }) {
  const leagueId = params.leagueId;
  const [teams, setTeams] = useState<Team[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/nfl-teams", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setTeams(json.teams);
    })();
  }, []);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, nflTeam: team })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to join");
      // Go to leaderboard
      window.location.href = `/leagues/${leagueId}?season=2025&week=1`;
    } catch (err: any) {
      setMsg(err.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Join League</h1>
      {msg && <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 mb-3">{msg}</div>}
      <form onSubmit={join} className="space-y-3">
        <label className="block text-sm">Email
          <input className="border rounded px-2 py-1 w-full" value={email} onChange={e=>setEmail(e.target.value)} required />
        </label>
        <label className="block text-sm">Name
          <input className="border rounded px-2 py-1 w-full" value={name} onChange={e=>setName(e.target.value)} />
        </label>
        <label className="block text-sm">NFL Team
          <select className="border rounded px-2 py-1 w-full" value={team} onChange={e=>setTeam(e.target.value)} required>
            <option value="" disabled>Pick a team</option>
            {teams.map(t => <option key={t.abbr} value={t.abbr}>{t.abbr} — {t.name}</option>)}
          </select>
        </label>
        <button disabled={busy} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
          {busy ? "Joining..." : "Join"}
        </button>
      </form>

      <div className="mt-6 text-sm">
        After joining, view the <a className="underline" href={`/leagues/${leagueId}?season=2025&week=1`}>leaderboard</a>.
      </div>
    </div>
  );
}
