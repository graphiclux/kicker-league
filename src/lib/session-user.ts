// src/lib/session-user.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireUserId() {
  // Uses NextAuth v4 getServerSession with our authOptions
  const session = await getServerSession(authOptions);

  const userId = (session?.user as any)?.id ?? null;

  if (!userId) {
    // Not logged in → send them to the login page
    redirect("/login"); // this matches your existing /login page
  }

  return { session, userId: String(userId) };
}
