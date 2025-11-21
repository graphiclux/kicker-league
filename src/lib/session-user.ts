// src/lib/session-user.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Require an authenticated user on the server.
 * Returns { session, userId } where userId is the Prisma User.id (from token.sub).
 * Redirects to /login if not signed in.
 */
export async function requireUserId() {
  const session = await getServerSession(authOptions);

  const userId = (session?.user as any)?.id ?? null;

  if (!userId) {
    // Not logged in → send them to your login page
    redirect("/login");
  }

  return { session: session!, userId: String(userId) };
}
