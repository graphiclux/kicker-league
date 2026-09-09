import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import * as argon2 from 'argon2';
import { z } from 'zod';
import { db, audit } from './db';
import {
  AuthGuard,
  publicUser,
  passwordHash,
  newSession,
  sendAuthMail,
  hash,
  token,
  accessFor,
  cookies,
  clearCookies,
} from './auth';
import { registerSchema } from '../../../packages/core/src';
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  @Post('register') async register(@Body() body: unknown, @Res({ passthrough: true }) res: any) {
    const data = registerSchema.parse(body);
    if (await db.user.findUnique({ where: { email: data.email } }))
      throw new BadRequestException('Email is already registered');
    const u = await db.user.create({
      data: {
        email: data.email,
        displayName: data.displayName,
        passwordHash: await passwordHash(data.password),
      },
    });
    await sendAuthMail(u, 'VERIFY');
    return newSession(u, res);
  }
  @Post('login') async login(@Body() body: unknown, @Res({ passthrough: true }) res: any) {
    const data = z
      .object({ email: z.email().transform((s) => s.toLowerCase()), password: z.string().max(128) })
      .parse(body);
    const u = await db.user.findUnique({ where: { email: data.email } });
    if (!u || u.suspended || !(await argon2.verify(u.passwordHash, data.password)))
      throw new UnauthorizedException('Invalid email or password');
    return newSession(u, res);
  }
  @Post('refresh') async refresh(
    @Body() body: any,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const raw = z
      .string()
      .max(200)
      .parse(body.refreshToken || req.cookies?.aing_refresh);
    const next = token();
    const session = await db.$transaction(async (tx) => {
      const s = await tx.session.findUnique({
        where: { tokenHash: hash(raw) },
        include: { user: true },
      });
      if (!s || s.revokedAt || s.expiresAt < new Date() || s.user.suspended)
        throw new UnauthorizedException('Refresh session expired');
      const updated = await tx.session.updateMany({
        where: { id: s.id, tokenHash: hash(raw), revokedAt: null },
        data: { tokenHash: hash(next) },
      });
      if (updated.count !== 1) throw new UnauthorizedException('Refresh token already rotated');
      return s;
    });
    const access = accessFor(session.userId, session.id);
    cookies(res, access, next);
    return { accessToken: access, refreshToken: next, user: publicUser(session.user) };
  }
  @Post('logout') async logout(
    @Body() body: any,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const raw = body.refreshToken || req.cookies?.aing_refresh;
    if (typeof raw === 'string')
      await db.session.updateMany({
        where: { tokenHash: hash(raw) },
        data: { revokedAt: new Date() },
      });
    clearCookies(res);
    return { ok: true };
  }
  @Get('me') @UseGuards(AuthGuard) me(@Req() req: any) {
    return publicUser(req.user);
  }
  @Post('forgot-password') async forgot(@Body() body: unknown) {
    const { email } = z.object({ email: z.email().transform((s) => s.toLowerCase()) }).parse(body);
    const user = await db.user.findUnique({ where: { email } });
    if (user) await sendAuthMail(user, 'RESET');
    return { message: 'If that account exists, a reset link has been sent.' };
  }
  @Post('resend-verification') @UseGuards(AuthGuard) async resend(@Req() req: any) {
    if (!req.user.verifiedAt) await sendAuthMail(req.user, 'VERIFY');
    return { ok: true };
  }
  @Post('verify') async verify(@Body() body: any) {
    const raw = z.string().max(200).parse(body.token);
    await this.consume(raw, 'VERIFY', async (tx: any, t: any) => {
      await tx.user.update({ where: { id: t.userId }, data: { verifiedAt: new Date() } });
    });
    return { ok: true };
  }
  @Post('reset-password') async reset(@Body() body: any) {
    const { token: raw, password } = z
      .object({ token: z.string().max(200), password: z.string().min(12).max(128) })
      .parse(body);
    const ph = await passwordHash(password);
    await this.consume(raw, 'RESET', async (tx: any, t: any) => {
      await tx.user.update({ where: { id: t.userId }, data: { passwordHash: ph } });
      await tx.session.updateMany({ where: { userId: t.userId }, data: { revokedAt: new Date() } });
      await audit(tx, t.userId, 'PASSWORD_RESET', t.userId, 'Password reset using emailed token');
    });
    return { ok: true };
  }
  private async consume(raw: string, purpose: string, fn: any) {
    await db.$transaction(async (tx) => {
      const t = await tx.authToken.findUnique({ where: { hash: hash(raw) } });
      if (!t || t.purpose !== purpose || t.usedAt || t.expiresAt < new Date())
        throw new BadRequestException('Invalid or expired link');
      const n = await tx.authToken.updateMany({
        where: { id: t.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (n.count !== 1) throw new BadRequestException('Link already used');
      await fn(tx, t);
    });
  }
}
