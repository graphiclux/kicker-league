// src/app/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

type Status = "idle" | "sending" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    setError(null);

    try {
      const res = await signIn("email-login", {
        email,
        callbackUrl: "/dashboard",
        redirect: false,
      });

      console.log("signIn result:", res);

      if (!res) {
        setStatus("error");
        setError("Unknown error from sign-in.");
        return;
      }

      if (res.error) {
        console.error("Credentials sign-in error:", res.error);
        setStatus("error");
        setError("Unable to sign in. Please try again.");
      } else {
        // success → go to dashboard
        window.location.href = res.url ?? "/dashboard";
      }
    } catch (err) {
      console.error("Credentials sign-in exception:", err);
      setStatus("error");
      setError("Unable to sign in. Please try again later.");
    }
  }

  const disabled = status === "sending";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-slate-950/70 border border-slate-800 p-8 shadow-xl shadow-black/40 backdrop-blur">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-lime-500/10 border border-lime-500/30 text-lime-400 text-2xl">
            🥾
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in to Kicker League
          </h1>
          <p className="text-sm text-slate-400">
            Dev login: enter your email and we&apos;ll log you in directly (no
            magic link).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-xs font-medium text-slate-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={disabled}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/80 focus:border-lime-500"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/70 rounded-md px-2 py-1">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={disabled}
            className="flex w-full items-center justify-center rounded-lg bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-lime-500/40 transition hover:bg-lime-400 disabled:opacity-60"
          >
            {status === "sending" ? "Signing you in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
