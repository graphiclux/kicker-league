// lib/session-user.ts
import { auth } from "@/auth"; // adjust path if needed
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
    redirect("/auth/signin"); // or whatever your sign-in route is
  }

  return { session, userId: String(userId) };
}
