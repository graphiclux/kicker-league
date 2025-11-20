"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [name, setName] = useState("Friends 2025");
  const [seasonYear, setSeasonYear] = useState(2025);
  const [email, setEmail] = useState("you@example.com");
  const [commishName, setCommishName] = useState("You");
  const [leagueIdInput, setLeagueIdInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function createLeague(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          seasonYear,
          commissionerEmail: email,
          commissionerName: commishName,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Unable to create league");
      }

      // assume API returns { ok: true, league: { id, ... } }
      const leagueId = data.league.id as string;
      window.location.href = `/leagues/${leagueId}?season=${seasonYear}&week=1`;
    } catch (err: any) {
      setMsg(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function openLeague(e: FormEvent) {
    e.preventDefault();
    if (!leagueIdInput.trim()) {
      setMsg("Enter a league id");
      return;
    }
    window.location.href = `/leagues/${leagueIdInput.trim()}?season=${seasonYear}&week=1`;
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-4xl card p-8 md:p-10 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-lime-500/10 border border-lime-500/30 px-3 py-1 text-xs font-medium text-lime-300">
              <span className="text-base">🥾</span>
              <span>Because kickers deserve their own league</span>
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">
              Kicker League (MVP)
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">
              Spin up a tiny fantasy league where{" "}
              <span className="font-semibold text-slate-100">
                only the kickers score points
              </span>
              . Invite friends, track weekly totals, and crown the boot GOAT.
            </p>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-100 hover:border-lime-400 hover:text-lime-300 transition-colors"
          >
            Sign in
          </Link>
        </header>

        {msg && (
          <div className="rounded-xl border border-red-900/70 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {msg}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Create league */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Create a league</h2>
            <p className="text-xs text-slate-400">
              We&apos;ll create the league and assign you as commissioner.
            </p>

            <form onSubmit={createLeague} className="space-y-3">
              <label className="block text-sm">
                League name
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-500/30 outline-none transition"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>

              <label className="block text-sm">
                Season year
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
                  value={seasonYear}
                  onChange={(e) => setSeasonYear(Number(e.target.value))}
                />
              </label>

              <label className="block text-sm">
                Your email (commissioner)
                <input
                  type="email"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="block text-sm">
                Your name
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
                  value={commishName}
                  onChange={(e) => setCommishName(e.target.value)}
                />
              </label>

              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center rounded-xl bg-lime-500 text-slate-900 text-sm font-medium px-4 py-2.5 mt-2 shadow-lg shadow-lime-500/30 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-lime-400 transition-colors"
              >
                {busy ? "Creating..." : "Create league"}
              </button>
            </form>
          </section>

          {/* Open league */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Open an existing league</h2>
            <p className="text-xs text-slate-400">
              Paste the league ID from your URL or invite link.
            </p>

            <form onSubmit={openLeague} className="space-y-3">
              <label className="block text-sm">
                League ID
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
                  placeholder="league_123..."
                  value={leagueIdInput}
                  onChange={(e) => setLeagueIdInput(e.target.value)}
                />
              </label>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80 text-sm font-medium px-4 py-2.5 hover:border-lime-400 hover:text-lime-300 transition-colors"
              >
                Open league
              </button>

              <p className="text-xs text-slate-500">
                Tip: after creating a league, copy the ID from the URL and send
                it to your friends.
              </p>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
