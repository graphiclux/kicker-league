// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
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

        // 🚧 DEV-ONLY: no DB, just fabricate a user from the email.
        // The "id" is deterministic so requireUserId() still works.
        const name = email.split("@")[0] || "User";

        return {
          id: email,        // use email as a stable ID for now
          email,
          name,
        };
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
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
        (session.user as any).id = token.sub; // expose "id" (email) to server
      }
      return session;
    },
  },

  // Helpful while we’re wiring everything up
  debug: process.env.NODE_ENV !== "production",
};

export default authOptions;
