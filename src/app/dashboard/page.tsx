// app/dashboard/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session-user";
import { NewLeagueButton } from "./NewLeagueButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId, session } = await requireUserId();

  const leagues = await prisma.league.findMany({
    where: {
      OR: [
        { commissionerId: userId },
        { members: { some: { id: userId } } },
      ],
    },
    include: {
      members: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const displayName =
    (session.user as any)?.name ??
    (session.user as any)?.email ??
    "Coach";

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Welcome back
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {displayName}&apos;s Kicker Leagues
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              See all leagues you&apos;re in and spin up new ones you commission.
            </p>
          </div>
          <NewLeagueButton />
        </header>

        {leagues.length === 0 ? (
          <EmptyState />
        ) : (
          <section className="grid gap-4 sm:grid-cols-2">
            {leagues.map((league) => {
              const isCommissioner = league.commissionerId === userId;

              return (
                <Link
                  key={league.id}
                  href={`/leagues/${league.id}`}
                  className="group rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-md shadow-black/40 transition hover:border-lime-400/80 hover:bg-slate-900 hover:shadow-lg hover:shadow-lime-500/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-medium group-hover:text-lime-300">
                        {league.name}
                      </h2>
                      <p className="mt-1 text-xs uppercase tracking-widest text-slate-500">
                        Season {league.seasonYear}
                      </p>
                    </div>

                    {isCommissioner && (
                      <span className="inline-flex items-center rounded-full bg-lime-500/10 px-2 py-0.5 text-[11px] font-semibold text-lime-400 ring-1 ring-inset ring-lime-500/40">
                        Commissioner
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    Click to view league details, teams, and commissioner tools.
                  </p>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="mt-12 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
      <h2 className="text-lg font-medium text-slate-100">
        You&apos;re not in any leagues yet.
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        Create your first Kicker League and you&apos;ll become its commissioner.
      </p>
      <div className="mt-4 flex justify-center">
        <NewLeagueButton />
      </div>
    </div>
  );
}
