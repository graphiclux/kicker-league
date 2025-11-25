"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { getSafeCallbackUrl } from "@/lib/redirect";

export const dynamic = "force-dynamic";

type AuthStatus = "idle" | "sending" | "error" | "success";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "There is an issue with the sign-in configuration. Please try again later.",
  Verification:
    "This sign-in link is no longer valid. Please request a new magic link.",
  AccessDenied:
    "Access was denied. If you believe this is a mistake, please contact support.",
  Default:
    "We couldn’t start your sign-in. Please try again in a moment.",
};

function getErrorMessage(code?: string | null) {
  if (!code) return null;
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.Default;
}

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [authStatus, setAuthStatus] = useState<AuthStatus>("idle");
  const [authError, setAuthError] = useState<string | null>(null);

  const [leagueIdInput, setLeagueIdInput] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const callbackUrlParam = searchParams.get("callbackUrl");
  const callbackUrl = getSafeCallbackUrl(callbackUrlParam, "/dashboard");

  const errorParam = searchParams.get("error");
  const initialError = getErrorMessage(errorParam);

  useEffect(() => {
    if (initialError) {
      setAuthError(initialError);
      setAuthStatus("error");
    }
  }, [initialError]);

  async function handleAuth(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || authStatus === "sending") return;

    setAuthStatus("sending");
    setAuthError(null);
    setMsg(null);

    try {
      const trimmed = email.trim();

      const res = await signIn("email", {
        email: trimmed,
        callbackUrl,
        redirect: false,
      });

      console.log("[Landing] signIn(email) result:", res);

      if (!res) {
        setAuthStatus("error");
        setAuthError(ERROR_MESSAGES.Default);
        return;
      }

      if (res.error) {
        setAuthStatus("error");
        setAuthError(getErrorMessage(res.error));
        return;
      }

      // Success: show brief message then send to custom check-email page
      setAuthStatus("success");
      router.push(
        `/auth/check-email?email=${encodeURIComponent(
          trimmed
        )}&callbackUrl=${encodeURIComponent(callbackUrl)}`
      );
    } catch (err) {
      console.error("[Landing] signIn error", err);
      setAuthStatus("error");
      setAuthError(ERROR_MESSAGES.Default);
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
        <header
          className="border-b border-slate-200"
          style={{ backgroundColor: "#faf8f4" }}
        >
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
              Dev sign in
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
                <div className="inline-flex items-center gap-3 rounded-full bg-lime-100/70 px-4 py-2 text-[11px] tracking-[0.18em] uppercase text-lime-800 border border-lime-300 shadow-sm">
                  <span className="text-xl">🥾</span>
                  <span>Because kickers deserve their own league</span>
                </div>

                <div className="space-y-4">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight text-slate-900">
                    Run your own{" "}
                    <span className="underline decoration-lime-400 decoration-4 underline-offset-4">
                      Kicker League
                    </span>{" "}
                    with real-time scoring.
                  </h1>
                  <p className="text-base sm:text-lg text-slate-700 max-w-xl">
                    Kicker League tracks every field goal and extra point from
                    your league&apos;s kickers and turns it into a side-game
                    that&apos;s actually fun to sweat.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Already have a league ID from your commissioner? Jump
                    straight into it:
                  </p>
                  <form
                    onSubmit={openLeague}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center"
                  >
                    <input
                      type="text"
                      value={leagueIdInput}
                      onChange={(e) => setLeagueIdInput(e.target.value)}
                      placeholder="Enter league ID"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                    />
                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
                    >
                      Join league
                    </button>
                  </form>
                  {msg && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 inline-block mt-1">
                      {msg}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: auth card */}
              <aside className="w-full">
                <div className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                  <h2 className="text-xl font-semibold text-slate-900 mb-1">
                    Sign in with a magic link
                  </h2>
                  <p className="text-sm text-slate-600 mb-5">
                    No passwords. Enter your email and we&apos;ll send a secure
                    link to sign you in.
                  </p>

                  <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Email address
                      </label>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                        placeholder="you@example.com"
                      />
                    </div>

                    {authError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        {authError}
                      </div>
                    )}

                    {authStatus === "success" && !authError && (
                      <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                        Check your email for a magic sign-in link.
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={authDisabled}
                      className="w-full rounded-lg bg-slate-900 text-white text-sm font-medium py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {authStatus === "sending"
                        ? "Sending link..."
                        : "Send magic link"}
                    </button>

                    <p className="text-[11px] text-slate-500 text-center">
                      We&apos;ll never share your email. By continuing you agree
                      to your league&apos;s rules and settings.
                    </p>
                  </form>
                </div>
              </aside>
            </section>

            {/* Footer note */}
            <footer className="border-t border-slate-200 pt-6 mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs sm:text-sm text-slate-500 max-w-lg">
                And It&apos;s No Good is the original home league that inspired
                Kicker League. This app lets anyone run their own version.
              </p>
              <Link
                href="https://anditsnogood.com"
                className="text-sm text-lime-700 hover:text-lime-800 underline underline-offset-4"
              >
                Visit the AING league site →
              </Link>
            </footer>
          </div>
        </div>
      </main>
  );
}
