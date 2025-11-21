// src/lib/session-user.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireUserId() {
  const session = await getServerSession(authOptions);

  const userId = (session?.user as any)?.id;

  if (!userId) {
    redirect("/login");
  }

  return { session, userId };
}
