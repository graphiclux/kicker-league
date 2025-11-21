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
                          background:#a3f
