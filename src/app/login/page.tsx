"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await signIn("email", {
      email,
      callbackUrl: "/dashboard", // after clicking magic link, go here
      redirect: false,
    });

    if (res?.error) {
      console.error(res.error);
      setError("Unable to send login email. Please try again.");
    } else {
      setSent(true);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4"
      >
        <h1 className="text-xl font-semibold">Sign in</h1>

        {sent ? (
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
                className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/70 rounded px-2 py-1">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-lime-500 py-2 text-sm font-semibold text-slate-950 hover:bg-lime-400"
            >
              Send magic link
            </button>
          </>
        )}
      </form>
    </main>
  );
}
