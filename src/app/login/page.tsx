"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { getSafeCallbackUrl } from "@/lib/redirect";

export const dynamic = "force-dynamic";

type Status = "idle" | "sending" | "error";

const isDevEnv =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const callbackUrlParam = searchParams.get("callbackUrl");
  const callbackUrl = getSafeCallbackUrl(callbackUrlParam, "/dashboard");

  // In production, this page should not be used.
  useEffect(() => {
    if (!isDevEnv) {
      router.replace("/");
    }
  }, [router]);

  if (!isDevEnv) {
    return null;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === "sending") return;

    setStatus("sending");
    setError(null);

    try {
      const trimmed = email.trim().toLowerCase();

      const res = await signIn("email-login", {
        email: trimmed,
        redirect: true,
        callbackUrl,
      });

      // In most cases redirect: true will navigate away,
      // but if it doesn't, we check for an error:
      if (res && res.error) {
        console.error("[Dev Login] signIn error:", res.error);
        setStatus("error");
        setError("There was a problem signing you in. Please try again.");
      }
    } catch (err) {
      console.error("[Dev Login] signIn exception:", err);
      setStatus("error");
      setError("There was a problem signing you in. Please try again.");
    } finally {
      setStatus((prev) => (prev === "sending" ? "idle" : prev));
    }
  }

  const disabled = status === "sending";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4"
      >
        <h1 className="text-xl font-semibold">Dev sign in</h1>

        <p className="text-xs text-slate-400">
          This page uses the{" "}
          <code className="px-1 rounded bg-slate-800 text-[11px]">
            email-login
          </code>{" "}
          credentials provider. It is only intended for development and will
          redirect away in production.
        </p>

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
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
            placeholder="dev@example.com"
          />
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded px-2 py-1.5">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={disabled}
          className="w-full rounded-lg bg-lime-500 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-colors hover:bg-lime-400"
        >
          {status === "sending" ? "Signing you in..." : "Sign in"}
        </button>

        <p className="mt-2 text-[11px] text-slate-500">
          Dev mode: no magic link — entering your email signs you in directly
          using the dev credentials provider.
        </p>
      </form>
    </main>
  );
}
