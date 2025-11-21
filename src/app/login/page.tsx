"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";

type Status = "idle" | "sending" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === "sending") return;

    setError(null);
    setStatus("sending");

    try {
      const res = await signIn("email-login", {
        email,
        callbackUrl: "/dashboard",
        redirect: false,
      });

      console.log("signIn(email-login) result:", res);

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
        // Success → go to dashboard
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
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4"
      >
        <h1 className="text-xl font-semibold">Sign in</h1>

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
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/80 focus:border-lime-400"
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/70 rounded px-2 py-1">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={disabled}
          className="w-full rounded-lg bg-lime-500 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-lime-500/40 hover:bg-lime-400 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          {status === "sending" ? "Signing you in..." : "Sign in"}
        </button>

        <p className="mt-2 text-[11px] text-slate-500">
          Dev mode: no magic link — entering your email signs you in directly.
        </p>
      </form>
    </main>
  );
}
