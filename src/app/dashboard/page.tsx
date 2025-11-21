import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreateLeagueForm } from "./CreateLeagueForm";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; email?: string } | undefined;

  if (!user?.id) {
    redirect("/login");
  }

  const userId = user.id;

  const leagues = await db.league.findMany({
    where: {
      OR: [
        { commissionerId: userId },
        { members: { some: { id: userId } } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const defaultSeason = now.getFullYear();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-lime-500/10 border border-lime-400/40 text-xl">
            🥾
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Your Kicker Leagues
            </h1>
            <p className="text-xs text-slate-400">
              Welcome back, {user.email}.
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-lime-300 transition-colors"
        >
          Home
        </Link>
      </header>

      <section className="flex-1 px-6 py-6 grid gap-6 lg:grid-cols-[2fr,1.2fr] max-w-6xl mx-auto w-full">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">
            Leagues you&apos;re in
          </h2>

          {leagues.length === 0 ? (
            <p className="text-sm text-slate-400">
              You&apos;re not in any leagues yet. Create one on the right to
              become commissioner.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {leagues.map((league) => (
                <Link
                  key={league.id}
                  href={`/leagues/${league.id}`}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-lime-400/60 hover:bg-slate-900 transition-colors"
                >
                  <div className="text-sm font-medium text-slate-50">
                    {league.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Season {league.seasonYear}
                  </div>
                  <div className="mt-2 text-[11px] uppercase tracking-wide text-slate-500">
                    {league.commissionerId === userId
                      ? "Commissioner"
                      : "League Member"}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-sm font-semibold text-slate-200">
            Create a new league
          </h2>
          <p className="text-xs text-slate-400 mb-1">
            You&apos;ll be the commissioner and own one kicker team. Invite
            others later by sharing a join link.
          </p>

          <CreateLeagueForm defaultSeason={defaultSeason} />
        </aside>
      </section>
    </main>
  );
}
