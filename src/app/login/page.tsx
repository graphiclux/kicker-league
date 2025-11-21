"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";

type Status = "idle" | "sending" | "sent" | "error";

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
      const res = await signIn("email", {
        email,
        callbackUrl: "/dashboard",
        redirect: false,
      });

      console.log("signIn(email) result:", res);

      if (res?.error) {
        console.error("NextAuth email error:", res.error);
        setError("Unable to send login email. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("sent");
    } catch (err) {
      console.error("signIn(email) threw:", err);
      setError("Unable to send login email. Please try again later.");
      setStatus("error");
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

        {status === "sent" ? (
          <p className="text-sm text-lime-300">
            Check your email for a magic link to sign in.
          </p>
        ) : (
          <>
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
              {status === "sending"
                ? "Sending magic link..."
                : "Send magic link"}
            </button>
          </>
        )}
      </form>
    </main>
  );
}
