// src/app/(app)/leagues/[leagueId]/layout.tsx
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session-user";
import { LeagueTabs } from "./LeagueTabs";

type LeagueLayoutProps = {
  children: ReactNode;
  params: { leagueId: string };
};

export const dynamic = "force-dynamic";

export default async function LeagueLayout({
  children,
  params,
}: LeagueLayoutProps) {
  const { userId } = await requireUserId(`/leagues/${params.leagueId}`);

  const league = await prisma.league.findFirst({
    where: {
      id: params.leagueId,
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
  });

  if (!league) {
    notFound();
  }

  const isCommissioner = league.commissionerId === userId;

  return (
    <div className="flex flex-col gap-4">
      {/* League header card */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:px-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/dashboard"
              className="text-slate-500 hover:text-slate-700"
            >
              Dashboard
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">Leagues</span>
            <span className="text-slate-300">/</span>
            <span className="max-w-[180px] truncate font-medium text-slate-800 sm:max-w-xs">
              {league.name}
            </span>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
            {league.name}
          </h1>
          <p className="text-xs text-slate-500">
            Season {league.seasonYear} · {league._count.teams} teams ·{" "}
            {league._count.members} managers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {isCommissioner && (
            <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-50">
              Commissioner
            </span>
          )}
        </div>
      </div>

      {/* Tabs nav */}
      <LeagueTabs leagueId={league.id} />

      {/* Active tab content */}
      <div className="mt-3">{children}</div>
    </div>
  );
}
