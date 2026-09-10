import { db, json, outbox } from '../../apps/api/src/db';
import { digest } from '../../packages/core/src/providers';
import { fetchEspn, normalizeEspn, shouldFetchEspnGame } from '../../packages/core/src/espn';
import { writeFileSync } from 'node:fs';
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: 1 });

const interval = Number(process.env.NFL_AUTO_SYNC_INTERVAL_MINUTES || 10);
if (!Number.isFinite(interval) || interval < 1) throw new Error('Invalid NFL_AUTO_SYNC_INTERVAL_MINUTES');
let stopping = false;

async function sync() {
  const events = new Map<string, { event: any; season: number; week: number }>();
  // Explicit dates retain Sunday games across ESPN's weekly scoreboard rollover.
  for (let day = 0; day < 3; day++) {
    const date = new Date(Date.now() - day * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
    const board = await fetchEspn(`scoreboard?dates=${date}&limit=100`);
    for (const event of board.events || []) {
      if (event.season?.type !== 2 || !shouldFetchEspnGame(event)) continue;
      events.set(event.id, { event, season: event.season.year, week: event.week?.number || board.week?.number });
    }
  }
  let failures = 0;
  for (const { event, season, week } of events.values()) {
    try {
      const summary = await fetchEspn(`summary?event=${encodeURIComponent(event.id)}`);
      const parsed = normalizeEspn(summary, season, week);
      if (parsed.errors.length) throw new Error(parsed.errors.join('; '));
      if (!parsed.rows.length) continue;
      const contentHash = digest(JSON.stringify(parsed.rows.map(r => ({ event: r.event, raw: r.raw }))));
      await db.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(918273::integer, ${Number(event.id)}::integer)`;
        if (!await tx.season.findUnique({ where: { year: season } })) throw new Error(`Configure scoring rules for season ${season} first`);
        const latest = await tx.statImport.findFirst({ where: { provider: 'espn', filename: `espn-${event.id}.json`, status: { in: ['QUEUED', 'COMPLETED'] } }, orderBy: { createdAt: 'desc' } });
        if (latest?.status === 'QUEUED' || latest?.contentHash === contentHash) return;
        const batch = await tx.statImport.create({ data: {
          uploadedBy: 'SYSTEM', filename: `espn-${event.id}.json`, mode: 'EVENT', provider: 'espn', contentHash,
          status: 'QUEUED', reason: 'Automatic ESPN game refresh', rows: json(parsed),
          preview: json({ validRows: parsed.rows.length, errors: [], warnings: [] }),
        } });
        await outbox(tx, 'import.queued', { importId: batch.id });
        console.log(`ESPN queued ${parsed.rows.length} kicks: season ${season}, week ${week}, game ${event.id}`);
      });
    } catch (error) { failures++; console.error(`ESPN game ${event.id} failed:`, (error as Error).message); }
  }
  if (failures) throw new Error(`${failures} ESPN games failed validation or import`);
  await redis.set('aing:nfl:status', JSON.stringify({ checkedAt: new Date().toISOString(), games: [...events.values()].map(({event, season, week}) => ({
    id: event.id, season, week, state: event.status?.type?.state, detail: event.status?.type?.detail,
    teams: (event.competitions?.[0]?.competitors || []).map((c: any) => ({ code: c.team.abbreviation === 'WSH' ? 'WAS' : c.team.abbreviation, score: c.score })),
  })) }), 'EX', 3600);
  writeFileSync('/tmp/aing-espn-heartbeat', String(Date.now()));
  console.log(`ESPN poll complete: ${events.size} eligible games; next check in ${interval} minutes`);
}

async function loop() {
  while (!stopping) {
    try { await sync(); } catch (error) { console.error('ESPN sync failed:', (error as Error).message); }
    if (!stopping) await new Promise(resolve => setTimeout(resolve, interval * 60_000));
  }
}
process.on('SIGTERM', () => { stopping = true; void db.$disconnect().finally(() => process.exit(0)); });
void loop();
