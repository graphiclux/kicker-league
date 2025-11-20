import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
// If you want to keep working on email auth later, we can re-enable this:
// import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "./db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  secret: process.env.AUTH_SECRET,

  session: {
    strategy: "database",
  },

  providers: [
    // --- DEV: passwordless credentials login using email only ---
    CredentialsProvider({
      id: "dev-email",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email?.toString().trim().toLowerCase();
        if (!rawEmail) return null;

        // Find or create the user
        let user = await db.user.findUnique({
          where: { email: rawEmail },
        });

        if (!user) {
          user = await db.user.create({
            data: {
              email: rawEmail,
              name: rawEmail.split("@")[0],
            },
          });
        }

        return { id: user.id, email: user.email, name: user.name ?? null };
      },
    }),

    // --- FUTURE: real magic-link email login with Resend ---
    /*
    EmailProvider({
      from: process.env.EMAIL_FROM!,
      maxAge: 60 * 60 * 24,
      async sendVerificationRequest({ identifier, url }) {
        // We'll re-enable this once we can see server logs and Resend HTTP errors.
      },
    }),
    */
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

  debug: true,
};

export default authOptions;
