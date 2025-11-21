import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";

export const authOptions: NextAuthOptions = {
  // Use AUTH_SECRET if set; otherwise fall back to NEXTAUTH_SECRET
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },

  providers: [
    CredentialsProvider({
      id: "email-login",
      name: "Dev Email Login",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const raw = credentials?.email;
        const email =
          typeof raw === "string" ? raw.trim().toLowerCase() : "";

        if (!email) return null;

        // Find or create a real User in Prisma
        let user = await db.user.findUnique({
          where: { email },
        });

        if (!user) {
          user = await db.user.create({
            data: {
              email,
              name: email.split("@")[0],
            },
          });
        }

        // This object becomes `user` in jwt/session callbacks
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
        };
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, copy Prisma user into the token
      if (user) {
        token.sub = user.id as string;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = (token.email as string) ?? undefined;
        session.user.name = (token.name as string) ?? undefined;
        (session.user as any).id = token.sub; // expose Prisma user id
      }
      return session;
    },
  },

  debug: true,
};

export default authOptions;
