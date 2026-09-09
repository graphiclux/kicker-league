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
  await transport.sendMail({
    from: process.env.MAIL_FROM,
    to: user.email,
    subject:
      purpose === 'VERIFY'
        ? "Verify your And It's No Good account"
        : "Reset your And It's No Good password",
    text: `${purpose === 'VERIFY' ? 'Verify your email' : 'Reset your password'}: ${url}\nThis link expires in one hour.`,
  });
}
