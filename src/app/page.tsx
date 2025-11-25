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
      // Email magic-link (or dev-direct) sign in
      await signIn("email", {
        email: email.trim(),
        callbackUrl: "/dashboard",
        redirect: true,
      });
    } catch (err: any) {
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
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-5xl relative">
        {/* soft background panel to feel more like the light dashboard */}
        <div className="absolute inset-x-0 -top-10 h-64 rounded-3xl bg-gradient-to-b from-lime-100/70 via-emerald-50/80 to-transparent pointer-events-none" />
        {/* main card */}
        <div className="relative z-10 rounded-3xl bg-white text-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.35)] border border-slate-200 px-6 py-7 md:px-10 md:py-9 space-y-8">
          {/* header */}
          <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-lime-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-lime-800 border border-lime-300">
                <span className="text-base">🥾</span>
                <span>Because kickers deserve their own league</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                  Fantasy football where only the kickers score.
                </h1>
                <p className="text-sm text-slate-600 max-w-xl">
                  Kicker League is a tiny fantasy game inspired by the long-running{" "}
                  <span className="font-semibold">And It&apos;s No Good</span>{" "}
                  home league. Draft kickers, reward the chaos, and let us do all
                  the math for you.
                </p>
              </div>

              <ul className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2 max-w-lg">
                <li className="flex items-start gap-2">
                  <span className="mt-[2px] text-lime-600">•</span>
                  <span>Only kickers score — no QBs, no RBs, no defenses.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-[2px] text-lime-600">•</span>
                  <span>
                    Misses are worth points, long makes can hurt you. Pain = points.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-[2px] text-lime-600">•</span>
                  <span>Low-maintenance side game for your main fantasy league.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-[2px] text-lime-600">•</span>
                  <span>Powered by real NFL data — we handle scoring and standings.</span>
                </li>
              </ul>
            </div>

            {/* top-right small sign-in link */}
            <div className="flex items-start gap-3 md:gap-4">
              <span className="hidden text-xs text-slate-500 md:inline">
                Already drafted?
              </span>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:border-lime-400 hover:text-lime-700 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </header>

          {/* main content: auth + open league + explanation */}
          <div className="grid gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">
            {/* Signup / login */}
            <section className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-slate-900">
                  Get started
                </h2>
                <p className="text-xs text-slate-600">
                  Sign up or log in with your email. We&apos;ll send you into
                  your dashboard where you can create and manage leagues.
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
                    ? "Sending you in..."
                    : "Sign up / Log in"}
                </button>

                {authError && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 mt-1">
                    {authError}
                  </p>
                )}

                <p className="text-[11px] text-slate-500">
                  In dev mode, entering your email signs you in directly. In
                  production, this becomes a magic link.
                </p>
              </form>

              <div className="pt-2 border-t border-slate-200 mt-4 space-y-2">
                <h3 className="text-xs font-semibold text-slate-800">
                  Open an existing league
                </h3>
                <p className="text-[11px] text-slate-500 mb-1">
                  Already have a league URL? Paste the ID from{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">
                    /leagues/&lt;id&gt;
                  </code>{" "}
                  here.
                </p>
                <form onSubmit={openLeague} className="flex flex-col gap-2 sm:flex-row">
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
            </section>

            {/* right: how it works + why kickers only + scoring sample */}
            <section className="space-y-6">
              {/* How it works */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  How Kicker League works
                </h2>
                <div className="grid gap-3 text-xs text-slate-600">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">1</span>
                      <span className="font-semibold text-slate-900">
                        Draft kickers, not rosters
                      </span>
                    </div>
                    <p>
                      Everyone picks 1–2 NFL kickers. No huge rosters, no waiver
                      headaches. Just legs.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">2</span>
                      <span className="font-semibold text-slate-900">
                        Score the chaos, not just the makes
                      </span>
                    </div>
                    <p>
                      Use the And It&apos;s No Good house rules or your own:
                      short misses, extra points, and long kicks swing matchups.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">3</span>
                      <span className="font-semibold text-slate-900">
                        We handle scoring &amp; standings
                      </span>
                    </div>
                    <p>
                      We pull real game data and calculate weekly scores and
                      season standings for you.
                    </p>
                  </div>
                </div>
              </div>

              {/* Why kickers only + scoring sample */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Why kickers only?
                </h2>
                <p className="text-xs text-slate-600">
                  Every extra point becomes terrifying, every 55-yarder is a
                  double-edged sword, and suddenly everyone in your group chat is
                  watching the same late-game kick.
                </p>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[11px] text-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      Sample scoring (AING style)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      We do the math.
                    </span>
                  </div>
                  <ul className="space-y-1">
                    <li>+2 points &mdash; Missed FG under 29 yards</li>
                    <li>+1 point &mdash; Missed FG 30+ yards</li>
                    <li>+3 points &mdash; Missed or blocked extra point</li>
                    <li>-1 point &mdash; Made FG over 50 yards</li>
                  </ul>
                  <p className="text-[10px] text-slate-500">
                    Built from the real And It&apos;s No Good league rules. Use
                    them as-is, or tune your own house settings later.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {msg && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              {msg}
            </div>
          )}

          <footer className="pt-4 border-t border-slate-200 mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
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
      </div>
    </main>
  );
}
