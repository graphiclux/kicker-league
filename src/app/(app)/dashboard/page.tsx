// src/app/(app)/dashboard/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { CreateLeagueForm } from "./CreateLeagueForm";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = (await getCurrentUser()) as any;

  if (!user?.id) {
    // Not logged in → send back to landing
    redirect("/");
  }

  const userId: string = user.id;

  // Leagues where this user is commissioner, member, or owner of a team
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
    orderBy: {
      createdAt: "desc",
    },
  });

  const thisSeason = new Date().getFullYear();

  return (
    <div className="space-y-8">
      {/* Hero / quick actions */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white/80 px-4 py-5 shadow-sm sm:flex-row sm:items-center sm:px-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
            Welcome back{user?.name ? `, ${user.name}` : ""} ⚡
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Choose a league to dive into standings, your team, or this week&apos;s
            matchups.
          </p>
        </div>

        {/* Create-league form */}
        <div className="w-full max-w-xs sm:w-auto">
          <CreateLeagueForm defaultSeason={thisSeason} />
        </div>
      </div>

      {/* My Leagues section */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            My leagues
          </h2>
          {leagues.length > 0 && (
            <span className="text-xs text-slate-500">
              {leagues.length} active {leagues.length === 1 ? "league" : "leagues"}
            </span>
          )}
        </div>

        {leagues.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            You&apos;re not in any leagues yet.
            <br />
            <span className="text-xs text-slate-500">
              Use the form above to spin up your first Kicker League.
            </span>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols3">
            {leagues.map((league) => {
              const isCommissioner = league.commissionerId === userId;
              return (
                <Link
                  key={league.id}
                  href={`/leagues/${league.id}`}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-lime-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {league.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Season {league.seasonYear} · {league._count.teams} teams ·{" "}
                        {league._count.members} managers
                      </div>
                    </div>
                    {isCommissioner && (
                      <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-50">
                        Commish
                      </span>
                    )}
                  </div>

                  <div className="mt-4 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                      View league
                    </span>{" "}
                    <span className="text-slate-400 group-hover:text-lime-600">
                      · standings, team, matchups
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
