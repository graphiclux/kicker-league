import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { db } from './db';
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export const token = () => randomBytes(48).toString('base64url');
export const publicUser = (u: any) => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  role: u.role,
  verifiedAt: u.verifiedAt,
  notificationsEnabled: u.notificationsEnabled,
});
export const passwordHash = (p: string) =>
  argon2.hash(p, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3 });
export async function identify(access: string) {
  try {
    const claims = jwt.verify(access, process.env.JWT_ACCESS_SECRET!, {
      algorithms: ['HS256'],
      issuer: 'aing',
      audience: 'aing-clients',
    }) as jwt.JwtPayload;
    const u = await db.user.findUnique({ where: { id: claims.sub } });
    const s = await db.session.findUnique({ where: { id: claims.sid } });
    if (!u || u.deletedAt || u.suspended || !s || s.userId !== u.id || s.revokedAt || s.expiresAt < new Date())
      throw new Error();
    return u;
  } catch {
    throw new UnauthorizedException('Session expired. Please sign in.');
  }
}
export function cookies(res: any, access: string, refresh: string) {
  const options = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    path: '/api',
  };
  res.cookie('aing_access', access, { ...options, maxAge: 15 * 60 * 1000 });
  res.cookie('aing_refresh', refresh, { ...options, path: '/api/auth', maxAge: 30 * 86400000 });
}
export function clearCookies(res: any) {
  res.clearCookie('aing_access', { path: '/api' });
  res.clearCookie('aing_refresh', { path: '/api/auth' });
}
export function accessFor(userId: string, sessionId: string) {
  return jwt.sign({ sid: sessionId }, process.env.JWT_ACCESS_SECRET!, {
    subject: userId,
    issuer: 'aing',
    audience: 'aing-clients',
    expiresIn: '15m',
    algorithm: 'HS256',
  });
}
export async function newSession(user: any, res: any) {
  const refresh = token();
  const s = await db.session.create({
    data: {
      userId: user.id,
      tokenHash: hash(refresh),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    },
  });
  const access = accessFor(user.id, s.id);
  cookies(res, access, refresh);
  return { user: publicUser(user), accessToken: access, refreshToken: refresh };
}
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const access = req.headers.authorization?.replace(/^Bearer /, '') || req.cookies?.aing_access;
    if (!access) throw new UnauthorizedException('Please sign in');
    req.user = await identify(access);
    return true;
  }
}
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    if (ctx.switchToHttp().getRequest().user?.role !== 'SUPER_ADMIN')
      throw new ForbiddenException('Super Admin access required');
    return true;
  }
}
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export async function sendAuthMail(user: any, purpose: 'VERIFY' | 'RESET') {
  const raw = token();
  await db.authToken.create({
    data: { userId: user.id, hash: hash(raw), purpose, expiresAt: new Date(Date.now() + 3600000) },
  });
  const transport = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 1025),
    secure: process.env.MAIL_SECURE === 'true',
    ...(process.env.MAIL_USER
      ? { auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD } }
      : {}),
  });
  const url = `${process.env.WEB_URL}/?action=${purpose.toLowerCase()}&token=${raw}`;
  const subject = purpose === 'VERIFY'
    ? "Verify your And It's No Good account"
    : "Reset your And It's No Good password";
  const isVerify = purpose === 'VERIFY';
  const greeting = user.displayName ? `Hey ${escapeHtml(user.displayName)},` : 'Hey there,';
  const title = isVerify ? 'One tiny step before the misses begin.' : 'A fresh start for your bad ideas.';
  const copy = isVerify
    ? 'Confirm your email and you’re cleared to draft one glorious kicking position.'
    : 'Use the button below to choose a new password and get back to the wrong side of the uprights.';
  const button = isVerify ? 'Verify my email' : 'Reset my password';
  const text = `${isVerify ? 'Verify your email' : 'Reset your password'}: ${url}\nThis link expires in one hour.\n\nAnd It’s No Good. — Fantasy football. Questionable footwork.`;
  const html = `<!doctype html><html><body style="margin:0;background:#101318;color:#f2f4f7;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(title)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#101318;padding:32px 14px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#1a1f27;border:1px solid #2a3039;border-radius:18px;overflow:hidden"><tr><td style="padding:28px 30px 20px;border-bottom:1px solid #2a3039"><span style="display:inline-block;background:#f5c451;color:#101318;border-radius:9px;padding:10px 12px;font-size:20px;font-weight:900;transform:rotate(-4deg)">⚑</span><span style="display:inline-block;margin-left:12px;vertical-align:top;padding-top:4px;color:#f2f4f7;font-size:13px;font-weight:800;letter-spacing:.6px;line-height:1.15">AND IT’S<br><span style="font-size:20px;letter-spacing:-.7px">NO GOOD.</span></span></td></tr><tr><td style="padding:34px 30px 28px"><div style="color:#f5c451;font-size:11px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;margin-bottom:14px">${isVerify ? 'WELCOME TO THE WRONG SIDE' : 'THE UPRIGHTS HAVE SPOKEN'}</div><h1 style="margin:0 0 18px;color:#f2f4f7;font-size:30px;line-height:1.15;letter-spacing:-.8px">${escapeHtml(title)}</h1><p style="margin:0 0 10px;color:#f2f4f7;font-size:16px;line-height:1.5">${greeting}</p><p style="margin:0 0 26px;color:#a7afbb;font-size:15px;line-height:1.6">${escapeHtml(copy)}</p><a href="${escapeHtml(url)}" style="display:inline-block;background:#f5c451;color:#101318;text-decoration:none;border-radius:9px;padding:14px 20px;font-size:15px;font-weight:800">${button} &nbsp;↗</a><p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #2a3039;color:#8e959f;font-size:12px;line-height:1.6">This link expires in one hour. If you didn’t ask for this, you can safely ignore it. No kicks were harmed in the making of this email.</p></td></tr><tr><td style="padding:18px 30px;background:#101318;color:#8e959f;font-size:11px;letter-spacing:.5px">AND IT’S NO GOOD · ONE POSITION. ALL SEASON. EVERY MISS.</td></tr></table></td></tr></table></body></html>`;
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
  if (postmarkToken) {
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': postmarkToken,
      },
      body: JSON.stringify({
        From: process.env.MAIL_FROM,
        To: user.email,
        Subject: subject,
        TextBody: text,
        MessageStream: process.env.POSTMARK_MESSAGE_STREAM || 'outbound',
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Postmark rejected the email (${response.status}): ${detail.slice(0, 300)}`);
    }
    return;
  }
  await transport.sendMail({ from: process.env.MAIL_FROM, to: user.email, subject, text, html });
}
