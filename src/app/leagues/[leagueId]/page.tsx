// app/leagues/[leagueId]/page.tsx
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session-user";
import { notFound } from "next/navigation";

interface LeaguePageProps {
  params: { leagueId: string };
}

export default async function LeaguePage({ params }: LeaguePageProps) {
  const leaguePath = `/leagues/${params.leagueId}`;
  const { userId, session } = await requireUserId(leaguePath);

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

  // ...rest of your file unchanged
}
