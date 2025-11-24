// app/dashboard/NewLeagueButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewLeagueButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Give your league a name.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), seasonYear }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong.");
      }

      if (!data?.id) {
        throw new Error("Missing league id from server.");
      }

      router.push(`/leagues/${data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create league.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-lime-500/40 transition hover:bg-lime-400 active:translate-y-px"
      >
        <span className="text-lg leading-none">＋</span>
        <span>New League</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2"
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="League name"
        className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
      />

      <input
        type="number"
        value={seasonYear}
        onChange={(e) =>
          setSeasonYear(
            Number.isNaN(Number(e.target.value))
              ? new Date().getFullYear()
              : Number(e.target.value),
          )
        }
        className="w-20 rounded-md bg-slate-950/60 px-2 py-1 text-center text-sm text-slate-100 focus:outline-none"
      />

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-lime-500 px-3 py-1.5 text-xs font-semibold text-slate-950 disabled:opacity-60"
      >
        {loading ? "Creating..." : "Create"}
      </button>

      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-slate-400 hover:text-slate-200"
      >
        Cancel
      </button>

      {error && (
        <p className="ml-2 text-xs text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
