"use client";
import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("Friends 2025");
  const [seasonYear, setSeasonYear] = useState(2025);
  const [email, setEmail] = useState("you@example.com");
  const [commishName, setCommishName] = useState("You");
  const [leagueIdInput, setLeagueIdInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function createLeague(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, seasonYear,
          commissionerEmail: email,
          commissionerName: commishName
        })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed");
      // go straight to the join page
      window.location.href = `/leagues/${json.league.id}/join`;
    } catch (err: any) {
      setMsg(err.message || "Failed to create league");
    } finally {
      setBusy(false);
    }
  }

  function openLeague(e: React.FormEvent) {
    e.preventDefault();
    if (!leagueIdInput.trim()) { setMsg("Enter a league id"); return; }
    window.location.href = `/leagues/${leagueIdInput.trim()}?season=2025&week=1`;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-10">
      <h1 className="text-3xl font-bold">Kicker League (MVP)</h1>

      {msg && <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700">{msg}</div>}

      <section className="border rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-3">Create a league</h2>
        <form onSubmit={createLeague} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">League name
            <input className="border w-full rounded px-2 py-1" value={name} onChange={e=>setName(e.target.value)} />
          </label>
          <label className="text-sm">Season year
            <input type="number" className="border w-full rounded px-2 py-1"
                   value={seasonYear} onChange={e=>setSeasonYear(Number(e.target.value))}/>
          </label>
          <label className="text-sm">Commissioner email
            <input className="border w-full rounded px-2 py-1" value={email} onChange={e=>setEmail(e.target.value)} />
          </label>
          <label className="text-sm">Commissioner name
            <input className="border w-full rounded px-2 py-1" value={commishName} onChange={e=>setCommishName(e.target.value)} />
          </label>
          <div className="sm:col-span-2">
            <button disabled={busy} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
              {busy ? "Creating..." : "Create league"}
            </button>
          </div>
        </form>
      </section>

      <section className="border rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-3">Open an existing league</h2>
        <form onSubmit={openLeague} className="flex gap-2">
          <input className="border rounded px-2 py-1 flex-1" placeholder="league id"
                 value={leagueIdInput} onChange={e=>setLeagueIdInput(e.target.value)} />
          <button className="px-4 py-2 rounded bg-black text-white">Open</button>
        </form>
        <p className="text-xs text-gray-500 mt-2">Tip: after creating, copy the ID from the URL.</p>
      </section>
    </div>
  );
}
