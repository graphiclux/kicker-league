"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    setError(null);

    const res = await signIn("email", {
      email,
      callbackUrl: "/",
      redirect: false,
    });

    if (res?.error) {
      setStatus("error");
      setError("Unable to send magic link. Please try again in a minute.");
    } else {
      setStatus("sent");
    }
  }

  const disabled = status === "sending" || status === "sent";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-slate-900/70 border border-slate-800 p-8 shadow-xl shadow-black/40 backdrop-blur">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-lime-500/10 border border-lime-500/30 text-lime-400 text-2xl">
            🥾
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in to Kicker League
          </h1>
          <p className="text-sm text-slate-400">
            No passwords. Enter your email and we&apos;ll send you a magic link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-200">
            Email address
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 outline-none focus:border-lime-400 focus:ring-2 focus:ring-lime-500/40 transition"
              placeholder="you@example.com"
            />
          </label>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {status === "sent" && (
            <p className="text-sm text-lime-400 bg-lime-950/20 border border-lime-900/50 rounded-lg px-3 py-2">
              Magic link sent. Check your email and click the link to finish
              signing in.
            </p>
          )}

          <button
            type="submit"
            disabled={disabled}
            className="w-full inline-flex items-center justify-center rounded-xl bg-lime-500 text-slate-900 text-sm font-medium px-4 py-2.5 mt-2 shadow-lg shadow-lime-500/30 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-lime-400 transition-colors"
          >
            {status === "sending"
              ? "Sending magic link..."
              : status === "sent"
              ? "Magic link sent"
              : "Send magic link"}
          </button>
        </form>

        <p className="text-xs text-center text-slate-500">
          <Link href="/" className="text-slate-300 hover:text-lime-300">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
