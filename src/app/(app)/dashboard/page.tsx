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
      <section className="rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-slate-200 px-6 py-6 sm:px-8 sm:py-7">
  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

    {/* Left */}
    <div className="space-y-3">
      <div className="inline-flex items-center gap-2 rounded-full bg-lime-200/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-lime-800 border border-lime-300">
        <span className="h-1.5 w-1.5 rounded-full bg-lime-700" />
        <span>Season Hub</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Your Leagues
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-500">
          Manage all your kicker-only leagues from one clean dashboard.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 border border-slate-200">
          <span className="h-1.5 w-1.5 rounded-full bg-lime-600" />
          Active leagues:{" "}
          <span className="font-semibold text-slate-900">{leagues.length}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 border border-slate-200">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
          Current season:{" "}
          <span className="font-semibold">{new Date().getFullYear()}</span>
        </span>
      </div>
    </div>

    {/* Right CTA */}
    <div className="flex flex-col items-stretch gap-3 sm:w-64">
      <div className="text-xs text-slate-500">Start a new league</div>

      <div className="inline-flex items-center justify-between rounded-2xl bg-lime-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-lime-300/40">
        <div className="flex flex-col">
          <span>Create New League</span>
          <span className="text-[11px] font-normal text-white/80">
            You&apos;ll be the commissioner
          </span>
        </div>
        <span className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg">
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
  className="group block rounded-2xl bg-white border border-slate-200 shadow-[0_6px_25px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all p-5"
>
  <div className="flex items-start justify-between gap-3">
    <div className="space-y-1">
      <h3 className="text-base font-semibold text-slate-900 group-hover:text-lime-700 transition">
        {league.name}
      </h3>
      <p className="text-xs text-slate-500">
        Season{" "}
        <span className="font-medium text-slate-700">{league.seasonYear}</span>
      </p>
    </div>

    {league.commissionerId === userId && (
      <span className="inline-flex items-center rounded-full bg-lime-200/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-lime-800 border border-lime-300">
        Commish
      </span>
    )}
  </div>

  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
    <div className="flex items-center gap-4">
      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-lime-600" />
        {league.teams.length} teams
      </span>

      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
        {league.members.length} members
      </span>
    </div>

    <span className="text-slate-400 group-hover:text-lime-700 transition">
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
