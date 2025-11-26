// src/app/(app)/leagues/[leagueId]/team/page.tsx
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session-user";
import { ClaimTeamCard } from "../ClaimTeamCard";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: { leagueId: string };
}) {
  const { userId } = await requireUserId();
  const leagueId = params.leagueId;

  const league = await db.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: true,
    },
  });

  if (!league) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <p className="text-sm text-slate-600">League not found.</p>
      </div>
    );
  }

  const userTeam = league.teams.find((t) => t.ownerId === userId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
          Your team in {league.name}
        </h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          This is your roster slot in this league.
        </p>
      </div>

      {!userTeam && <ClaimTeamCard leagueId={leagueId} />}

      {userTeam && (
        <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
            {userTeam.teamName || `${userTeam.nflTeam} kicker`}
          </h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Draft slot #{userTeam.draftSlot} · NFL team {userTeam.nflTeam}
          </p>
          {/* In a later task we can pull season + weekly stats for this team here */}
        </div>
      )}
    </div>
  );
}
