// src/lib/session.ts
import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";
import { getSafeCallbackUrl } from "@/lib/redirect";

/**
 * Fetches the current authenticated user in a Server Component or server route.
 * Returns `null` if not authenticated.
 */
export const getCurrentUser = cache(async () => {
  // getServerSession must run ONLY on the server
  if (typeof window !== "undefined") {
    throw new Error("getCurrentUser() must not be used in Client Components.");
  }

  const session = await getServerSession(authOptions);

  if (!session || !session.user) return null;

  // Ensure user has an id (NextAuth with JWT strategy always sets token.sub)
  const user = {
    ...session.user,
    id: (session.user as any).id ?? null,
  };

  return user;
});

/**
 * Ensures the user is authenticated in a Server Component.
 * Redirects unauthenticated requests to "/" with a safe callback URL.
 *
 * @param callbackPath - The path to return to after login (defaults to "/").
 */
export async function requireUser(callbackPath?: string) {
  const user = await getCurrentUser();

  if (!user) {
    const raw = callbackPath || "/";
    const safe = getSafeCallbackUrl(raw, "/dashboard");

    const search = new URLSearchParams({
      callbackUrl: safe,
    }).toString();

    redirect(`/?${search}`);
  }

  return user;
}
