// src/lib/session-user.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSafeCallbackUrl } from "@/lib/redirect";

/**
 * Legacy-style helper used by the (app) layout.
 *
 * Returns the full session and userId string if authenticated.
 * If not authenticated, redirects to "/" with a safe callbackUrl.
 */
export async function requireUserId(callbackPath?: string) {
  // Must only be used server-side (e.g., in layouts, server components)
  if (typeof window !== "undefined") {
    throw new Error("requireUserId() must not be used in Client Components.");
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ?? null;

  if (!userId) {
    // Use the same safe redirect pattern as the rest of the app
    const raw = callbackPath || "/";
    const safe = getSafeCallbackUrl(raw, "/dashboard");

    const search = new URLSearchParams({
      callbackUrl: safe,
    }).toString();

    redirect(`/?${search}`);
  }

  return { session: session!, userId: String(userId) };
}
