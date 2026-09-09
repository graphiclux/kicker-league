import { db, json, outbox } from '../../apps/api/src/db';
import { NflverseProvider, digest } from '../../packages/core/src/providers';
import { gunzipSync } from 'node:zlib';

const urlTemplate = process.env.NFLVERSE_PBP_URL;
const season = Number(process.env.NFL_AUTO_SYNC_SEASON || 0);
const weeks = (process.env.NFL_AUTO_SYNC_WEEKS || '').split(',').map(Number).filter(Boolean);
const interval = Math.max(1, Number(process.env.NFL_AUTO_SYNC_INTERVAL_MINUTES || 10)) * 60_000;

async function syncWeek(week: number) {
  if (!urlTemplate || !season) return;
  const url = new URL(urlTemplate.replace('{season}', String(season)).replace('{week}', String(week)));
  if (url.protocol !== 'https:') throw new Error('NFL provider URL must use HTTPS');
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000), redirect: 'error' });
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  const payload = Buffer.from(await response.arrayBuffer());
  const csv = (url.pathname.endsWith('.gz') || response.headers.get('content-type')?.includes('gzip') ? gunzipSync(payload) : payload).toString();
  const parsed = new NflverseProvider().normalize(csv);
  parsed.rows = parsed.rows.filter((r) => r.event.season === season && r.event.week === week);
  parsed.scopes = parsed.scopes.filter((s) => s.season === season && s.week === week);
  if (!parsed.rows.length) return;
  const importRow = await db.statImport.create({
    data: {
      uploadedBy: 'SYSTEM', filename: `auto-nflverse-${season}-${week}.csv`, mode: 'EVENT', provider: 'nflverse',
      contentHash: digest(csv), status: 'QUEUED', reason: 'Automatic game-day refresh', rows: json(parsed),
      preview: json({ validRows: parsed.rows.length, errors: parsed.errors, warnings: parsed.warnings }),
    },
  });
  await db.$transaction(async (tx) => {
    await outbox(tx, 'import.queued', { importId: importRow.id });
  });
  console.log(`Queued ${parsed.rows.length} NFL events for ${season} week ${week}`);
}

async function run() {
  for (const week of weeks) await syncWeek(week);
}
if (urlTemplate && season && weeks.length) {
  void run().catch((e) => console.error('NFL auto-sync failed', e));
  setInterval(() => void run().catch((e) => console.error('NFL auto-sync failed', e)), interval);
} else console.log('NFL auto-sync disabled; set NFL_AUTO_SYNC_SEASON and NFL_AUTO_SYNC_WEEKS');
process.on('SIGTERM', () => db.$disconnect().finally(() => process.exit(0)));
