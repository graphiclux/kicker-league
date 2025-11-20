// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";

/**
 * Auth config for next-auth v4 + App Router.
 * We use:
 *  - EmailProvider for passwordless magic-link login
 *  - PrismaAdapter with your existing Prisma client
 *  - Database sessions
 *
 * Required env vars:
 *   AUTH_SECRET
 *   EMAIL_SERVER  (e.g. smtp://user:pass@smtp.host.com:587)
 *   EMAIL_FROM    (e.g. 'Kicker League <no-reply@yourdomain.com>')
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  secret: process.env.AUTH_SECRET,

  session: {
    strategy: "database",
  },

  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER!,
      from: process.env.EMAIL_FROM!,
      maxAge: 60 * 60 * 24, // magic link valid for 24h
    }),
  ],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async session({ session, user }) {
      // Ensure we always expose the user id in the session
      if (session.user && user) {
        (session.user as any).id = user.id;
      }
      return session;
    },
  },
};
