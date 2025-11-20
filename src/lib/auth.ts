import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import EmailProvider from "next-auth/providers/email";
import { db } from "./db";

/**
 * Central Auth.js / NextAuth config
 *
 * - Email-only, passwordless "magic link" login
 * - Uses Prisma adapter with your existing database
 *
 * ENV you must set:
 *   AUTH_SECRET       = long random string
 *   EMAIL_SERVER      = SMTP connection string
 *   EMAIL_FROM        = From address, e.g. "Kicker League <no-reply@yourdomain.com>"
 */
export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db) as any,
  secret: process.env.AUTH_SECRET,

  session: {
    strategy: "database", // store sessions in DB via Prisma
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
      // Make sure we always have a user.id in the session
      if (session.user) {
        (session.user as any).id = user.id;
      }
      return session;
    },
  },
});
