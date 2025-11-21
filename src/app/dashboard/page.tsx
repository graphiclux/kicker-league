// src/app/dashboard/page.tsx
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
    console.error("[Dashboard] Failed to load leagues", err);

    loadError =
      "We couldn't load your leagues from the database. Please try again in a moment.";

    if (err && typeof err === "object") {
      if ("message" in err && typeof err.message === "string") {
        loadErrorDetail = err.message;
      } else {
        try {
          loadErrorDetail = JSON.stringify(err);
        } catch {
          loadErrorDetail = String(err);
        }
      }
    } else {
      loadErrorDetail = String(err);
    }

    leagues = [];
  }

  const hasLeagues = leagues.length > 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              And It&apos;s No Good
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Your leagues
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              See every kicker-only league you&apos;re in, and create new ones
              when inspiration (or trash talk) strikes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:inline">
              Start a new league
            </span>
            <NewLeagueButton />
          </div>
        </header>

        {/* Error message if DB failed */}
        {loadError && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 space-y-1">
            <div>{loadError}</div>
            {loadErrorDetail && (
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-slate-950/60 p-2 text-[10px] text-amber-200">
{loadErrorDetail}
              </pre>
            )}
          </div>
        )}

        {/* Content */}
        {hasLeagues ? (
          <section className="grid gap-4 sm:grid-cols-2">
            {leagues.map((league) => {
              const isCommissioner = league.commissionerId === userId;
              const memberCount = league.members.length;
              const teamCount = league.teams.length;

              return (
                <Link
                  key={league.id}
                  href={`/leagues/${league.id}`}
                  className="group rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.9)] transition hover:border-lime-400/70 hover:bg-slate-900/90"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="text-sm font-semibold text-slate-50 group-hover:text-lime-200">
                        {league.name}
                      </h2>
                      <p className="text-xs text-slate-400">
                        Season{" "}
                        <span className="font-medium text-lime-300">
                          {league.seasonYear}
                        </span>
                      </p>
                    </div>

                    {isCommissioner && (
                      <span className="inline-flex items-center rounded-full bg-lime-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-lime-300 ring-1 ring-inset ring-lime-500/40">
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
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                        {memberCount} member{memberCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] text-lime-300 group-hover:text-lime-200">
                      Open league
                      <span aria-hidden>↗</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </section>
        ) : !loadError ? (
          <EmptyState />
        ) : null}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
      <h2 className="text-lg font-medium text-slate-100">
        You&apos;re not in any leagues yet.
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        Create your first kicker-only league and you&apos;ll become its
        commissioner.
      </p>
      <div className="mt-4 flex justify-center">
        <NewLeagueButton />
      </div>
    </div>
  );
}
