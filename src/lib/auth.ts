// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { Resend } from "resend";
import { buildMagicLinkEmail } from "@/emails/magic-link";

const resend = new Resend(process.env.RESEND_API_KEY);

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
  },

  providers: [
    // 1) Real magic-link email provider (Resend)
    EmailProvider({
      id: "email",
      name: "Email",
      from: process.env.EMAIL_FROM,
      maxAge: 24 * 60 * 60, // 24 hours

      async sendVerificationRequest({ identifier, url, provider }) {
        if (!process.env.RESEND_API_KEY) {
          console.error(
            "[NextAuth] RESEND_API_KEY is not set – cannot send magic link email."
          );
          throw new Error("Email service not configured.");
        }

        // We’ll build a logo URL off NEXTAUTH_URL if it’s set
        const baseUrl = process.env.NEXTAUTH_URL ?? "";
        const logoUrl =
          baseUrl && baseUrl.startsWith("http")
            ? `${baseUrl.replace(/\/+$/, "")}/aing-logo.png`
            : undefined;

        const { subject, html, text } = buildMagicLinkEmail({
          url,
          email: identifier,
          logoUrl,
        });

        const from =
          provider.from ??
          process.env.EMAIL_FROM ??
          "Kicker League <no-reply@example.com>";

        try {
          const response = await resend.emails.send({
            from,
            to: identifier,
            subject,
            html,
            text,
          });

          if ("error" in response && response.error) {
            console.error(
              "[NextAuth] Resend error sending magic link:",
              response.error
            );
            throw new Error("Error sending magic link email.");
          }
        } catch (err) {
          console.error(
            "[NextAuth] Failed to send magic link email via Resend:",
            err
          );
          throw new Error("Error sending magic link email.");
        }
      },
    }),

    // 2) Dev-only "email-login" credentials provider (no email sent)
    CredentialsProvider({
      id: "email-login",
      name: "Dev Email Login",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "coach@example.com",
        },
      },
      async authorize(credentials) {
        const raw = credentials?.email ?? "";
        const email = raw.trim().toLowerCase();

        if (!email) {
          return null;
        }

        // Simple sanity check; this doesn't have to be perfect.
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          return null;
        }

        // Use email as the stable user id
        return {
          id: email,
          email,
          name: email.split("@")[0] || "Coach",
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
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

  // Helpful while we're wiring everything up
  debug: process.env.NODE_ENV !== "production",
};

export default authOptions;
