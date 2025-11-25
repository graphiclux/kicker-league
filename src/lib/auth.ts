// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { getSafeCallbackUrl } from "@/lib/redirect";
import { buildMagicLinkEmail } from "@/emails/magic-link";

const resend = new Resend(process.env.RESEND_API_KEY);

// You can tweak this if you want a different default
const emailFrom = process.env.AUTH_EMAIL_FROM || "auth@kickerleague.app";

const enableDevLogin =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    // ----- Email Magic Link Provider ----- //
    EmailProvider({
      from: emailFrom,
      async sendVerificationRequest({ identifier, url }) {
        // identifier = email
        const { subject, html, text } = buildMagicLinkEmail({
          url,
          email: identifier,
        });

        await resend.emails.send({
          from: emailFrom,
          to: identifier,
          subject,
          html,
          text,
        });
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
