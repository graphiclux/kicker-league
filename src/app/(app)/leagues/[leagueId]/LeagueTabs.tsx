// src/app/(app)/leagues/[leagueId]/LeagueTabs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    key: "league",
    label: "League",
    href: (id: string) => `/leagues/${id}`,
  },
  {
    key: "team",
    label: "Team",
    href: (id: string) => `/leagues/${id}/team`,
  },
  {
    key: "matchups",
    label: "Matchups",
    href: (id: string) => `/leagues/${id}/matchups`,
  },
  {
    key: "rules",
    label: "Rules",
    href: (id: string) => `/leagues/${id}/rules`,
  },
  {
    key: "activity",
    label: "Activity",
    href: (id: string) => `/leagues/${id}/activity`,
  },
];

export function LeagueTabs({ leagueId }: { leagueId: string }) {
  const pathname = usePathname();

  return (
    <div className="flex overflow-x-auto border-b border-slate-200">
      <nav className="flex min-w-max gap-2">
        {tabs.map((tab) => {
          const href = tab.href(leagueId);
          const isActive =
            tab.key === "league"
              ? pathname === `/leagues/${leagueId}` ||
                pathname === `/leagues/${leagueId}/`
              : pathname.startsWith(href);

          return (
            <Link
              key={tab.key}
              href={href}
              className={[
                "relative inline-flex items-center gap-1 rounded-t-xl px-3 py-2 text-xs sm:text-sm",
                isActive
                  ? "border-x border-t border-slate-200 bg-white text-slate-900 shadow-[0_-1px_0_0_#ffffff]"
                  : "text-slate-500 hover:text-slate-800",
              ].join(" ")}
            >
              <span>{tab.label}</span>
              {tab.key === "matchups" && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                  Weekly
                </span>
              )}
              {(tab.key === "rules" || tab.key === "activity") && (
                <span className="rounded-full bg-slate-50 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-slate-400">
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
