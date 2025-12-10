// src/app/admin/stats/page.tsx
import { db } from "@/lib/db";
import { format } from "date-fns";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  // --- Auth guard ---------------------------------------------------------
  const user = (await getCurrentUser()) as any;

  if (!user?.id) {
    redirect("/");
  }

  // Optional: restrict to specific admin emails via env
  const rawAdminEmails = process.env.ADMIN_EMAILS || "";
  const adminEmails = rawAdminEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const userEmail = (user.email || "").toLowerCase();

  if (adminEmails.length > 0 && !adminEmails.includes(userEmail)) {
    // Logged in but not in the admin list
    redirect("/");
  }

  // --- Data fetching ------------------------------------------------------
  const [lastKick, lastScore, kickGroup] = await Promise.all([
    db.kickPlay.findFirst({
      orderBy: { createdAt: "desc" },
    }),
    db.score.findFirst({
      orderBy: { createdAt: "desc" },
    }),
    db.kickPlay.groupBy({
      by: ["season", "week"],
      _count: { _all: true },
      orderBy: [{ season: "desc" }, { week: "desc" }],
      take: 12,
    }),
  ]);

  // --- UI -----------------------------------------------------------------
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Kicker League Stats Health
          </h1>
          <p className="text-sm text-slate-400">
            Internal diagnostics for SportsBlaze ingest and weekly scoring.
          </p>
        </header>

        {/* Latest Ingest */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Latest Ingest</h2>
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm space-y-1 shadow-lg shadow-black/40">
            <p>
              <span className="font-semibold text-slate-300">
                Last KickPlay:
              </span>{" "}
              {lastKick ? (
                <>
                  {format(lastKick.createdAt, "yyyy-MM-dd HH:mm:ss")}{" "}
                  <span className="text-slate-400">
                    (season {lastKick.season}, week {lastKick.week}, game{" "}
                    {lastKick.gameId})
                  </span>
                </>
              ) : (
                <span className="text-slate-500">None yet</span>
              )}
            </p>

            <p>
              <span className="font-semibold text-slate-300">
                Last Score:
              </span>{" "}
              {lastScore ? (
                <>
                  {format(lastScore.createdAt, "yyyy-MM-dd HH:mm:ss")}{" "}
                  <span className="text-slate-400">
                    (season {lastScore.season}, week {lastScore.week})
                  </span>
                </>
              ) : (
                <span className="text-slate-500">None yet</span>
              )}
            </p>
          </div>
        </section>

        {/* Recent Weeks Table */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            Recent Weeks <span className="text-slate-400">(KickPlay volume)</span>
          </h2>

          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/80 shadow-lg shadow-black/40">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-800/90">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-100">
                    Season
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-100">
                    Week
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-100">
                    KickPlay Count
                  </th>
                </tr>
              </thead>
              <tbody>
                {kickGroup.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-4 text-center text-slate-400"
                    >
                      No KickPlay data yet.
                    </td>
                  </tr>
                )}

                {kickGroup.map((row, index) => (
                  <tr
                    key={`${row.season}-${row.week}`}
                    className={
                      "border-t border-slate-800 " +
                      (index % 2 === 0
                        ? "bg-slate-900"
                        : "bg-slate-900/70")
                    }
                  >
                    <td className="px-4 py-2.5 text-slate-100">
                      {row.season}
                    </td>
                    <td className="px-4 py-2.5 text-slate-100">
                      {row.week}
                    </td>
                    <td className="px-4 py-2.5 text-slate-100">
                      {row._count._all}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
