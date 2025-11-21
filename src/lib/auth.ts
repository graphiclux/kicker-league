import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  // Use JWT-based sessions (no DB)
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },

  providers: [
    CredentialsProvider({
      id: "dev-email",
      name: "Dev Email Login",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const raw = credentials?.email;
        const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";

        if (!email) return null;

        // Dev-only: treat the email itself as the user identity
        const name = email.split("@")[0];

        return {
          id: email,     // use email as the "id" in the token
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
      // On first sign-in, copy user info into the token
      if (user) {
        token.sub = user.id as string;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        session.user.name = (token.name as string) ?? null;
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },

  debug: true,
};

export default authOptions;
