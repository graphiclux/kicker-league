// src/app/(app)/leagues/[leagueId]/team/ClaimTeamCard.tsx
"use client";

import { FormEvent, useState } from "react";

export function ClaimTeamCard({
  leagueId,
  defaultNflTeam = "BUF",
}: {
  leagueId: string;
  defaultNflTeam?: string;
}) {
  const [teamName, setTeamName] = useState("Bills Mafia");
  const [nflTeam, setNflTeam] = useState(defaultNflTeam);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);

    try {
      const res = await fetch(`/api/leagues/${leagueId}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nflTeam,
          teamName,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save team");
      }

      // Reload to show the newly created/updated team
      window.location.reload();
    } catch (err: any) {
      setStatus("error");
      setError(err?.message ?? "Something went wrong.");
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
      <h2 className="text-base font-semibold text-slate-900">
        Claim your team
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Pick your NFL kicker and name your squad. For now, we&apos;ll default you
        to the Buffalo Bills.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-sm">
        <div>
          <label className="block text-xs font-medium text-slate-700">
            NFL team (kicker slot)
          </label>
          <select
            value={nflTeam}
            onChange={(e) => setNflTeam(e.target.value.toUpperCase())}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/40"
          >
            {/* For now, a small subset. You can expand this or pull from your NFLTeams table. */}
            <option value="BUF">BUF - Buffalo Bills</option>
            <option value="KC">KC - Kansas City Chiefs</option>
            <option value="BAL">BAL - Baltimore Ravens</option>
            <option value="SF">SF - San Francisco 49ers</option>
            <option value="PHI">PHI - Philadelphia Eagles</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            Team name
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Bills Mafia"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/40"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "saving"}
          className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-50 shadow-sm hover:bg-slate-800 disabled:opacity-70"
        >
          {status === "saving" ? "Saving..." : "Save my team"}
        </button>
      </form>
    </div>
  );
}
