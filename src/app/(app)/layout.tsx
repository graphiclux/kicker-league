// src/app/(app)/layout.tsx
import type { ReactNode } from "react";
import { requireUserId } from "@/lib/session-user";
import Link from "next/link";

type AppLayoutProps = {
  children: ReactNode;
};

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: AppLayoutProps) {
  // Require auth for everything in the (app) group
  const { session } = await requireUserId();
  const user = session.user as any;

  const name: string = user?.name || "Coach";
  const email: string | undefined = user?.email || undefined;

  const initials =
    name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Subtle background stripe to mimic Dribbble-style depth */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-lime-100/60 via-emerald-50/70 to-transparent" />
      </div>

      <div className="flex min-h-screen flex-col">
        {/* Top navigation */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
            {/* Left: Logo + app name */}
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lime-500/10 shadow-sm ring-1 ring-lime-400/50"
              >
                {/* Simple kicker icon */}
                <div className="relative h-6 w-6">
                  <span className="absolute inset-0 rounded-full border-2 border-lime-500" />
                  <span className="absolute left-1/2 top-1/2 h-4 w-[2px] -translate-x-1/2 -translate-y-1/2 rotate-12 rounded-full bg-lime-500" />
                </div>
              </Link>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                    Kicker League
                  </span>
                  <span className="rounded-full bg-lime-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-700">
                    Beta
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Manage your kicker-only fantasy leagues.
                </p>
              </div>
            </div>

            {/* Right: user info */}
            <div className="flex items-center gap-3">
              <div className="hidden text-right text-xs sm:block">
                <div className="font-medium text-slate-900">{name}</div>
                {email && (
                  <div className="text-[11px] text-slate-500">{email}</div>
                )}
              </div>

              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-lime-400 to-lime-500 text-xs font-bold text-white shadow">
                  {initials}
                </div>

                {/* Simple sign-out form using next-auth route */}
                <form action="/api/auth/signout" method="post" className="hidden sm:block">
                  <button
                    type="submit"
                    className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </div>
        </header>

        {/* Main content container */}
        <main className="mx-auto flex w-full max-w-6xl flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
