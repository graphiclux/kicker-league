import { db, Tx, audit, json, lockWeek, outbox } from './db';
import { NormalizedEvent, score } from '../../../packages/core/src';
import { ParsedImport } from '../../../packages/core/src/providers';
export async function recalculate(tx: Tx, season: number, week: number) {
  const s = await tx.season.findUniqueOrThrow({ where: { year: season }, include: { rule: true } });
  const events = await tx.kickingEvent.findMany({ where: { season, week, voidedAt: null } });
  const sums = new Map<string, { points: number; eventCount: number }>();
  for (const e of events) {
    const points = score(e as NormalizedEvent, s.rule);
    if (e.points !== points || e.ruleCode !== s.rule.code)
      await tx.kickingEvent.update({
        where: { id: e.id },
        data: { points, ruleCode: s.rule.code },
      });
    const sum = sums.get(e.teamCode) || { points: 0, eventCount: 0 };
    sum.points += points;
    sum.eventCount++;
    sums.set(e.teamCode, sum);
  }
  for (const teamCode of (await tx.nflTeam.findMany({ select: { code: true } })).map(
    (t) => t.code,
  )) {
    const data = {
      ...(sums.get(teamCode) || { points: 0, eventCount: 0 }),
      recalculatedAt: new Date(),
    };
    await tx.teamWeekScore.upsert({
      where: { season_week_teamCode: { season, week, teamCode } },
      create: { season, week, teamCode, ...data },
      update: data,
    });
  }
  await outbox(tx, 'scores.updated', { season, week });
}
export async function processImport(id: string) {
  try {
    await db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "StatImport" WHERE id=${id} FOR UPDATE`;
        const batch = await tx.statImport.findUniqueOrThrow({ where: { id } });
        if (batch.status === 'COMPLETED') return;
        if (batch.status !== 'QUEUED') throw new Error('Import is not queued');
        const parsed = batch.rows as unknown as ParsedImport;
        const weeks = [...new Set(parsed.scopes.map((s) => `${s.season}:${s.week}`))].sort();
        const rules = new Map<number, any>();
        for (const w of weeks) {
          const [season, week] = w.split(':').map(Number);
          rules.set(season, (await lockWeek(tx, season, week)).rule);
        }
        const snapshot =
          batch.mode === 'SUMMARY' ||
          (batch.provider === 'csv' &&
            parsed.rows.every((r) => r.event.providerEventId.startsWith('snapshot/')));
        if (snapshot)
          for (const scope of parsed.scopes) {
            const old = await tx.kickingEvent.findMany({ where: { ...scope, voidedAt: null } });
            for (const e of old) {
              await tx.kickingEvent.update({ where: { id: e.id }, data: { voidedAt: new Date() } });
              await audit(tx, batch.uploadedBy, 'EVENT_REPLACED', e.id, batch.reason, e, {
                voided: true,
                importId: id,
              });
            }
          }
        for (const row of parsed.rows) {
          const e = row.event;
          const existingPlayer = await tx.player.findFirst({ where: { name: e.kicker, assignments: { some: { teamCode: e.teamCode, endsAt: null } } } });
          if (!existingPlayer) {
            const player = await tx.player.create({ data: { name: e.kicker } });
            const hasPrimary = await tx.playerAssignment.findFirst({ where: { teamCode: e.teamCode, designation: 'PRIMARY_KICKER', endsAt: null } });
            await tx.playerAssignment.create({ data: { playerId: player.id, teamCode: e.teamCode, designation: hasPrimary ? 'BACKUP_KICKER' : 'PRIMARY_KICKER' } });
          }
          const key = { provider: batch.provider, providerEventId: e.providerEventId };
          const old = await tx.kickingEvent.findUnique({
            where: { provider_providerEventId: key },
          });
          if (
            old &&
            (old.season !== e.season || old.week !== e.week || old.teamCode !== e.teamCode)
          )
            throw new Error(
              `Event ID ${e.providerEventId} belongs to another team/week; void it and add a new ID instead`,
            );
          const rule = rules.get(e.season);
          const data = {
            ...e,
            provider: batch.provider,
            points: score(e, rule),
            ruleCode: rule.code,
            occurredAt: e.occurredAt ? new Date(e.occurredAt) : null,
            raw: json(row.raw),
            importId: id,
            voidedAt: null,
          };
          const result = await tx.kickingEvent.upsert({
            where: { provider_providerEventId: key },
            create: data,
            update: data,
          });
          await audit(
            tx,
            batch.uploadedBy,
            old ? 'EVENT_UPDATED' : 'EVENT_ADDED',
            result.id,
            batch.reason,
            old,
            result,
          );
        }
        for (const w of weeks) {
          const [season, week] = w.split(':').map(Number);
          await recalculate(tx, season, week);
        }
        await tx.statImport.update({
          where: { id },
          data: { status: 'COMPLETED', completedAt: new Date(), error: null },
        });
        await audit(tx, batch.uploadedBy, 'IMPORT_COMPLETED', id, batch.reason, undefined, {
          events: parsed.rows.length,
          scopes: parsed.scopes,
        });
      },
      { timeout: 120000 },
    );
  } catch (e) {
    await db.statImport.update({
      where: { id },
      data: { status: 'FAILED', error: (e as Error).message },
    });
    throw e;
  }
}
