// src/lib/auth.ts
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "./db";
import { Resend } from "resend";
import EmailProvider from "next-auth/providers/email";
import type { NextAuthOptions } from "next-auth";

const resend = new Resend(process.env.RESEND_API_KEY);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),

  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
  },

  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM,
      maxAge: 10 * 60, // 10 minutes
      async sendVerificationRequest({ identifier, url }) {
        const from = process.env.EMAIL_FROM;
        const apiKey = process.env.RESEND_API_KEY;

        if (!from || !apiKey) {
          console.error(
            "[Auth] EMAIL_FROM or RESEND_API_KEY is missing; cannot send email.",
          );
          // Do NOT throw here – just bail silently so signIn still resolves.
          return;
        }

        const { host } = new URL(url);

        const html = `
          <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:24px;background:#020617;color:#e5e7eb;">
            <h1 style="font-size:20px;margin-bottom:12px;">And It's No Good</h1>
            <p style="font-size:14px;margin-bottom:16px;">
              Click the button below to sign in to <strong>${host}</strong>.
            </p>
            <p style="margin-bottom:24px;">
              <a href="${url}"
                 style="
                   display:inline-block;
                   padding:10px 18px;
                   border-radius:999px;
                   background:#a3e635;
                   color:#020617;
                   font-weight:600;
                   text-decoration:none;
                 ">
                Sign in
              </a>
            </p>
            <p style="font-size:12px;opacity:0.7;">
              If you did not request this email, you can safely ignore it.
            </p>
          </div>
        `;

        try {
          await resend.emails.send({
            from,
            to: identifier,
            subject: "Sign in to And It's No Good",
            html,
          });
        } catch (err) {
          console.error("[Auth] Resend email send failed:", err);
          // Again: do NOT throw – we want signIn to resolve on the client.
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
};
