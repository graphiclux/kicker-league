import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db, audit, lockLeague, outbox, mailOutbox } from './db';
import { AuthGuard } from './auth';
import { leagueSchema, TEAM_CODES } from '../../../packages/core/src';
import { selectPick, shuffled } from './draft.service';
export async function member(leagueId: string, userId: string) {
  const l = await db.league.findUnique({
    where: { id: leagueId },
    include: { teams: { include: { roster: true }, orderBy: { draftOrder: 'asc' } } },
  });
  if (!l) throw new NotFoundException('League not found');
  if (!l.teams.some((t) => t.ownerId === userId))
    throw new ForbiddenException('League membership required');
  return l;
}
export function commissioner(l: { commissionerId: string }, u: string) {
  if (l.commissionerId !== u) throw new ForbiddenException('Commissioner access required');
}
@ApiTags('Leagues')
@ApiBearerAuth()
@Controller('leagues')
@UseGuards(AuthGuard)
export class LeaguesController {
  @Get() list(@Req() req: any) {
    return db.league.findMany({
      where: { teams: { some: { ownerId: req.user.id } } },
      include: { teams: { include: { roster: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
  @Post() async create(@Body() body: unknown, @Req() req: any) {
    const d = leagueSchema.parse(body);
    if (!req.user.verifiedAt)
      throw new ForbiddenException('Verify your email before creating a league');
    return db.$transaction(async (tx) => {
      const season = await tx.season.findUnique({ where: { year: d.season } });
      if (!season || season.status !== 'ACTIVE')
        throw new Error('Season is not open for new leagues');
      const l = await tx.league.create({
        data: {
          name: d.name,
          season: d.season,
          maxTeams: d.maxTeams,
          commissionerId: req.user.id,
          inviteCode: randomBytes(9).toString('base64url'),
          teams: { create: { ownerId: req.user.id, name: d.teamName } },
        },
      });
      await audit(
        tx,
        req.user.id,
        'LEAGUE_CREATED',
        l.id,
        'Commissioner created league',
        undefined,
        l,
        l.id,
      );
      await mailOutbox(tx, {
        to: req.user.email,
        subject: `Your league is ready: ${l.name}`,
        eyebrow: 'LEAGUE CREATED',
        title: 'The bad decisions have a clubhouse.',
        copy: `Your league “${l.name}” is ready. Share the invite code and get your people lined up for one gloriously questionable draft.`,
        text: `Your league is ready: ${l.name}\nInvite code: ${l.inviteCode}`,
      });
      return l;
    });
  }
  @Post('join') async join(@Body() body: unknown, @Req() req: any) {
    const d = z
      .object({ inviteCode: z.string().min(4).max(40), teamName: z.string().trim().min(2).max(60) })
      .parse(body);
    if (!req.user.verifiedAt)
      throw new ForbiddenException('Verify your email before joining a league');
    return db.$transaction(async (tx) => {
      const found = await tx.league.findUnique({ where: { inviteCode: d.inviteCode } });
      if (!found) throw new NotFoundException('Invite code not found');
      await lockLeague(tx, found.id);
      const l = await tx.league.findUniqueOrThrow({
        where: { id: found.id },
        include: { teams: true },
      });
      if (l.status !== 'LOBBY') throw new Error('Membership is locked after the draft starts');
      if (l.teams.length >= l.maxTeams) throw new Error('League is full');
      const t = await tx.fantasyTeam.create({
        data: { leagueId: l.id, ownerId: req.user.id, name: d.teamName },
      });
      await audit(
        tx,
        req.user.id,
        'MEMBER_JOINED',
        t.id,
        'Joined with invite code',
        undefined,
        t,
        l.id,
      );
      await outbox(tx, 'draft.updated', { leagueId: l.id });
      await mailOutbox(tx, {
        to: req.user.email,
        subject: `You joined ${l.name}`,
        eyebrow: 'YOU’RE IN',
        title: 'Welcome to the wrong side of the uprights.',
        copy: `Your team “${d.teamName}” is in ${l.name}. One franchise. One draft. A lifetime of explaining the kicker choice.`,
      });
      return l;
    });
  }
  @Post(':id/team-name') async renameTeam(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const d = z.object({ name: z.string().trim().min(2).max(60) }).parse(body);
    const l = await member(id, req.user.id);
    const team = l.teams.find((t) => t.ownerId === req.user.id)!;
    const updated = await db.$transaction(async (tx) => {
      const next = await tx.fantasyTeam.update({ where: { id: team.id }, data: { name: d.name } });
      await audit(tx, req.user.id, 'TEAM_RENAMED', team.id, 'Member changed team name', team, next, id);
      return next;
    });
    return { id: updated.id, name: updated.name };
  }
  @Get(':id') detail(@Param('id') id: string, @Req() req: any) {
    return member(id, req.user.id);
  }
  @Get(':id/standings') async standings(
    @Param('id') id: string,
    @Query('week') raw: string,
    @Req() req: any,
  ) {
    const l = await member(id, req.user.id);
    const week = z.coerce
      .number()
      .int()
      .min(1)
      .max(22)
      .parse(raw || 1);
    const scores = await db.teamWeekScore.findMany({ where: { season: l.season } });
    const rows = l.teams
      .map((t) => ({
        ...t,
        totalPoints: scores
          .filter((s) => s.teamCode === t.roster?.teamCode)
          .reduce((a, s) => a + s.points, 0),
        weeklyPoints:
          scores.find((s) => s.teamCode === t.roster?.teamCode && s.week === week)?.points || 0,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
    let rank = 1;
    return rows.map((r, i) => {
      if (i && r.totalPoints !== rows[i - 1].totalPoints) rank = i + 1;
      return { ...r, rank };
    });
  }
  @Get(':id/activity') async activity(@Param('id') id: string, @Req() req: any) {
    await member(id, req.user.id);
    return db.auditLog.findMany({
      where: { leagueId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, action: true, reason: true, createdAt: true },
    });
  }
  @Post(':id/configure') async configure(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const d = z
      .object({
        name: z.string().trim().min(2).max(80).optional(),
        maxTeams: z.number().int().min(2).max(32).optional(),
        pickSeconds: z.number().int().min(10).max(300).optional(),
        scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
      })
      .parse(body);
    return db.$transaction(async (tx) => {
      await lockLeague(tx, id);
      const l = await tx.league.findUniqueOrThrow({ where: { id }, include: { teams: true } });
      commissioner(l, req.user.id);
      if (l.status !== 'LOBBY') throw new Error('Configuration is locked after draft start');
      if (d.maxTeams && d.maxTeams < l.teams.length)
        throw new Error('Capacity cannot be below current membership');
      const next = await tx.league.update({ where: { id }, data: d });
      await audit(
        tx,
        req.user.id,
        'LEAGUE_CONFIGURED',
        id,
        'Updated pre-draft configuration',
        l,
        next,
        id,
      );
      return next;
    });
  }
  @Post(':id/remove-member') async remove(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const teamId = z.string().parse(body.teamId);
    return db.$transaction(async (tx) => {
      await lockLeague(tx, id);
      const l = await tx.league.findUniqueOrThrow({ where: { id } });
      commissioner(l, req.user.id);
      if (l.status !== 'LOBBY') throw new Error('Membership is locked');
      const t = await tx.fantasyTeam.findUniqueOrThrow({ where: { id: teamId } });
      if (t.leagueId !== id || t.ownerId === req.user.id)
        throw new Error('Cannot remove this member');
      await tx.fantasyTeam.delete({ where: { id: teamId } });
      await tx.fantasyTeam.updateMany({ where: { leagueId: id }, data: { draftOrder: null } });
      await audit(
        tx,
        req.user.id,
        'MEMBER_REMOVED',
        teamId,
        'Commissioner removed member before draft',
        t,
        undefined,
        id,
      );
      return { ok: true };
    });
  }
  @Post(':id/rankings') async rankings(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const rankings = z
      .array(z.enum(TEAM_CODES))
      .max(32)
      .refine((a) => new Set(a).size === a.length, 'No duplicate rankings')
      .parse(body.rankings);
    return db.$transaction(async (tx) => {
      await lockLeague(tx, id);
      const l = await tx.league.findUniqueOrThrow({ where: { id } });
      if (l.status !== 'LOBBY') throw new Error('Rankings are locked at draft start');
      return tx.fantasyTeam.update({
        where: { leagueId_ownerId: { leagueId: id, ownerId: req.user.id } },
        data: { rankings },
      });
    });
  }
  @Post(':id/draft/order') async order(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return db.$transaction(async (tx) => {
      await lockLeague(tx, id);
      const l = await tx.league.findUniqueOrThrow({ where: { id }, include: { teams: true } });
      commissioner(l, req.user.id);
      if (l.status !== 'LOBBY') throw new Error('Order is locked');
      const ids = body.randomize
        ? shuffled(l.teams.map((t) => t.id))
        : z.array(z.string()).parse(body.teamIds);
      if (
        ids.length !== l.teams.length ||
        new Set(ids).size !== ids.length ||
        ids.some((v: string) => !l.teams.some((t) => t.id === v))
      )
        throw new Error('Order must include every team exactly once');
      await tx.fantasyTeam.updateMany({ where: { leagueId: id }, data: { draftOrder: null } });
      for (let i = 0; i < ids.length; i++)
        await tx.fantasyTeam.update({ where: { id: ids[i] }, data: { draftOrder: i + 1 } });
      await audit(
        tx,
        req.user.id,
        'DRAFT_ORDER_SET',
        id,
        'Commissioner set one-round draft order',
        undefined,
        ids,
        id,
      );
      await outbox(tx, 'draft.updated', { leagueId: id });
      return { ok: true };
    });
  }
  @Post(':id/draft/:action') async control(
    @Param('id') id: string,
    @Param('action') action: string,
    @Req() req: any,
  ) {
    return db.$transaction(async (tx) => {
      await lockLeague(tx, id);
      const l = await tx.league.findUniqueOrThrow({
        where: { id },
        include: { teams: { orderBy: { draftOrder: 'asc' } } },
      });
      commissioner(l, req.user.id);
      if (action === 'start') {
        if (l.status !== 'LOBBY' || l.teams.length < 2)
          throw new Error('Draft requires at least two teams and an open lobby');
        if (l.scheduledAt && l.scheduledAt > new Date())
          throw new Error('Scheduled draft time has not arrived');
        const ordered = l.teams.every((t, i) => t.draftOrder === i + 1)
          ? l.teams
          : shuffled(l.teams);
        await tx.fantasyTeam.updateMany({ where: { leagueId: id }, data: { draftOrder: null } });
        for (let i = 0; i < ordered.length; i++)
          await tx.fantasyTeam.update({
            where: { id: ordered[i].id },
            data: { draftOrder: i + 1 },
          });
        await tx.league.update({
          where: { id },
          data: {
            status: 'DRAFTING',
            currentPick: 1,
            deadline: new Date(Date.now() + l.pickSeconds * 1000),
          },
        });
      } else if (action === 'pause' && l.status === 'DRAFTING') {
        await tx.league.update({
          where: { id },
          data: {
            status: 'PAUSED',
            pauseRemainingMs: Math.max(0, (l.deadline?.getTime() || Date.now()) - Date.now()),
            deadline: null,
          },
        });
      } else if (action === 'resume' && l.status === 'PAUSED') {
        await tx.league.update({
          where: { id },
          data: {
            status: 'DRAFTING',
            deadline: new Date(Date.now() + (l.pauseRemainingMs ?? l.pickSeconds * 1000)),
            pauseRemainingMs: null,
          },
        });
      } else throw new Error('Invalid draft transition');
      await audit(
        tx,
        req.user.id,
        `DRAFT_${action.toUpperCase()}`,
        id,
        `Commissioner ${action} draft`,
        undefined,
        undefined,
        id,
      );
      await outbox(tx, 'draft.updated', { leagueId: id });
      if (action === 'start' || action === 'pause' || action === 'resume') {
        const members = await tx.fantasyTeam.findMany({ where: { leagueId: id }, include: { owner: true } });
        for (const member of members) await mailOutbox(tx, {
          to: member.owner.email,
          subject: action === 'start' ? `The ${l.name} draft is live` : `${l.name}: draft ${action}d`,
          eyebrow: action === 'start' ? 'DRAFT ROOM OPEN' : `DRAFT ${action.toUpperCase()}D`,
          title: action === 'start' ? 'Make your one pick count.' : action === 'pause' ? 'The clock is taking five.' : 'The clock is running again.',
          copy: action === 'start' ? `The draft for ${l.name} has started. Your kicking position is yours all season, including every backup.` : action === 'pause' ? `The commissioner paused the ${l.name} draft. Your place in the order is safe.` : `The ${l.name} draft has resumed. Keep your rankings close and your panic closer.`,
          url: `${process.env.WEB_URL}/`, button: 'Open the draft room',
        });
      }
      return { ok: true };
    });
  }
  @Post(':id/pick') pick(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const code = z.enum(TEAM_CODES).parse(body.teamCode);
    return db.$transaction(async (tx) => {
      await lockLeague(tx, id);
      return selectPick(tx, id, req.user.id, code);
    });
  }
  @Post(':id/renew') async renew(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const l = await member(id, req.user.id);
    commissioner(l, req.user.id);
    const season = z
      .number()
      .int()
      .min(l.season + 1)
      .max(2100)
      .parse(body.season);
    return this.create(
      {
        name: l.name,
        teamName: l.teams.find((t) => t.ownerId === req.user.id)!.name,
        season,
        maxTeams: l.maxTeams,
      },
      req,
    );
  }
}
