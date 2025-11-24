// src/app/(app)/dashboard/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session-user";
import { NewLeagueButton } from "./NewLeagueButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await requireUserId();

  let leagues:
    | Awaited<ReturnType<typeof prisma.league.findMany>>
    | [] = [];
  let loadError: string | null = null;
  let loadErrorDetail: string | null = null;

  try {
    leagues = await prisma.league.findMany({
      where: {
        OR: [
          { commissionerId: userId },
          { members: { some: { id: userId } } },
        ],
      },
      include: {
        commissioner: true,
        members: true,
        teams: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (err: any) {
    console.error("[Dashboard] DB Error:", err);

    loadError =
      "We couldn’t load your leagues from the database. Please try again shortly.";

    if (err && typeof err === "object" && "message" in err) {
      loadErrorDetail = err.message;
    } else {
      loadErrorDetail = String(err);
    }

    leagues = [];
  }

  const isEmpty = !loadError && leagues.length === 0;

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Hero Section */}
      <section className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/90 px-6 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.9)] sm:px-8 sm:py-7">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          
          {/* Left side of hero */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-lime-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-lime-200">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />
              <span>Season Hub</span>
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Your Leagues
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-400">
                See all your kicker-only leagues and easily create new ones.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                Active leagues:{" "}
                <span className="font-semibold text-slate-50">
                  {leagues.length}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                Current season:{" "}
                <span className="font-semibold">
                  {new Date().getFullYear()}
                </span>
              </span>
            </div>
          </div>

          {/* Right CTA block */}
          <div className="flex flex-col items-stretch gap-3 sm:w-64">
            <div className="text-xs text-slate-500">Start a new league</div>

            <div className="inline-flex items-center justify-between rounded-2xl bg-lime-400 px-4 py-3 text-sm font-semibold text-black shadow-[0_20px_60px_rgba(190,242,100,0.45)]">
              <div className="flex flex-col">
                <span>Create New League</span>
                <span className="text-[11px] font-normal text-black/70">
                  You&apos;ll be the commissioner
                </span>
              </div>
              <span className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-base">
                +
              </span>
            </div>

            <div className="self-start">
              <NewLeagueButton />
            </div>
          </div>
        </div>
      </section>

      {/* Error Display */}
      {loadError && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-xs text-amber-100 shadow-[0_18px_45px_rgba(0,0,0,0.9)]">
          <div>{loadError}</div>
          {loadErrorDetail && (
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-950/60 p-2 text-[10px] text-amber-200">
              {loadErrorDetail}
            </pre>
          )}
        </div>
      )}

      {/* Your Leagues Section */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Your Leagues
          </h2>
          <span className="text-xs text-slate-500">Sorted by newest</span>
        </div>

        {!isEmpty && leagues.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leagues.map((league) => {
              const isCommissioner = league.commissionerId === userId;
              const teamCount = league.teams.length;
              const memberCount = league.members.length;

              return (
                <Link
                  key={league.id}
                  href={`/leagues/${league.id}`}
                  className="group rounded-2xl border border-slate-800/80 bg-slate-900/80 px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-lime-400/70 hover:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-slate-50 group-hover:text-lime-200">
                        {league.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Season{" "}
                        <span className="font-medium text-lime-300">
                          {league.seasonYear}
                        </span>
                      </p>
                    </div>

                    {isCommissioner && (
                      <span className="inline-flex items-center rounded-full bg-lime-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-lime-200 ring-1 ring-inset ring-lime-500/40">
                        Commissioner
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                        {teamCount} team{teamCount === 1 ? "" : "s"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                        {memberCount} member{memberCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <span className="opacity-60 group-hover:opacity-100">
                      Open →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : !loadError ? (
          <EmptyState />
        ) : null}
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-2 rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center shadow-[0_18px_60px_rgba(0,0,0,0.9)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-2xl">
        🦵
      </div>
      <h2 className="mt-4 text-lg font-medium text-slate-100">
        You&apos;re not in any leagues yet.
      </h2>
      <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">
        Create your first kicker-only league and start tracking kicks.
      </p>
      <div className="mt-4 flex justify-center">
        <NewLeagueButton />
      </div>
    </div>
  );
}
