import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// ✅ Force this route to run on the Node.js runtime (required for Prisma)
export const runtime = "nodejs";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
