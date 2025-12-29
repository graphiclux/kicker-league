// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { getSafeCallbackUrl } from "@/lib/redirect";
import { buildMagicLinkEmail } from "@/emails/magic-link";

const enableDevLogin =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true";

/**
 * Prefer EMAIL_FROM (what your code + Vercel should use).
 * Keep AUTH_EMAIL_FROM as a fallback in case any old environments still have it.
 * Final fallback is a placeholder.
 */
const emailFrom =
  process.env.EMAIL_FROM ||
  process.env.AUTH_EMAIL_FROM ||
  "Kicker League <no-reply@example.com>";

/**
 * Resend client.
 * If RESEND_API_KEY is missing, we still instantiate but the send will fail;
 * logging below will make this obvious in Vercel Functions logs.
 */
const resend = new Resend(process.env.RESEND_API_KEY);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    // ----- Email Magic Link Provider ----- //
    EmailProvider({
      from: emailFrom,

      async sendVerificationRequest({ identifier, url, provider }) {
        // identifier = recipient email
        const to = identifier;

        // High-signal logs to confirm this function runs in the deployed environment
        console.log("[NextAuth] sendVerificationRequest START", {
          to,
          from: provider?.from ?? emailFrom,
          hasResendKey: !!process.env.RESEND_API_KEY,
          nextauthUrl: process.env.NEXTAUTH_URL ?? null,
          nodeEnv: process.env.NODE_ENV,
        });

        const { subject, html, text } = buildMagicLinkEmail({
          url,
          email: to,
          // If your template supports logoUrl, you can pass it here.
          // logoUrl: `${process.env.NEXTAUTH_URL}/aing-logo.png`,
        });

        try {
          const response = await resend.emails.send({
            from: provider?.from ?? emailFrom,
            to,
            subject,
            html,
            text,
          });

          console.log("[NextAuth] Resend response", response);

          // Resend SDK typically returns { data, error } or throws; handle both patterns safely.
          const anyResp = response as any;
          if (anyResp?.error) {
            console.error("[NextAuth] Resend error object:", anyResp.error);
            throw new Error(
              typeof anyResp.error?.message === "string"
                ? anyResp.error.message
                : "Resend returned an error."
            );
          }
        } catch (err) {
          console.error(
            "[NextAuth] Failed to send magic link email via Resend:",
            err
          );
          // Throw so NextAuth returns an error (and logs EMAIL_SEND_ERROR)
          throw new Error("Error sending magic link email.");
        }
      },
    }),

    // ----- Dev-only Credentials Provider ----- //
    ...(enableDevLogin
      ? [
          CredentialsProvider({
            id: "email-login",
            name: "Dev Email Login",
            credentials: {
              email: {
                label: "Email",
                type: "email",
                placeholder: "dev@example.com",
              },
            },
            async authorize(credentials) {
              const email = credentials?.email?.toLowerCase().trim();
              if (!email) return null;

              let user = await prisma.user.findUnique({
                where: { email },
              });

              if (!user) {
                user = await prisma.user.create({
                  data: { email },
                });
              }

              return user;
            },
          }),
        ]
      : []),
  ],

  pages: {
    verifyRequest: "/auth/check-email",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async redirect({ url, baseUrl }) {
      try {
        // Internal relative URLs
        if (url.startsWith("/")) {
          const safe = getSafeCallbackUrl(url, "/dashboard");
          return `${baseUrl}${safe}`;
        }

        // Same-origin absolute URLs
        const parsed = new URL(url);
        const base = new URL(baseUrl);

        if (parsed.origin === base.origin) {
          const safe = getSafeCallbackUrl(
            parsed.pathname + parsed.search,
            "/dashboard"
          );
          return `${base.origin}${safe}`;
        }

        // External URLs are not allowed
        return `${baseUrl}/dashboard`;
      } catch {
        return `${baseUrl}/dashboard`;
      }
    },

    async session({ session, token }) {
      if (session?.user && token?.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },

  logger: {
    error(code, metadata) {
      console.error("NextAuth Error:", code, metadata);
    },
    warn(code) {
      console.warn("NextAuth Warning:", code);
    },
    debug(code, metadata) {
      if (enableDevLogin) {
        console.log("NextAuth Debug:", code, metadata);
      }
    },
  },
};
