import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

async function main() {
  // Separate PostgreSQL schema: never replace the app's seasons or test scores.
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.set('schema', `espn_test_${randomUUID().replace(/-/g, '')}`);
  process.env.DATABASE_URL = url.toString();
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: process.env, stdio: 'pipe' });
  const { db, json, audit } = await import('../apps/api/src/db');
  const { processImport } = await import('../apps/api/src/scoring.service');
  const { fetchEspn, normalizeEspn } = await import('../packages/core/src/espn');
  try {
    const rule = await db.scoringRule.create({ data: { code: 'ESPN-TEST' } });
    await db.season.create({ data: { year: 2024, name: 'Replay', ruleId: rule.id } });
    for (const code of ['CAR', 'ATL']) await db.nflTeam.create({ data: { code, city: code, name: code, conference: 'NFC', division: 'South' } });
    const parsed = normalizeEspn(await fetchEspn('summary?event=401671827'), 2024, 18);
    assert.deepEqual(parsed.errors, []);
    async function run(p = parsed) {
      const batch = await db.statImport.create({ data: { uploadedBy: 'SYSTEM', filename: 'test', mode: 'EVENT', provider: 'espn',
        contentHash: randomUUID(), status: 'QUEUED', reason: 'Isolated ESPN verification', rows: json(p), preview: {} } });
      await processImport(batch.id);
      return batch.id;
    }
    const first = await run();
    await processImport(first);
    await run();
    assert.equal(await db.kickingEvent.count(), 13);
    assert.equal(await db.player.count(), 2);
    assert.equal(await db.player.count({ where: { imageUrl: { not: null } } }), 2);
    const atl = await db.teamWeekScore.findFirstOrThrow({ where: { teamCode: 'ATL' } });
    assert.equal(atl.points, 1);
    const missed = await db.kickingEvent.findFirstOrThrow({ where: { result: 'MISSED' } });
    await db.$transaction(async tx => {
      await tx.kickingEvent.update({ where: { id: missed.id }, data: { result: 'MADE' } });
      await audit(tx, 'TEST_ADMIN', 'EVENT_CORRECTED', missed.id, 'Override verification');
    });
    await run();
    assert.equal((await db.kickingEvent.findUniqueOrThrow({ where: { id: missed.id } })).result, 'MADE');
    assert.equal((await db.teamWeekScore.findFirstOrThrow({ where: { teamCode: 'ATL' } })).points, -1);
    const removed = parsed.rows.find(r => r.event.providerEventId !== missed.providerEventId)!;
    await run({ ...parsed, rows: parsed.rows.filter(r => r !== removed) });
    assert.ok((await db.kickingEvent.findUniqueOrThrow({ where: { provider_providerEventId: { provider: 'espn', providerEventId: removed.event.providerEventId } } })).voidedAt);
    await db.week.update({ where: { season_week: { season: 2024, week: 18 } }, data: { lockedAt: new Date() } });
    await assert.rejects(run(), /locked/);
    console.log('PASS: real game import, scores, images, replay idempotency, admin override, source removal, locked week; isolated schema:', url.searchParams.get('schema'));
  } finally { await db.$disconnect(); }
}
void main().catch(e => { console.error(e); process.exitCode = 1; });
