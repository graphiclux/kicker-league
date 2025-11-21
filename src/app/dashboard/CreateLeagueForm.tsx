"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CreateLeagueForm({ defaultSeason }: { defaultSeason: number }) {
  const [name, setName] = useState("");
  const [seasonYear, setSeasonYear] = useState(defaultSeason.toString());
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          seasonYear: Number(seasonYear),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setStatus("error");
        setError(data.error || "Failed to create league.");
        return;
      }

      // Go to the league page (assuming /leagues/[id] exists)
      router.push(`/leagues/${data.league.id}`);
    } catch (err) {
      console.error("Create league exception:", err);
      setStatus("error");
      setError("Something went wrong. Please try again.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-300">
          League name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 outline-none focus:border-lime-400 focus:ring-2 focus:ring-lime-500/40 transition"
          placeholder="Thursday Night Footers"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-300">
          Season year
        </label>
        <input
          type="number"
          required
          value={seasonYear}
          onChange={(e) => setSeasonYear(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 outline-none focus:border-lime-400 focus:ring-2 focus:ring-lime-500/40 transition"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/60 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full inline-flex items-center justify-center rounded-xl bg-lime-500 text-slate-900 text-sm font-medium px-4 py-2.5 mt-1 shadow-lg shadow-lime-500/30 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-lime-400 transition-colors"
      >
        {status === "submitting" ? "Creating..." : "Create league"}
      </button>
    </form>
  );
}
