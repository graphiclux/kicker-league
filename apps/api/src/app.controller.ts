import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  Req,
  UseGuards,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import Redis from 'ioredis';
import { db, audit } from './db';
import { AuthGuard, passwordHash } from './auth';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { TEAM_CODES, weekSchema } from '../../../packages/core/src';
const redis = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: 1 });
@Controller()
export class AppController {
  @Get('nfl-status') async nflStatus(@Query() query: any) {
    const { season, week } = weekSchema.parse(query);
    const raw = await redis.get('aing:nfl:status');
    const status = raw ? JSON.parse(raw) : { checkedAt: null, games: [] };
    const last = await db.statImport.findFirst({ where: { provider: 'espn', status: 'COMPLETED', events: { some: { season, week } } }, orderBy: { completedAt: 'desc' }, select: { completedAt: true } });
    return { checkedAt: status.checkedAt, updatedAt: last?.completedAt || null,
      stale: !status.checkedAt || Date.now() - Date.parse(status.checkedAt) > 25 * 60_000,
      games: status.games.filter((g: any) => g.season === season && g.week === week) };
  }
  @Get('health') async health() {
    try {
      await db.$queryRaw`SELECT 1`;
      await redis.ping();
      const heartbeat = await redis.get('aing:worker:heartbeat');
      return {
        status: 'ok',
        database: 'ok',
        redis: 'ok',
        worker: heartbeat && Date.now() - Number(heartbeat) < 15000 ? 'ok' : 'starting',
      };
    } catch {
      throw new ServiceUnavailableException('Dependency unavailable');
    }
  }
  @Get('seasons') seasons() {
    return db.season.findMany({ include: { rule: true, weeks: true }, orderBy: { year: 'desc' } });
  }
  @Get('nfl-teams') teams() {
    return db.nflTeam.findMany({
      orderBy: { code: 'asc' },
      include: {
        assignments: {
          where: { endsAt: null },
          include: { player: true },
          orderBy: { startsAt: 'desc' },
        },
      },
    });
  }
  @Get('scores') scores(@Query() query: any) {
    const { season, week } = weekSchema.parse(query);
    return db.teamWeekScore.findMany({
      where: { season, week },
      orderBy: [{ points: 'desc' }, { teamCode: 'asc' }],
    });
  }
  @Get('events') @UseGuards(AuthGuard) events(@Query() query: any) {
    const { season, week } = weekSchema.parse(query);
    const teamCode = query.teamCode ? z.enum(TEAM_CODES).parse(query.teamCode) : undefined;
    return db.kickingEvent.findMany({
      where: { season, week, teamCode },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }
  @Get('notifications') @UseGuards(AuthGuard) notifications(@Req() req: any) {
    return db.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  @Post('notifications/:id/read') @UseGuards(AuthGuard) async read(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    await db.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
  @Post('profile') @UseGuards(AuthGuard) profile(@Body() body: any, @Req() req: any) {
    const d = z
      .object({
        notificationsEnabled: z.boolean().optional(),
        emailScoringEnabled: z.boolean().optional(),
        emailDraftEnabled: z.boolean().optional(),
        emailLeagueEnabled: z.boolean().optional(),
        emailSecurityEnabled: z.boolean().optional(),
        displayName: z.string().trim().min(2).max(60).optional(),
      })
      .parse(body);
    return db.user.update({
      where: { id: req.user.id },
      data: d,
      select: { id: true, displayName: true, notificationsEnabled: true, emailScoringEnabled: true, emailDraftEnabled: true, emailLeagueEnabled: true, emailSecurityEnabled: true },
    });
  }
  @Post('account/delete') @UseGuards(AuthGuard) async deleteAccount(@Body() body: unknown, @Req() req: any) {
    const { password } = z.object({ password: z.string().max(128) }).parse(body);
    const user = await db.user.findUniqueOrThrow({ where: { id: req.user.id } });
    if (!(await argon2.verify(user.passwordHash, password))) throw new BadRequestException('Password is incorrect');
    const deletedAt = new Date();
    await db.$transaction(async (tx) => {
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.authToken.deleteMany({ where: { userId: user.id } });
      await tx.pushDevice.deleteMany({ where: { userId: user.id } });
      await tx.notification.deleteMany({ where: { userId: user.id } });
      await tx.fantasyTeam.updateMany({ where: { ownerId: user.id }, data: { name: 'Deleted team' } });
      await tx.user.update({ where: { id: user.id }, data: { email: `deleted+${user.id}@invalid.local`, displayName: 'Deleted user', passwordHash: await passwordHash(randomBytes(32).toString('hex')), notificationsEnabled: false, deletedAt } });
      await audit(tx, user.id, 'ACCOUNT_DELETED', user.id, 'User requested account deletion', { email: user.email }, { deletedAt });
    });
    return { ok: true };
  }
  @Post('push-devices') @UseGuards(AuthGuard) device(@Body() body: any, @Req() req: any) {
    const token = z
      .string()
      .regex(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/)
      .parse(body.token);
    return db.pushDevice.upsert({
      where: { token },
      create: { token, userId: req.user.id },
      update: { userId: req.user.id },
    });
  }
}
