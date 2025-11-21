// app/leagues/[leagueId]/page.tsx
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session-user";
import { notFound } from "next/navigation";

interface LeaguePageProps {
  params: { leagueId: string };
}

export default async function LeaguePage({ params }: LeaguePageProps) {
  const { userId, session } = await requireUserId();

  const league = await prisma.league.findUnique({
    where: { id: params.leagueId },
    include: {
      commissioner: true,
      members: true,
      teams: {
        include: {
          owner: true,
        },
      },
    },
  });

  if (!league) {
    notFound();
  }

  const isCommissioner = league.commissionerId === userId;
  const userTeam = league.teams.find((t) => t.ownerId === userId) ?? null;
  const isMember = league.members.some((m) => m.id === userId);

  const displayName =
    (session.user as any)?.name ??
    (session.user as any)?.email ??
    "You";

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Kicker League
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {league.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center rounded-full bg-slate-900/80 px-2.5 py-0.5 ring-1 ring-slate-700/80">
                Season{" "}
                <span className="ml-1 font-semibold text-lime-300">
                  {league.seasonYear}
                </span>
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-900/80 px-2.5 py-0.5 ring-1 ring-slate-700/80">
                Commissioner{" "}
                <span className="ml-1 font-medium text-slate-200">
                  {league.commissioner.name ?? league.commissioner.email}
                </span>
              </span>
            </div>
          </div>

          {isCommissioner && (
            <span className="inline-flex items-center rounded-full bg-lime-500/10 px-3 py-1 text-xs font-semibold text-lime-400 ring-1 ring-inset ring-lime-500/40">
              You are the commissioner
            </span>
          )}
        </header>

        {/* Layout: teams + members / sidebar */}
        <section className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
          {/* Left side: Teams + members */}
          <div className="space-y-4">
            {/* Teams */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-100">
                  Teams
                </h2>
                <span className="text-xs text-slate-500">
                  {league.teams.length} team
                  {league.teams.length === 1 ? "" : "s"}
                </span>
              </div>

              {league.teams.length === 0 ? (
                <p className="mt-3 text-xs text-slate-400">
                  No teams yet.{" "}
                  {isCommissioner
                    ? "Use the commissioner tools to start adding teams."
                    : "Waiting on the commissioner to set things up."}
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {league.teams.map((team) => {
                    const isUsersTeam = team.ownerId === userId;

                    return (
                      <li
                        key={team.id}
                        className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2 text-sm"
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-slate-100">
                            {team.nflTeam}
                          </span>
                          <span className="truncate text-xs text-slate-500">
                            {team.owner
                              ? `Owner: ${
                                  team.owner.name ?? team.owner.email
                                }`
                              : "Unassigned"}
                          </span>
                        </div>
                        {isUsersTeam && (
                          <span className="ml-3 inline-flex items-center rounded-full bg-lime-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-lime-300 ring-1 ring-inset ring-lime-500/40">
                            Your team
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Members */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="text-sm font-semibold text-slate-100">
                League members
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {league.members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2 text-xs"
                  >
                    <span className="truncate text-slate-200">
                      {member.name ?? member.email}
                    </span>
                    {member.id === league.commissionerId && (
                      <span className="ml-3 inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-lime-300">
                        Commissioner
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right side: Your status + commissioner tools */}
          <aside className="space-y-4">
            {/* Your status */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="text-sm font-semibold text-slate-100">
                Your status
              </h2>
              <p className="mt-2 text-xs text-slate-400">
                {displayName},{" "}
                <span className="font-semibold text-lime-300">
                  {isCommissioner
                    ? "you are the commissioner of this league."
                    : isMember
                    ? "you are a member of this league."
                    : "you are not currently in this league."}
                </span>
              </p>

              {userTeam ? (
                <div className="mt-3 rounded-lg bg-slate-950/80 px-3 py-2 text-xs">
                  <p className="text-slate-400">Your team</p>
                  <p className="mt-1 font-medium text-slate-100">
                    {userTeam.nflTeam}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  You don&apos;t have a team yet. Team creation is coming next.
                </p>
              )}
            </div>

            {/* Commissioner tools (placeholder) */}
            {isCommissioner && (
              <div className="rounded-xl border border-lime-500/40 bg-slate-900/80 p-4 shadow-[0_0_25px_rgba(190,242,100,0.15)]">
                <h2 className="text-sm font-semibold text-lime-300">
                  Commissioner tools
                </h2>
                <p className="mt-2 text-xs text-slate-300">
                  Actions only you can take. We&apos;ll wire these up next.
                </p>
                <ul className="mt-3 space-y-2 text-xs text-slate-100">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                    Invite players to this league
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                    Create & assign league teams
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                    Configure scoring & season rules
                  </li>
                </ul>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
