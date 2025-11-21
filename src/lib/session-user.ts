// src/lib/session-user.ts
import { auth } from "@/auth"; // adjust if your auth file is in a different place
import { redirect } from "next/navigation";

export async function requireUserId() {
  const session = await auth();

  const rawUser = session?.user as any;

  const userId =
    rawUser?.id ??
    rawUser?.userId ??
    rawUser?.sub ??
    null;

  if (!userId) {
    // Not logged in → send them back to sign in
    redirect("/auth/signin"); // change to your actual sign-in route if different
  }

  return { session, userId: String(userId) };
}
