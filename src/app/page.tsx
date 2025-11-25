"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

type AuthStatus = "idle" | "sending" | "error";

export default function Home() {
  const [email, setEmail] = useState("");
  const [authStatus, setAuthStatus] = useState<AuthStatus>("idle");
  const [authError, setAuthError] = useState<string | null>(null);

  const [leagueIdInput, setLeagueIdInput] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function handleAuth(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || authStatus === "sending") return;

    setAuthStatus("sending");
    setAuthError(null);
    setMsg(null);

    try {
      await signIn("email", {
        email: email.trim(),
        callbackUrl: "/dashboard",
        redirect: true,
      });
    } catch (err) {
      console.error("[Landing] signIn error", err);
      setAuthStatus("error");
      setAuthError("We couldn’t start your sign-in. Please try again.");
    }
  }

  function openLeague(e: FormEvent) {
    e.preventDefault();
    if (!leagueIdInput.trim()) {
      setMsg("Enter a league ID first.");
      return;
    }
    setMsg(null);
    window.location.href = `/leagues/${leagueIdInput.trim()}`;
  }

  const authDisabled = authStatus === "sending";

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-6xl">
        {/* soft background accent */}
        <div className="relative mb-8">
          <div className="pointer-events-none absolute inset-x-0 -top-10 h-40 rounded-3xl bg-gradient-to-b from-lime-100/80 via-emerald-50/80 to-transparent" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lime-500/10 shadow-sm ring-1 ring-lime-400/60">
                <div className="relative h-6 w-6">
                  <span className="absolute inset-0 rounded-full border-2 border-lime-500" />
                  <span className="absolute left-1/2 top-1/2 h-4 w-[2px] -translate-x-1/2 -translate-y-1/2 rotate-12 rounded-full bg-lime-500" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-600">
                    Kicker League
                  </span>
                  <span className="rounded-full bg-lime-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-700">
                    Beta
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Built from the chaos of the And It&apos;s No Good home league.
                </p>
              </div>
            </div>

            <Link
              href="/login"
              className="hidden sm:inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:border-lime-400 hover:text-lime-700 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* HERO + AUTH GRID */}
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start mb-10">
          {/* Left: hero copy */}
          <section className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-lime-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-lime-800 border border-lime-300">
              <span className="text-sm">🥾</span>
              <span>Because kickers deserve their own league</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                Fantasy football where only the kickers score.
              </h1>
              <p className="text-sm text-slate-600 max-w-xl">
                Kicker League is a tiny fantasy game you can run alongside your
                main league. Draft kickers, reward misses, punish long makes, and
                let us handle all the scoring and standings.
              </p>
            </div>

            <div className="grid gap-3 text-xs text-slate-600 sm:grid-cols-2 max-w-xl">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                <p className="font-semibold text-slate-900 mb-1">
                  Kickers only, no rosters
                </p>
                <p>
                  Everyone picks 1–2 NFL kickers. No giant lineups or waiver
                  madness. Just legs and nerves.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                <p className="font-semibold text-slate-900 mb-1">
                  Chaos-focused scoring
                </p>
                <p>
                  Short misses and extra point disasters earn points. Long makes
                  can hurt. Pain = points.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="font-semibold text-slate-900 mb-1">
                  Run it as a side game
                </p>
                <p>
                  Perfect as a side pot with your main fantasy league or an
                  office / group chat mini-league.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="font-semibold text-slate-900 mb-1">
                  We do all the math
                </p>
                <p>
                  We pull real NFL stats, calculate weekly scores, and keep
                  standings up to date so you don&apos;t have to.
                </p>
              </div>
            </div>
          </section>

          {/* Right: sign up / log in card */}
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_35px_rgba(15,23,42,0.08)]">
              <div className="space-y-1 mb-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Sign up or log in
                </h2>
                <p className="text-xs text-slate-600">
                  Use your email to get into your Kicker League dashboard. From
                  there you can create leagues, invite friends, and track kicks.
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-3">
                <div className="space-y-1">
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-lime-500/80 focus:border-lime-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authDisabled}
                  className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {authStatus === "sending"
                    ? "Sending magic link..."
                    : "Continue with email"}
                </button>

                {authError && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 mt-1">
                    {authError}
                  </p>
                )}

                <p className="text-[11px] text-slate-500">
                  In dev, this may sign you in immediately. In production, you’ll
                  receive a magic link to your inbox.
                </p>
              </form>

              <div className="mt-5 pt-4 border-t border-slate-200 space-y-2">
                <h3 className="text-xs font-semibold text-slate-800">
                  Open an existing league
                </h3>
                <p className="text-[11px] text-slate-500">
                  Paste the ID from your league URL &mdash; the part after{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">
                    /leagues/
                  </code>
                  .
                </p>
                <form
                  onSubmit={openLeague}
                  className="flex flex-col gap-2 sm:flex-row"
                >
                  <input
                    type="text"
                    value={leagueIdInput}
                    onChange={(e) => setLeagueIdInput(e.target.value)}
                    placeholder="e.g. clxyz123abc"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-lime-500/80 focus:border-lime-400"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-lg bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-lime-400 transition-colors"
                  >
                    Open league
                  </button>
                </form>
              </div>
            </div>

            {/* scoring sample */}
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-900">
                  Sample scoring (And It&apos;s No Good style)
                </span>
                <span className="text-[10px] text-slate-500">
                  We do the math.
                </span>
              </div>
              <ul className="text-[11px] text-slate-700 space-y-1">
                <li>+2 points &mdash; Missed FG under 29 yards</li>
                <li>+1 point &mdash; Missed FG 30+ yards</li>
                <li>+3 points &mdash; Missed or blocked extra point</li>
                <li>-1 point &mdash; Made FG over 50 yards</li>
              </ul>
              <p className="mt-2 text-[10px] text-slate-500">
                Use this house system from the original And It&apos;s No Good
                league or tweak your own rules later.
              </p>
            </div>
          </section>
        </div>

        {/* How it works / Why kickers section */}
        <section className="grid gap-8 md:grid-cols-2 border-t border-slate-200 pt-8">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              How Kicker League fits into your season
            </h2>
            <ol className="space-y-3 text-xs text-slate-600">
              <li className="flex gap-2">
                <span className="mt-[1px] inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                  1
                </span>
                <span>
                  <span className="font-semibold">Create a league</span> and
                  invite friends, coworkers, or your main fantasy crew.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-[1px] inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                  2
                </span>
                <span>
                  <span className="font-semibold">Draft kickers</span> at the
                  start of the season or before Week 1 of your mini-league.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-[1px] inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                  3
                </span>
                <span>
                  <span className="font-semibold">
                    Let the misses and makes decide everything.
                  </span>{" "}
                  We track weekly scores and crown a season champion.
                </span>
              </li>
            </ol>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Why kickers-only works
            </h2>
            <p className="text-xs text-slate-600">
              Every extra point becomes stressful. Every 55-yarder is a
              double-edged sword. The game takes almost no effort to run, but it
              gives your group chat something to yell about every Sunday.
            </p>
            <ul className="space-y-1 text-xs text-slate-600">
              <li>• Elevates the weirdest part of real football.</li>
              <li>• Easy to explain, hard to stop thinking about.</li>
              <li>• Doesn&apos;t compete with your main fantasy league &mdash; it
                rides alongside it.</li>
            </ul>
          </div>
        </section>

        {msg && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            {msg}
          </div>
        )}

        <footer className="mt-10 border-t border-slate-200 pt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            And It&apos;s No Good is the original private kicker-only league.
            Kicker League is the app that lets anyone run their own version.
          </p>
          <Link
            href="https://anditsnogood.com"
            className="text-[11px] text-lime-700 hover:text-lime-800 underline underline-offset-4"
          >
            Visit the AING league site →
          </Link>
        </footer>
      </div>
    </main>
  );
}
