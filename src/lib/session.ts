// src/lib/session.ts
import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";

export const getCurrentUser = cache(async () => {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
});

/**
 * Require a logged-in user in a Server Component.
 * If no user, redirect to / with a callback back to the current path.
 */
export async function requireUser(callbackPath?: string) {
  const user = await getCurrentUser();
  if (!user) {
    const target = callbackPath || "/";
    const search = new URLSearchParams({
      callbackUrl: target,
    }).toString();
    redirect(`/?${search}`);
  }

  return user;
}
