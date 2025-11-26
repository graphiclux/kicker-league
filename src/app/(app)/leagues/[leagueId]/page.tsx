import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session-user";

type PageProps = {
  params: { leagueId: string };
};

type BreakdownItem = { desc: string; pts: number };

function getTeamLogoSrc(teamAbbr: string) {
  return `https://sleepercdn.com/images/team_logos/nfl/${teamAbbr.toLowerCase()}.png`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export const dynamic = "force-dynamic";

export default async function LeagueTeamPage({ params }: PageProps) {
  const leagueId = params.leagueId;
  const { userId } = await requireUserId(`/leagues/${leagueId}/team`);

  const league = await db.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      name: true,
      seasonYear: true,
    },
  });

  if (!league) {
    notFound();
  }

  const team = await db.leagueTeam.findFirst({
    where: {
      leagueId,
      ownerId: userId,
    },
    select: {
      id: true,
      nflTeam: true,
      draftSlot: true,
      owner: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  // If user has no team yet, show the claim form (defaulting to Bills)
  if (!team) {
    return (
      <div className="flex flex-col gap-6">
        
      </div>
    );
  }

  const [scores, nflTeam] = await Promise.all([
    db.score.findMany({
      where: {
        leagueId,
        leagueTeamId: team.id,
        season: league.seasonYear,
      },
      orderBy: { week: "asc" },
    }),
    db.nflTeam.findUnique({
      where: { abbr: team.nflTeam },
    }),
  ]);

  const totalPoints = scores.reduce((sum, s) => sum + (s.points ?? 0), 0);
  const latestWeek = scores.length ? scores[scores.length - 1]!.week : null;

  const kickerName = team.teamName
    ? team.teamName
    : nflTeam?.name
    ? `${nflTeam.name} kicker`
    : `${team.nflTeam} kicker`;

  const kickerInitials = getInitials(kickerName);

  return (
    <div className="flex flex-col gap-6">
      {/* Top card: team + season summary */}
      <div className="rounded-3xl border border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900/90">
              <img
                src={getTeamLogoSrc(team.nflTeam)}
                alt={`${team.nflTeam} logo`}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                My team
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                  {kickerName}
                </h2>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                  Draft slot #{team.draftSlot}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {league.name} · Season {league.seasonYear}
              </p>
            </div>
          </div>

          <div className="flex gap-6 text-right text-xs sm:text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">
                Total points
              </div>
              <div className="text-2xl font-bold text-lime-600 sm:text-3xl">
                {totalPoints}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">
                Weeks scored
              </div>
              <div className="text-base font-semibold text-slate-900 sm:text-lg">
                {scores.length}
              </div>
              {latestWeek != null && (
                <div className="text-[11px] text-slate-500">
                  Latest: week {latestWeek}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            <span className="font-medium text-slate-700">
              {team.owner.name ?? team.owner.email}
            </span>{" "}
            · Manager
          </div>
        </div>
      </div>

      {/* Weekly breakdown */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Weekly scoring
          </h3>
          {scores.length > 0 && (
            <span className="text-xs text-slate-500">
              Season {league.seasonYear}
            </span>
          )}
        </div>

        {scores.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
            No scores have been recorded for your team yet. Once plays are
            imported and scored, each week will show up here.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {scores.map((s) => {
              const breakdownRaw = (s as any).breakdown;
              const breakdown: BreakdownItem[] = Array.isArray(breakdownRaw)
                ? (breakdownRaw as BreakdownItem[])
                : [];

              return (
                <div
                  key={s.week}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900/90">
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-50">
                          {kickerInitials}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Week {s.week}
                        </div>
                        <div className="text-xs text-slate-500">
                          {kickerName}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        Points
                      </div>
                      <div className="text-xl font-bold text-lime-600">
                        {s.points}
                      </div>
                    </div>
                  </div>

                  {breakdown.length > 0 && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Breakdown
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        {breakdown.map((b, idx) => (
                          <li
                            key={idx}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="truncate">{b.desc}</span>
                            <span className="font-mono text-[11px] text-slate-800">
                              {b.pts > 0 ? `+${b.pts}` : b.pts}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
