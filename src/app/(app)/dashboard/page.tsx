// src/app/(app)/dashboard/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    // Not logged in → send back to landing (or /login if you prefer)
    redirect("/");
  }

  const userId = user.id;

  // Fetch leagues where this user is commissioner, member, or owner of a team
  const leagues = await prisma.league.findMany({
    where: {
      OR: [
        { commissionerId: userId },
        { members: { some: { id: userId } } },          // 👈 FIXED HERE
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

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage your kicker leagues, teams, and scoring.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/leagues/new"
            className="inline-flex items-center rounded-full bg-lime-500 px-4 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 hover:bg-lime-400 transition-colors"
          >
            Create a new league
          </Link>
        </div>
      </div>

      {/* Leagues list */}
      <div className="space-y-3">
        {leagues.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
            You&apos;re not in any leagues yet.
            <br />
            <Link
              href="/leagues/new"
              className="mt-2 inline-flex text-xs font-semibold text-lime-600 hover:text-lime-500"
            >
              Create your first league
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {leagues.map((league) => {
              const isCommissioner = league.commissionerId === userId;
              const teamCount = league._count.teams;
              const memberCount = league._count.members;

              return (
                <Link
                  key={league.id}
                  href={`/leagues/${league.id}?season=${league.seasonYear}&week=1`}
                  className="group rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 shadow-sm hover:border-lime-400 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-sm sm:text-base font-semibold text-slate-900 group-hover:text-slate-950">
                          {league.name}
                        </h2>
                        <p className="text-[11px] text-slate-500">
                          Season {league.seasonYear} • Max {league.maxTeams}{" "}
                          teams
                        </p>
                      </div>
                      {isCommissioner && (
                        <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Commissioner
                        </span>
                      )}
                    </div>

                    <div className="flex gap-4 text-[11px] text-slate-600">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">
                          {teamCount}
                        </span>
                        <span className="text-slate-500">Teams</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">
                          {memberCount}
                        </span>
                        <span className="text-slate-500">Members</span>
                      </div>
                    </div>

                    <div className="mt-1 text-[11px] text-slate-400">
                      Click to view weekly scoring &amp; leaderboard →
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
