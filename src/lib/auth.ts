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
      sendVerificationRequest: async ({ identifier, url }) => {
        try {
          await resend.emails.send({
            from: process.env.EMAIL_FROM!,
            to: identifier,
            subject: "Your magic login link",
            html: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>And It’s No Good – Login</h2>
                <p>Click the link below to sign in:</p>
                <a href="${url}" 
                   style="display:inline-block;
                          padding:12px 20px;
                          background:#a3ff12;
                          color:#000;
                          border-radius:8px;
                          text-decoration:none;">
                  Sign in
                </a>
                <p style="margin-top:20px; font-size:12px; opacity:0.7;">
                  This link expires in 10 minutes.
                </p>
              </div>
            `,
          });
        } catch (err) {
          console.error("Resend error:", err);
          throw new Error("Email could not be sent");
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
};
