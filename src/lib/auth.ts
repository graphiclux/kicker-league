import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "./db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  secret: process.env.AUTH_SECRET,

  session: {
    strategy: "database",
  },

  providers: [
    EmailProvider({
      // ✅ Resend SMTP via structured config
      server: {
        host: "smtp.resend.com",
        port: 587,
        auth: {
          user: "resend",
          pass: process.env.RESEND_API_KEY!, // we'll set this in Vercel
        },
      },
      from: process.env.EMAIL_FROM!, // also set in Vercel
      maxAge: 60 * 60 * 24,
    }),
  ],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        (session.user as any).id = user.id;
      }
      return session;
    },
  },
};

// for the app route
export default authOptions;
