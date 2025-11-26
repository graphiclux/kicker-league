// src/app/(app)/leagues/[leagueId]/ClaimTeamCard.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClaimTeamCard({ leagueId }: { leagueId: string }) {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!teamName.trim()) {
      setError("Please enter a team name.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/claim-team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName: teamName.trim() }),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok || !json.ok) {
        setError(json.error || "Unable to claim team. Please try again.");
      } else {
        // Reload league data (leaderboard + currentUserTeamId)
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-lime-50 to-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
      <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
        Claim your team
      </h2>
      <p className="mt-1 text-xs text-slate-600 sm:text-sm">
        You&apos;re in this league but haven&apos;t claimed a team yet. Pick a team
        name and we&apos;ll assign you a slot.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-3 flex flex-col gap-2 sm:flex-row"
      >
        <div className="flex-1">
          <input
            type="text"
            value={teamName}
            maxLength={50}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. Legatron Legends"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-200"
          />
          <p className="mt-1 text-[11px] text-slate-400">Max 50 characters.</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-xl bg-lime-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-lime-700 disabled:opacity-60 sm:text-sm"
        >
          {submitting ? "Claiming…" : "Claim team"}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-xs text-red-600 sm:text-sm">{error}</p>
      )}
    </div>
  );
}
