"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const res = await signIn("email", { email, redirect: false });
    if (!res?.error) setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      <form
        onSubmit={submit}
        className="bg-black/40 p-10 rounded-xl shadow-xl w-96 space-y-6"
      >
        <h1 className="text-2xl font-bold">Sign in</h1>

        {sent ? (
          <p className="text-green-400">
            Check your email for your magic login link.
          </p>
        ) : (
          <>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded bg-black/20 border border-white/20"
            />
            <button
              type="submit"
              className="w-full py-2 bg-lime-400 text-black font-semibold rounded hover:bg-lime-300"
            >
              Send magic link
            </button>
          </>
        )}
      </form>
    </div>
  );
}
