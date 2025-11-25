// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Force Node runtime (Prisma + NextAuth need Node, not edge)
export const runtime = "nodejs";

// Make sure this route is always dynamic; don't try to pre-render/SSG it
export const dynamic = "force-dynamic";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
