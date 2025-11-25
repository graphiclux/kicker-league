import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { getSafeCallbackUrl } from "@/lib/redirect";
import { buildMagicLinkEmail } from "@/emails/magic-link";

const resend = new Resend(process.env.RESEND_API_KEY);
const emailFrom = process.env.AUTH_EMAIL_FROM || "auth@kickerleague.app";

// Dev login toggle
const enableDevLogin =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    // -------- Email Provider (Magic Link) -------- //
    EmailProvider({
      from: emailFrom,

      async sendVerificationRequest({ identifier, url }) {
        const { subject, html, text } = buildMagicLinkEmail({ url });

        await resend.emails.send({
          from: emailFrom,
          to: identifier,
          subject,
          html,
          text,
        });
      },
    }),

    // -------- Dev-only Credentials Provider -------- //
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

              // Create if not exists
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

  // -------- Custom Pages -------- //
  pages: {
    verifyRequest: "/auth/check-email",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    // ----- Secure Redirect Handling ----- //
    async redirect({ url, baseUrl }) {
      try {
        // Internal relative URLs
        if (url.startsWith("/")) {
          const safe = getSafeCallbackUrl(url, "/dashboard");
          return `${baseUrl}${safe}`;
        }

        // Absolute same-origin URLs
        const parsed = new URL(url);
        const root = new URL(baseUrl);

        if (parsed.origin === root.origin) {
          const safe = getSafeCallbackUrl(
            parsed.pathname + parsed.search,
            "/dashboard"
          );
          return `${root.origin}${safe}`;
        }

        // Reject external URLs
        return `${baseUrl}/dashboard`;
      } catch {
        return `${baseUrl}/dashboard`;
      }
    },

    // ----- Expose user.id in the session ----- //
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },

  // -------- Server-side Auth Logging -------- //
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
