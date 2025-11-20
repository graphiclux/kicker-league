import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { Resend } from "resend";

import { db } from "./db";

const resend = new Resend(process.env.RESEND_API_KEY);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  secret: process.env.AUTH_SECRET,

  session: {
    strategy: "database",
  },

  providers: [
    EmailProvider({
      // We let *our* function send the email via Resend HTTP API
      from: process.env.EMAIL_FROM!,
      maxAge: 60 * 60 * 24, // 24 hours

      async sendVerificationRequest({ identifier, url }) {
        try {
          if (!process.env.RESEND_API_KEY) {
            throw new Error("Missing RESEND_API_KEY env var");
          }
          if (!process.env.EMAIL_FROM) {
            throw new Error("Missing EMAIL_FROM env var");
          }

          const { error } = await resend.emails.send({
            from: process.env.EMAIL_FROM!,
            to: identifier,
            subject: "Sign in to Kicker League",
            html: `
              <p>Hi,</p>
              <p>Click the button below to sign in to <strong>Kicker League</strong>:</p>
              <p><a href="${url}" style="
                display:inline-block;
                background:#a3e635;
                color:#020617;
                padding:10px 18px;
                border-radius:999px;
                text-decoration:none;
                font-weight:600;
              ">Sign in</a></p>
              <p>Or copy and paste this link into your browser:</p>
              <p><a href="${url}">${url}</a></p>
              <p>If you didn&apos;t request this email, you can ignore it.</p>
            `,
            text: `Sign in to Kicker League:\n${url}\n\nIf you didn't request this, you can ignore this email.`,
          });

          if (error) {
            console.error("[NextAuth/Resend] Email send error:", error);
            throw error;
          }
        } catch (err) {
          console.error("[NextAuth] sendVerificationRequest failed:", err);
          throw err;
        }
      },
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

  // Extra logging to Vercel if something still goes wrong
  debug: true,
  events: {
    error(error) {
      console.error("[NextAuth event error]", error);
    },
  },
};
