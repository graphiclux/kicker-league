// src/app/(app)/layout.tsx
import type { ReactNode } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session-user";

type AppLayoutProps = {
  children: ReactNode;
};

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: AppLayoutProps) {
  // Require auth for everything in the (app) group
  const { session, userId } = await requireUserId("/dashboard");
  const user = session.user as { name?: string | null; email?: string | null };

  // All leagues this user is involved with (commish, member, or owner of a team)
  const leagues = await prisma.league.findMany({
    where: {
      OR: [
        { commissionerId: userId },
        { members: { some: { id: userId } } },
        { teams: { some: { ownerId: userId } } },
      ],
    },
    include: {
      _count: {
        select: {
          teams: true,
          members: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="relative min-h-screen bg-[#faf8f4] text-slate-900">
      {/* Soft gradient wash behind everything */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-lime-100/60 via-emerald-50/70 to-transparent" />
      </div>

      <div className="flex min-h-screen flex-col">
        {/* Top navigation */}
        <header
          className="sticky top-0 z-30 border-b border-slate-200"
          style={{ backgroundColor: "#faf8f4" }}
        >
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            {/* Left: logo + app title */}
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="relative h-10 w-10 sm:h-12 sm:w-12"
              >
                <span className="sr-only">Go to dashboard</span>
                <img
                  src="/aing-logo.png"
                  alt="And It&apos;s No Good logo"
                  className="h-full w-full object-contain"
                />
              </Link>

              <div className="hidden flex-col sm:flex">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-700">
                  Kicker League
                </span>
                <span className="text-sm text-slate-500">
                  Built from the chaos of And It&apos;s No Good
                </span>
              </div>
            </div>

            {/* Right: user, nav, logout */}
            <div className="flex items-center gap-4">
              <nav className="hidden items-center gap-4 text-sm font-medium text-slate-700 sm:flex">
                <Link
                  href="/dashboard"
                  className="rounded-full px-3 py-1.5 hover:bg-slate-100"
                >
                  Dashboard
                </Link>
              </nav>

              <div className="hidden text-sm text-slate-700 sm:block">
                {user?.name || user?.email}
              </div>

              <form method="post" action="/api/auth/signout">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-lime-400 hover:bg-lime-50 hover:text-lime-700"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>

          {/* Mobile “Dashboard / My Leagues” row */}
          <div className="border-t border-slate-200 bg-[#faf8f4] px-4 py-2 sm:hidden">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-50"
              >
                Dashboard
              </Link>

              {leagues.length > 0 && (
                <details className="group relative w-40 text-xs">
                  <summary className="list-none cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700">
                    My leagues
                  </summary>
                  <div className="absolute right-0 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                    <div className="max-h-64 space-y-1 overflow-y-auto">
                      {leagues.map((league) => (
                        <Link
                          key={league.id}
                          href={`/leagues/${league.id}`}
                          className="block rounded-lg px-2 py-1 hover:bg-slate-50"
                        >
                          <div className="truncate font-medium text-slate-900">
                            {league.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {league.seasonYear} · {league._count.teams} teams
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </details>
              )}
            </div>
          </div>
        </header>

        {/* Main area: sidebar + content */}
        <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          {/* Desktop sidebar */}
          <aside className="hidden w-64 shrink-0 md:block">
            <div className="sticky top-[5.5rem] flex flex-col gap-6">
              {/* Overview section */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Overview
                </div>
                <nav className="mt-2 space-y-1 text-sm">
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-white hover:shadow-sm"
                  >
                    <span className="font-medium text-slate-800">Dashboard</span>
                  </Link>
                </nav>
              </div>

              {/* My Leagues list */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <span>My leagues</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    {leagues.length}
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-sm">
                  {leagues.length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-500">
                      You&apos;re not in any leagues yet.
                    </p>
                  )}

                  {leagues.map((league) => (
                    <Link
                      key={league.id}
                      href={`/leagues/${league.id}`}
                      className="block rounded-xl px-3 py-2 hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">
                            {league.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {league.seasonYear} · {league._count.teams} teams
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Route content */}
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
