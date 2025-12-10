// src/app/admin/stats/page.tsx
import { db } from "@/lib/db";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
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
      take: 12, // last 12 season/week combos
    }),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Kicker League Stats Health</h1>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Latest Ingest</h2>
        <div className="border rounded-md p-4 space-y-1">
          <p>
            <strong>Last KickPlay:</strong>{" "}
            {lastKick
              ? `${format(lastKick.createdAt, "yyyy-MM-dd HH:mm:ss")} (season ${
                  lastKick.season
                }, week ${lastKick.week}, game ${lastKick.gameId})`
              : "None yet"}
          </p>
          <p>
            <strong>Last Score:</strong>{" "}
            {lastScore
              ? `${format(lastScore.createdAt, "yyyy-MM-dd HH:mm:ss")} (season ${
                  lastScore.season
                }, week ${lastScore.week})`
              : "None yet"}
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Recent Weeks (KickPlay volume)</h2>
        <div className="border rounded-md overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Season</th>
                <th className="px-3 py-2 text-left">Week</th>
                <th className="px-3 py-2 text-left">KickPlay Count</th>
              </tr>
            </thead>
            <tbody>
              {kickGroup.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-center">
                    No KickPlay data yet.
                  </td>
                </tr>
              )}
              {kickGroup.map((row) => (
                <tr key={`${row.season}-${row.week}`} className="border-t">
                  <td className="px-3 py-2">{row.season}</td>
                  <td className="px-3 py-2">{row.week}</td>
                  <td className="px-3 py-2">{row._count._all}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
