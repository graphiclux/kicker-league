import { Body, Controller, Get, Post, Param, Query, Req, UseGuards } from '@nestjs/common';
import { gunzipSync } from 'node:zlib';
import { parse as parseCsv } from 'csv-parse/sync';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { z } from 'zod';
import { db, audit, json, lockWeek, outbox, mailOutbox } from './db';
import { AuthGuard, AdminGuard, publicUser } from './auth';
import {
  CSVProvider,
  NflverseProvider,
  ParsedImport,
  digest,
} from '../../../packages/core/src/providers';
import {
  eventSchema,
  reasonSchema,
  weekSchema,
  score,
  TEAM_CODES,
  defaultRules,
} from '../../../packages/core/src';
import { recalculate } from './scoring.service';
@ApiTags('Super Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  @Get('legal') legalDocuments() {
    return db.legalDocument.findMany({ orderBy: { key: 'asc' } });
  }
  @Post('legal/:key') async updateLegal(@Param('key') key: string, @Body() body: unknown, @Req() req: any) {
    if (!['privacy', 'terms'].includes(key)) throw new Error('Legal document not found');
    const d = z.object({ title: z.string().trim().min(2).max(120), content: z.string().trim().min(100).max(100000), reason: reasonSchema }).parse(body);
    return db.$transaction(async (tx) => {
      const before = await tx.legalDocument.findUniqueOrThrow({ where: { key } });
      const after = await tx.legalDocument.update({ where: { key }, data: { title: d.title, content: d.content } });
      await audit(tx, req.user.id, 'LEGAL_DOCUMENT_UPDATED', key, d.reason, before, after);
      return after;
    });
  }
  @Get('email-deliveries') emailDeliveries() {
    return db.outbox.findMany({
      where: { topic: 'mail.send' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, payload: true, attempts: true, lastError: true, deliveredAt: true, createdAt: true },
    });
  }
  @Get('imports') imports() {
    return db.statImport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        filename: true,
        mode: true,
        status: true,
        error: true,
        preview: true,
        createdAt: true,
        completedAt: true,
      },
    });
  }
  @Get('imports/:id') importDetail(@Param('id') id: string) {
    return db.statImport.findUniqueOrThrow({ where: { id } });
  }
  @Post('imports/preview') async preview(@Body() body: unknown, @Req() req: any) {
    const d = z
      .object({
        csv: z.string().min(1).max(1500000),
        filename: z.string().max(120),
        mode: z.enum(['EVENT', 'SUMMARY']),
        reason: reasonSchema,
      })
      .parse(body);
    return this.savePreview(
      new CSVProvider(d.mode).normalize(d.csv),
      { ...d, provider: 'csv' },
      req.user.id,
    );
  }
  private async savePreview(
    parsed: ParsedImport,
    d: { csv: string; filename: string; mode: string; reason: string; provider: string },
    userId: string,
  ) {
    const seasons = await db.season.findMany({
      where: { year: { in: parsed.scopes.map((s) => s.season) } },
      include: { rule: true },
    });
    for (const s of parsed.scopes) {
      if (!seasons.some((x) => x.year === s.season))
        parsed.errors.push(`Season ${s.season} has not been configured`);
      const w = await db.week.findUnique({
        where: { season_week: { season: s.season, week: s.week } },
      });
      if (w?.lockedAt) parsed.errors.push(`${s.season} week ${s.week} is locked`);
    }
    const totals = parsed.scopes.map((s) => ({
      ...s,
      points: parsed.rows
        .filter(
          (r) =>
            r.event.season === s.season &&
            r.event.week === s.week &&
            r.event.teamCode === s.teamCode,
        )
        .reduce(
          (n, r) =>
            n + score(r.event, seasons.find((v) => v.year === s.season)?.rule || defaultRules),
          0,
        ),
    }));
    const preview = {
      validRows: parsed.rows.length,
      errors: parsed.errors,
      warnings: parsed.warnings,
      totals,
      matching: parsed.scopes.map((s) => ({
        teamCode: s.teamCode,
        matched: TEAM_CODES.includes(s.teamCode as any),
      })),
    };
    return db.statImport.create({
      data: {
        uploadedBy: userId,
        filename: d.filename,
        mode: d.mode,
        provider: d.provider,
        reason: d.reason,
        contentHash: digest(d.csv),
        rows: json(parsed),
        preview: json(preview),
        status: parsed.errors.length ? 'INVALID' : 'PREVIEW',
      },
    });
  }
  @Post('imports/:id/confirm') async confirm(@Param('id') id: string, @Req() req: any) {
    return db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "StatImport" WHERE id=${id} FOR UPDATE`;
      const batch = await tx.statImport.findUniqueOrThrow({ where: { id } });
      if (batch.status === 'COMPLETED' || batch.status === 'QUEUED') return batch;
      if (!['PREVIEW', 'FAILED'].includes(batch.status))
        throw new Error('Import has validation errors');
      const result = await tx.statImport.update({
        where: { id },
        data: { status: 'QUEUED', error: null },
      });
      await outbox(tx, 'import.queued', { importId: id });
      await audit(tx, req.user.id, 'IMPORT_CONFIRMED', id, batch.reason);
      return result;
    });
  }
  @Post('nflverse/sync') async sync(@Body() body: any, @Req() req: any) {
    const { season, week } = weekSchema.parse(body);
    const reason = reasonSchema.parse(body.reason);
    const configured = process.env.NFLVERSE_PBP_URL;
    if (!configured)
      throw new Error('NFLVERSE_PBP_URL is not configured; CSV imports are available');
    const url = new URL(
      configured.replace('{season}', String(season)).replace('{week}', String(week)),
    );
    if (url.protocol !== 'https:') throw new Error('nflverse URL must use HTTPS');
    const r = await fetch(url, { signal: AbortSignal.timeout(60000), redirect: 'follow' });
    if (new URL(r.url).protocol !== 'https:') throw new Error('Provider redirect must use HTTPS');
    if (!r.ok) throw new Error(`Provider returned ${r.status}`);
    if (Number(r.headers.get('content-length')) > 100_000_000)
      throw new Error('Provider file exceeds 100 MB');
    const reader = r.body!.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > 100_000_000) {
        await reader.cancel();
        throw new Error('Provider file exceeds 100 MB');
      }
      chunks.push(next.value);
    }
    const payload = Buffer.concat(chunks);
    const compressed = url.pathname.endsWith('.gz') || r.headers.get('content-type')?.includes('gzip');
    const csv = (compressed ? gunzipSync(payload) : payload).toString();
    const parsed = new NflverseProvider().normalize(csv);
    parsed.rows = parsed.rows.filter((r) => r.event.season === season && r.event.week === week);
    parsed.scopes = parsed.scopes.filter((s) => s.season === season && s.week === week);
    if (!parsed.rows.length) parsed.errors.push('No kicking events found for requested week');
    return this.savePreview(
      parsed,
      {
        csv,
        filename: `nflverse-${season}-${week}.csv`,
        mode: 'EVENT',
        reason,
        provider: 'nflverse',
      },
      req.user.id,
    );
  }
  @Post('nflverse/players/sync') async syncPlayers(@Req() req: any) {
    const configured = process.env.NFLVERSE_PLAYERS_URL;
    if (!configured) throw new Error('NFLVERSE_PLAYERS_URL is not configured');
    const url = new URL(configured);
    if (url.protocol !== 'https:') throw new Error('Player provider URL must use HTTPS');
    const response = await fetch(url, { signal: AbortSignal.timeout(60000), redirect: 'follow' });
    if (!response.ok) throw new Error(`Provider returned ${response.status}`);
    const rows = parseCsv(await response.text(), { columns: true, bom: true, skip_empty_lines: true }) as any[];
    let updated = 0;
    await db.$transaction(async (tx) => {
      for (const row of rows.filter((r) => r.position === 'K' && (r.gsis_id || r.nfl_id))) {
        const result = await tx.player.updateMany({ where: { OR: [{ externalId: row.gsis_id || row.nfl_id }, { name: row.short_name }, { name: row.display_name }] }, data: { name: row.display_name || row.short_name, externalId: row.gsis_id || row.nfl_id, imageUrl: row.headshot || null } });
        updated += result.count;
      }
      await audit(tx, req.user.id, 'PLAYER_DIRECTORY_SYNC', 'nflverse', 'Automatic player headshot refresh', undefined, { rows: rows.length, updated });
    });
    return { source: 'nflverse', rows: rows.length, updated };
  }
  @Post('events') async addEvent(@Body() body: any, @Req() req: any) {
    const e = eventSchema.parse(body.event),
      reason = reasonSchema.parse(body.reason);
    return db.$transaction(async (tx) => {
      const s = await lockWeek(tx, e.season, e.week);
      const result = await tx.kickingEvent.create({
        data: {
          ...e,
          occurredAt: e.occurredAt ? new Date(e.occurredAt) : null,
          provider: 'manual',
          points: score(e, s.rule),
          ruleCode: s.rule.code,
          raw: json(e),
        },
      });
      await audit(tx, req.user.id, 'EVENT_ADDED', result.id, reason, undefined, result);
      await recalculate(tx, e.season, e.week);
      return result;
    });
  }
  @Post('events/:id') async correct(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const d = z
      .object({
        reason: reasonSchema,
        voided: z.boolean().optional(),
        result: z.enum(['MADE', 'MISSED', 'BLOCKED', 'FAILED', 'UNKNOWN']).optional(),
        distance: z.number().int().min(1).max(100).nullable().optional(),
        kicker: z.string().trim().min(1).max(100).optional(),
      })
      .parse(body);
    return db.$transaction(async (tx) => {
      const initial = await tx.kickingEvent.findUniqueOrThrow({ where: { id } });
      const s = await lockWeek(tx, initial.season, initial.week);
      const old = await tx.kickingEvent.findUniqueOrThrow({ where: { id } });
      const next = eventSchema.parse({
        ...old,
        ...d,
        occurredAt: old.occurredAt?.toISOString() || null,
      });
      const result = await tx.kickingEvent.update({
        where: { id },
        data: {
          result: next.result,
          distance: next.distance,
          kicker: next.kicker,
          points: score(next, s.rule),
          ruleCode: s.rule.code,
          ...(d.voided === undefined ? {} : { voidedAt: d.voided ? new Date() : null }),
        },
      });
      await audit(
        tx,
        req.user.id,
        d.voided ? 'EVENT_VOIDED' : 'EVENT_CORRECTED',
        id,
        d.reason,
        old,
        result,
      );
      await recalculate(tx, old.season, old.week);
      return result;
    });
  }
  @Post('weeks/:action') async week(
    @Param('action') action: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const { season, week } = weekSchema.parse(body),
      reason = reasonSchema.parse(body.reason);
    if (!['lock', 'unlock', 'recalculate'].includes(action)) throw new Error('Unknown action');
    return db.$transaction(async (tx) => {
      await lockWeek(tx, season, week, action !== 'recalculate');
      if (action === 'recalculate') await recalculate(tx, season, week);
      else {
        if (action === 'lock') await recalculate(tx, season, week);
        await tx.week.update({
          where: { season_week: { season, week } },
          data: { lockedAt: action === 'lock' ? new Date() : null },
        });
      }
      await audit(tx, req.user.id, `WEEK_${action.toUpperCase()}`, `${season}/${week}`, reason);
      return { ok: true };
    });
  }
  @Get('audit') audit(@Query('entityId') entityId?: string) {
    return db.auditLog.findMany({
      where: entityId ? { entityId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
  @Get('users') async users() {
    return (await db.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { teams: { include: { league: true, roster: true }, orderBy: { name: 'asc' } } },
    })).map((u) => ({
      ...publicUser(u),
      suspended: u.suspended,
      teams: u.teams.map((team) => ({
        name: team.name,
        leagueName: team.league.name,
        leagueStatus: team.league.status,
        teamCode: team.roster?.teamCode ?? null,
      })),
    }));
  }
  @Post('users/:id') async user(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const d = z.object({ suspended: z.boolean(), reason: reasonSchema }).parse(body);
    if (id === req.user.id) throw new Error('Cannot suspend yourself');
    return db.$transaction(async (tx) => {
      const old = await tx.user.findUniqueOrThrow({ where: { id } });
      if (old.role === 'SUPER_ADMIN')
        throw new Error('Super Admin accounts require command-line administration');
      await tx.user.update({ where: { id }, data: { suspended: d.suspended } });
      if (d.suspended)
        await tx.session.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } });
      await audit(
        tx,
        req.user.id,
        'USER_STATUS_CHANGED',
        id,
        d.reason,
        { suspended: old.suspended },
        { suspended: d.suspended },
      );
      return { ok: true };
    });
  }
  @Post('users/:id/email') async updateEmail(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const d = z.object({ email: z.string().trim().email().transform((value) => value.toLowerCase()), reason: reasonSchema }).parse(body);
    return db.$transaction(async (tx) => {
      const old = await tx.user.findUniqueOrThrow({ where: { id } });
      if (old.role === 'SUPER_ADMIN' && id !== req.user.id)
        throw new Error('Super Admin accounts can only be changed by the account owner');
      const updated = await tx.user.update({ where: { id }, data: { email: d.email, verifiedAt: null } });
      await tx.session.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } });
      await audit(tx, req.user.id, 'USER_EMAIL_UPDATED', id, d.reason, { email: old.email }, { email: updated.email });
      return { ...publicUser(updated), suspended: updated.suspended };
    });
  }
  @Get('leagues') leagues() {
    return db.league.findMany({
      include: { _count: { select: { teams: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
  @Post('seasons') async season(@Body() body: any, @Req() req: any) {
    const d = z
      .object({
        year: z.number().int().min(2000).max(2100),
        reason: reasonSchema,
        rule: z.object({
          code: z.string().min(4).max(40),
          shortMiss: z.number().int().min(-100).max(100),
          longMiss: z.number().int().min(-100).max(100),
          xpMiss: z.number().int().min(-100).max(100),
          xpBlocked: z.number().int().min(-100).max(100),
          longMade: z.number().int().min(-100).max(100),
          shortMax: z.number().int().min(1).max(100),
          longMadeMin: z.number().int().min(1).max(100),
        }),
      })
      .parse(body);
    return db.$transaction(async (tx) => {
      const rule = await tx.scoringRule.create({ data: d.rule });
      const season = await tx.season.create({
        data: { year: d.year, name: `NFL ${d.year}`, ruleId: rule.id },
      });
      await audit(tx, req.user.id, 'SEASON_CREATED', String(d.year), d.reason, undefined, {
        season,
        rule,
      });
      return season;
    });
  }
  @Post('scoring/:season') async updateScoring(
    @Param('season') rawSeason: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const season = z.coerce.number().int().min(2000).max(2100).parse(rawSeason);
    const d = z
      .object({
        reason: reasonSchema,
        shortMiss: z.number().int().min(-100).max(100),
        longMiss: z.number().int().min(-100).max(100),
        xpMiss: z.number().int().min(-100).max(100),
        xpBlocked: z.number().int().min(-100).max(100),
        longMade: z.number().int().min(-100).max(100),
        shortMax: z.number().int().min(1).max(100),
        longMadeMin: z.number().int().min(1).max(100),
      })
      .parse(body);
    const { reason, ...ruleData } = d;
    return db.$transaction(async (tx) => {
      const current = await tx.season.findUniqueOrThrow({ where: { year: season }, include: { rule: true } });
      const updated = await tx.scoringRule.update({ where: { id: current.ruleId }, data: ruleData });
      const weeks = await tx.week.findMany({ where: { season }, select: { week: true } });
      for (const w of weeks) await recalculate(tx, season, w.week);
      await audit(tx, req.user.id, 'SCORING_RULE_UPDATED', String(season), reason, current.rule, updated);
      return { season, rule: updated, recalculatedWeeks: weeks.map((w) => w.week) };
    });
  }
  @Post('assignments') async assignment(@Body() body: any, @Req() req: any) {
    const d = z
      .object({
        teamCode: z.enum(TEAM_CODES),
        playerName: z.string().trim().min(2).max(100),
        imageUrl: z.url().max(1000).nullable().optional(),
        designation: z.enum(['PRIMARY_KICKER', 'BACKUP_KICKER']),
        reason: reasonSchema,
      })
      .parse(body);
    return db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT code FROM "NflTeam" WHERE code=${d.teamCode} FOR UPDATE`;
      const old = await tx.playerAssignment.findMany({
        where: { teamCode: d.teamCode, designation: d.designation, endsAt: null },
      });
      await tx.playerAssignment.updateMany({
        where: { teamCode: d.teamCode, designation: d.designation, endsAt: null },
        data: { endsAt: new Date() },
      });
      const player = await tx.player.create({ data: { name: d.playerName, imageUrl: d.imageUrl || null } });
      const result = await tx.playerAssignment.create({
        data: { playerId: player.id, teamCode: d.teamCode, designation: d.designation },
      });
      await audit(tx, req.user.id, 'KICKER_ASSIGNMENT', d.teamCode, d.reason, old, {
        ...result,
        player,
      });
      if (d.designation === 'PRIMARY_KICKER') {
        const rosters = await tx.roster.findMany({ where: { teamCode: d.teamCode }, include: { fantasyTeam: { include: { owner: true } } } });
        for (const roster of rosters.filter((r) => r.fantasyTeam.owner.emailLeagueEnabled)) await mailOutbox(tx, {
          to: roster.fantasyTeam.owner.email,
          subject: `${d.teamCode} kicker update for ${roster.fantasyTeam.name}`,
          eyebrow: 'KICKER REPLACEMENT ALERT',
          title: 'The franchise has a new foot.',
          copy: `${d.playerName} is now the listed primary kicker for ${d.teamCode}. Your fantasy franchise stays the same, and backups still count automatically.`,
          url: `${process.env.WEB_URL}/`, button: 'View the kicker field',
        });
      }
      return result;
    });
  }
}
