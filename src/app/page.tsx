"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [name, setName] = useState("Friends 2025");
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear());
  const [email, setEmail] = useState("you@example.com");
  const [commishName, setCommishName] = useState("You");
  const [leagueIdInput, setLeagueIdInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function createLeague(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setMsg("Give your league a name first.");
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          seasonYear,
          // extra metadata; API can ignore this for now
          commissionerEmail: email,
          commissionerName: commishName,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.id) {
        throw new Error(data?.error || "Unable to create league.");
      }

      const leagueId = data.id as string;
      window.location.href = `/leagues/${leagueId}`;
    } catch (err: any) {
      console.error("createLeague error:", err);
      setMsg(err?.message || "Something went wrong creating your league.");
    } finally {
      setBusy(false);
    }
  }

  function openLeague(e: FormEvent) {
    e.preventDefault();
    if (!leagueIdInput.trim()) {
      setMsg("Enter a league ID first.");
      return;
    }
    window.location.href = `/leagues/${leagueIdInput.trim()}`;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl card p-8 md:p-10 space-y-8 relative overflow-hidden">
        {/* subtle glow */}
        <div className="pointer-events-none absolute -top-40 right-[-10%] h-80 w-80 rounded-full bg-lime-400/10 blur-3xl" />

        {/* header row */}
        <header className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-lime-500/10 border border-lime-500/30 px-3 py-1 text-xs font-medium text-lime-200">
              <span className="text-base">🥾</span>
              <span>Because kickers deserve their own league</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-50">
                And It&apos;s No Good
                <span className="ml-2 align-middle text-sm font-normal text-lime-300/80">
                  (kicker league MVP)
                </span>
              </h1>
              <p className="text-sm md:text-base text-slate-300 max-w-xl">
                Spin up a tiny fantasy league where{" "}
                <span className="font-semibold text-lime-300">
                  only the kickers score points.
                </span>{" "}
                Invite friends, sweat every kick, track weekly totals, and crown
                the boot GOAT.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 md:gap-4">
            <span className="hidden text-xs text-slate-500 md:inline">
              Already drafted?
            </span>
            <Link
              href="/login"
              className="inline-flex items-center rounded-full border border-slate-600/80 bg-slate-900/80 px-4 py-1.5 text-xs font-medium text-slate-50 shadow-md shadow-black/30 transition hover:border-lime-400 hover:bg-slate-900"
            >
              Sign in
            </Link>
          </div>
        </header>

        {/* content row */}
        <div className="relative z-10 grid gap-8 md:grid-cols-2">
          {/* create league */}
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-slate-100">
                Create a league
              </h2>
              <p className="text-xs text-slate-400">
                We&apos;ll create the league and assign you as commissioner.
              </p>
            </div>

            <form onSubmit={createLeague} className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="league-name"
                  className="text-xs font-medium text-slate-300"
                >
                  League name
                </label>
                <input
                  id="league-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/80 focus:border-lime-400"
                  placeholder="Friends & Family 2025"
                />
              </div>

              <div className="flex gap-3">
                <div className="w-28 space-y-1">
                  <label
                    htmlFor="season-year"
                    className="text-xs font-medium text-slate-300"
                  >
                    Season year
                  </label>
                  <input
                    id="season-year"
                    type="number"
                    value={seasonYear}
                    onChange={(e) =>
                      setSeasonYear(
                        Number.isNaN(Number(e.target.value))
                          ? new Date().getFullYear()
                          : Number(e.target.value),
                      )
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/80 focus:border-lime-400"
                  />
                </div>

                <div className="flex-1 space-y-1">
                  <label
                    htmlFor="commish-email"
                    className="text-xs font-medium text-slate-300"
                  >
                    Your email (commissioner)
                  </label>
                  <input
                    id="commish-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/80 focus:border-lime-400"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="commish-name"
                  className="text-xs font-medium text-slate-300"
                >
                  Your name
                </label>
                <input
                  id="commish-name"
                  type="text"
                  value={commishName}
                  onChange={(e) => setCommishName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/80 focus:border-lime-400"
                  placeholder="You"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-lime-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-lime-500/40 transition hover:bg-lime-400 disabled:opacity-60"
              >
                {busy ? "Creating league…" : "Create league"}
              </button>
            </form>
          </section>

          {/* open league */}
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-slate-100">
                Open an existing league
              </h2>
              <p className="text-xs text-slate-400">
                Paste the league ID from your URL or invite link.
              </p>
            </div>

            <form onSubmit={openLeague} className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="league-id"
                  className="text-xs font-medium text-slate-300"
                >
                  League ID
                </label>
                <input
                  id="league-id"
                  type="text"
                  value={leagueIdInput}
                  onChange={(e) => setLeagueIdInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/80 focus:border-lime-400"
                  placeholder="league_123..."
                />
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm font-semibold text-slate-100 shadow-md shadow-black/40 transition hover:border-lime-400 hover:bg-slate-950"
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

        {msg && (
          <div className="relative z-10 mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {msg}
          </div>
        )}
      </div>
    </main>
  );
}
