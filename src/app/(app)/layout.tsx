// src/app/(app)/layout.tsx
import type { ReactNode } from "react";
import { requireUserId } from "@/lib/session-user";
import Link from "next/link";

type AppLayoutProps = {
  children: ReactNode;
};

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: AppLayoutProps) {
  // Require auth for everything in the (app) group
  const { session } = await requireUserId();
  const user = session.user as any;

  const name: string = user?.name || "Coach";
  const email: string | undefined = user?.email || undefined;

  const initials =
    name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Subtle background stripe to mimic Dribbble-style depth */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-lime-100/60 via-emerald-50/70 to-transparent" />
      </div>

      <div className="flex min-h-screen flex-col">
        {/* Top navigation */}
        <header
  className="sticky top-0 z-30 border-b border-slate-200"
  style={{ backgroundColor: "#faf8f4" }}
>
  <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
    {/* Left: AING logo links back to dashboard */}
    <Link href="/dashboard" className="relative h-16 w-16 sm:h-20 sm:w-20">
      {/* If you want, you can switch to next/image like on the landing page */}
      <span className="sr-only">Go to dashboard</span>
      <img
        src="/aing-logo.png"
        alt="And It's No Good logo"
        className="h-full w-full object-contain"
      />
    </Link>

    {/* Right: user info + nav */}
    <div className="flex items-center gap-4">
      <span className="hidden text-sm font-medium text-slate-700 sm:inline">
        {user?.email}
      </span>
      <Link
        href="/dashboard"
        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:border-lime-400 hover:text-lime-700 transition-colors"
      >
        Dashboard
      </Link>
      <form action="/api/auth/signout" method="post">
        <button
          type="submit"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-900 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  </div>
</header>


        {/* Main content container */}
        <main className="mx-auto flex w-full max-w-6xl flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
