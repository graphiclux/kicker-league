"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
    <main className="min-h-screen bg-gradient-to-b from-lime-50 to-white text-slate-900">
      {/* Top bar with big logo only */}
      <header className="border-b border-slate-200" style={{ backgroundColor: "#faf8f4" }}>
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="relative h-24 w-24 sm:h-28 sm:w-28">
            <Image
              src="/aing-logo.png"
              alt="And It's No Good logo"
              fill
              className="object-contain"
              priority
            />
          </div>

          <Link
            href="/login"
            className="hidden sm:inline-flex items-center rounded-full border border-slate-200 bg-white px-6 py-2 text-base font-semibold text-slate-800 shadow-sm hover:border-lime-400 hover:text-lime-700 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>


      {/* Hero area */}
      <div className="relative">
        {/* soft lime band - no gray background */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-lime-100 via-lime-50 to-transparent" />

        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          {/* Hero grid */}
          <section className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
            {/* Left: big copy */}
            <div className="space-y-10">
              <div className="inline-flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 text-base font-semibold tracking-[0.18em] uppercase text-lime-800 border border-lime-300 shadow-sm">
                <span className="text-xl">🥾</span>
                <span>Because kickers deserve their own league</span>
              </div>

              <div className="space-y-5">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
                  Fantasy football
                  <span className="block text-lime-700">
                    where only kickers score.
                  </span>
                </h1>
                <p className="text-lg text-slate-700 max-w-xl leading-relaxed">
                  Kicker League is a tiny fantasy game you run alongside your
                  main league. Draft kickers, reward misses, punish long makes,
                  and let us handle the scoring and standings.
                </p>
              </div>

              <div className="grid gap-5 text-base text-slate-800 sm:grid-cols-2 max-w-xl">
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                  <p className="font-semibold text-slate-900 mb-2">
                    Kickers only, no rosters
                  </p>
                  <p className="leading-relaxed">
                    Everyone drafts 1–2 NFL kickers. No 15-player lineups or
                    waiver drama. Just legs and nerves.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                  <p className="font-semibold text-slate-900 mb-2">
                    Chaos-focused scoring
                  </p>
                  <p className="leading-relaxed">
                    Short misses and XP disasters earn points. Long makes can
                    actually hurt. Pain becomes the meta.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: auth card */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                <div className="space-y-3 mb-6">
                  <h2 className="text-2xl font-semibold text-slate-900">
                    Jump into your league hub
                  </h2>
                  <p className="text-base text-slate-700 leading-relaxed">
                    Use your email to sign up or log in. We&apos;ll send you to
                    your dashboard where you can create leagues, invite friends,
                    and track kicks all season.
                  </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="block text-base font-medium text-slate-800"
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
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-lime-500/80 focus:border-lime-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authDisabled}
                    className="w-full rounded-lg bg-slate-900 py-3 text-base font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {authStatus === "sending"
                      ? "Sending magic link..."
                      : "Continue with email"}
                  </button>

                  {authError && (
                    <p className="text-base text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      {authError}
                    </p>
                  )}

                  <p className="text-base text-slate-600">
                    In dev, this might sign you in immediately. In production,
                    you&apos;ll get a one-tap magic link.
                  </p>
                </form>

                <div className="mt-7 pt-5 border-t border-slate-200 space-y-3">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Open an existing league
                  </h3>
                  <p className="text-base text-slate-700">
                    Paste the ID from your league URL &mdash; the part after{" "}
                    <code className="rounded bg-lime-50 px-2 py-1 text-base">
                      /leagues/
                    </code>
                    .
                  </p>
                  <form
                    onSubmit={openLeague}
                    className="flex flex-col gap-3 sm:flex-row"
                  >
                    <input
                      type="text"
                      value={leagueIdInput}
                      onChange={(e) => setLeagueIdInput(e.target.value)}
                      placeholder="e.g. clxyz123abc"
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-lime-500/80 focus:border-lime-400"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-lg bg-lime-500 px-5 py-3 text-base font-semibold text-slate-900 shadow-sm hover:bg-lime-400 transition-colors"
                    >
                      Open league
                    </button>
                  </form>
                </div>
              </div>

              {/* scoring card */}
              <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-base font-semibold text-slate-900">
                    Scoring (And It&apos;s No Good style)
                  </span>
                  <span className="text-base text-slate-600">
                    We do the math.
                  </span>
                </div>
                <ul className="text-base text-slate-800 space-y-1.5">
                  <li>+2 pts — Missed FG under 29 yards</li>
                  <li>+1 pt — Missed FG from 30+ yards</li>
                  <li>+3 pts — Missed or blocked extra point</li>
                  <li>-1 pt — Made FG over 50 yards</li>
                </ul>
                <p className="mt-3 text-base text-slate-600">
                  Based on the original AING league. Use this house system or
                  tweak your own rules later.
                </p>
              </div>
            </div>
          </section>

          {/* Secondary section */}
          <section className="grid gap-10 lg:grid-cols-2 border-t border-slate-200 pt-10">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-slate-900">
                How Kicker League fits into your season
              </h2>
              <ol className="space-y-4 text-base text-slate-800">
                <li className="flex gap-3">
                  <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-base font-semibold text-white">
                    1
                  </span>
                  <span>
                    <span className="font-semibold">Create a league</span> and
                    invite your fantasy crew, coworkers, or group chat.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-base font-semibold text-white">
                    2
                  </span>
                  <span>
                    <span className="font-semibold">Draft kickers</span> before
                    Week 1 or any week you want your mini-season to start.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-base font-semibold text-white">
                    3
                  </span>
                  <span>
                    <span className="font-semibold">
                      Let every kick decide everything.
                    </span>{" "}
                    We calculate weekly scores and crown a season champion.
                  </span>
                </li>
              </ol>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-slate-900">
                Why a kicker-only league works
              </h2>
              <p className="text-base text-slate-800 leading-relaxed">
                Every extra point becomes stressful. Every 55-yarder is a
                double-edged sword. The game takes almost no time to manage, but
                gives your group chat something to yell about every Sunday.
              </p>
              <ul className="space-y-2 text-base text-slate-800">
                <li>• Elevates the weirdest part of real football.</li>
                <li>• Easy to explain, impossible to stop thinking about.</li>
                <li>
                  • Doesn&apos;t compete with your main fantasy league — it
                  rides alongside it as a side pot or chaos game.
                </li>
              </ul>
            </div>
          </section>

          {msg && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900">
              {msg}
            </div>
          )}

          <footer className="border-t border-slate-200 pt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base text-slate-600">
              And It&apos;s No Good is the original private kicker-only league.
              Kicker League is the app that lets anyone run their own version.
            </p>
            <Link
              href="https://anditsnogood.com"
              className="text-base text-lime-700 hover:text-lime-800 underline underline-offset-4"
            >
              Visit the AING league site →
            </Link>
          </footer>
        </div>
      </div>
    </main>
  );
}
