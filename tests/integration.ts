import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { io } from 'socket.io-client';
import supertest from 'supertest';
const db = new PrismaClient(),
  base = process.env.TEST_API_URL || 'http://api:3001/api',
  tag = randomUUID().slice(0, 8);
let checks = 0;
async function request(path: string, body?: unknown, token?: string, expected = 200) {
  let req = body === undefined ? supertest(base).get(path) : supertest(base).post(path).send(body);
  if (token) req = req.set('Authorization', `Bearer ${token}`);
  const r = await req;
  assert.equal(r.status, expected, `${path}: ${JSON.stringify(r.body)}`);
  checks++;
  return r.body;
}

async function main() {
  const health = await request('/health');
  assert.equal(health.database, 'ok');
  const admin = await request(
    '/auth/login',
    { email: 'admin@anditsnogood.local', password: 'NoGoodDemo2026!' },
    undefined,
    201,
  );
  const a = admin.accessToken;
  const users = [];
  for (let i = 0; i < 4; i++) {
    const email = `test-${tag}-${i}@example.test`;
    const u = await request(
      '/auth/register',
      { email, password: 'Integration2026!', displayName: `Integration ${i}` },
      undefined,
      201,
    );
    users.push(u);
  }
  await request(
    '/leagues',
    { name: 'Unverified league', teamName: 'Test team', season: 2026, maxTeams: 2 },
    users[0].accessToken,
    403,
  );
  for (const u of users)
    await db.user.update({ where: { id: u.user.id }, data: { verifiedAt: new Date() } });
  const t = users.map((u) => u.accessToken);
  await request('/admin/audit', undefined, t[0], 403);
  await request(
    '/leagues',
    { name: 'Too big', teamName: 'Test team', season: 2026, maxTeams: 33 },
    t[0],
    400,
  );
  const l = await request(
    '/leagues',
    { name: `Integration ${tag}`, teamName: 'Owner team', season: 2026, maxTeams: 2 },
    t[0],
    201,
  );
  await request(`/leagues/${l.id}`, undefined, t[1], 403);
  const joins = await Promise.all(
    [1, 2].map(async (i) => {
      const r = await fetch(base + '/leagues/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t[i]}` },
        body: JSON.stringify({ inviteCode: l.inviteCode, teamName: `Challenger ${i}` }),
      });
      return { i, status: r.status };
    }),
  );
  assert.equal(
    joins.filter((j) => j.status === 201).length,
    1,
    'Exactly one simultaneous join wins last slot',
  );
  checks++;
  const challenger = joins.find((j) => j.status === 201)!.i;
  await request(`/leagues/${l.id}/draft/start`, {}, t[challenger], 403);
  let detail = await request(`/leagues/${l.id}`, undefined, t[0]);
  const ids = [
    detail.teams.find((x: any) => x.ownerId === users[0].user.id).id,
    detail.teams.find((x: any) => x.ownerId !== users[0].user.id).id,
  ];
  await request(`/leagues/${l.id}/draft/order`, { teamIds: ids }, t[0], 201);
  await request(`/leagues/${l.id}/configure`, { pickSeconds: 10 }, t[0], 201);
  const socket = io(new URL(base).origin, { auth: { token: t[0] }, transports: ['websocket'] });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket failed to authenticate')), 8000);
    socket.on('ready', () =>
      socket.emit('league.join', { leagueId: l.id }, (r: any) => {
        assert.equal(r.ok, true);
        clearTimeout(timer);
        resolve();
      }),
    );
    socket.on('connect_error', reject);
  });
  checks++;
  const event = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Draft broadcast not received')), 10000);
    socket.once('draft.updated', () => {
      clearTimeout(timer);
      resolve();
    });
  });
  await request(`/leagues/${l.id}/draft/start`, {}, t[0], 201);
  await event;
  checks++;
  await request(`/leagues/${l.id}/pick`, { teamCode: 'BUF' }, t[challenger], 400);
  const picks = await Promise.all(
    [1, 2].map(() =>
      fetch(base + `/leagues/${l.id}/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t[0]}` },
        body: JSON.stringify({ teamCode: 'BUF' }),
      }),
    ),
  );
  assert.equal(
    picks.filter((r) => r.status === 201).length,
    1,
    'Concurrent picks cannot allocate two positions',
  );
  checks++;
  await request(`/leagues/${l.id}/draft/pause`, {}, t[0], 201);
  await request(`/leagues/${l.id}/pick`, { teamCode: 'DAL' }, t[challenger], 400);
  await request(`/leagues/${l.id}/draft/resume`, {}, t[0], 201);
  // Worker timer must complete the final pick without any connected client action.
  for (let i = 0; i < 25; i++) {
    detail = await request(`/leagues/${l.id}`, undefined, t[0]);
    if (detail.status === 'COMPLETE') break;
    await new Promise((r) => setTimeout(r, 700));
  }
  assert.equal(detail.status, 'COMPLETE');
  assert.equal(detail.teams.filter((t: any) => t.roster).length, 2);
  checks++;
  await request(`/leagues/${l.id}/pick`, { teamCode: 'DAL' }, t[0], 400);
  await request(`/leagues/${l.id}/configure`, { maxTeams: 3 }, t[0], 400);
  socket.disconnect();
  // Another league can own BUF, and sees the exact same global score.
  const l2 = await request(
    '/leagues',
    { name: `Second ${tag}`, teamName: 'Second owner', season: 2026, maxTeams: 2 },
    t[0],
    201,
  );
  await request(
    '/leagues/join',
    { inviteCode: l2.inviteCode, teamName: 'Second challenger' },
    t[3],
    201,
  );
  const d2 = await request(`/leagues/${l2.id}`, undefined, t[0]);
  await request(
    `/leagues/${l2.id}/draft/order`,
    {
      teamIds: [
        d2.teams.find((x: any) => x.ownerId === users[0].user.id).id,
        d2.teams.find((x: any) => x.ownerId === users[3].user.id).id,
      ],
    },
    t[0],
    201,
  );
  await request(`/leagues/${l2.id}/draft/start`, {}, t[0], 201);
  await request(`/leagues/${l2.id}/pick`, { teamCode: 'BUF' }, t[0], 201);
  await request(`/leagues/${l2.id}/pick`, { teamCode: 'DAL' }, t[3], 201);
  const week = 20;
  const csv = `season,week,nfl_team,kicker,event_type,distance,result,event_id\n2026,${week},BUF,Test starter,FIELD_GOAL,27,MISSED,${tag}-1\n2026,${week},BUF,Test replacement,EXTRA_POINT,,MISSED,${tag}-2`;
  async function importCsv(text: string, mode = 'EVENT') {
    const p = await request(
      '/admin/imports/preview',
      {
        csv: text,
        filename: `integration-${tag}.csv`,
        mode,
        reason: 'Automated integration verification',
      },
      a,
      201,
    );
    assert.equal(p.status, 'PREVIEW', JSON.stringify(p.preview));
    await request(`/admin/imports/${p.id}/confirm`, {}, a, 201);
    for (let i = 0; i < 100; i++) {
      const b = await request(`/admin/imports/${p.id}`, undefined, a);
      if (b.status === 'FAILED') throw new Error(b.error);
      if (b.status === 'COMPLETED') return b;
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error('Import timed out');
  }
  await importCsv(csv);
  await importCsv(csv);
  const ev = await request(`/events?season=2026&week=${week}&teamCode=BUF`, undefined, a);
  assert.equal(
    ev.filter((e: any) => e.providerEventId.startsWith(tag) && !e.voidedAt).length,
    2,
    'Repeat import is idempotent',
  );
  checks++;
  for (const league of [l, l2]) {
    const s = await request(`/leagues/${league.id}/standings?week=${week}`, undefined, t[0]);
    assert.equal(
      s.find((r: any) => r.ownerId === users[0].user.id).weeklyPoints >= 5,
      true,
      'Starter and replacement combine across all leagues',
    );
  }
  checks++;
  const target = ev.find((e: any) => e.providerEventId === `${tag}-1`);
  await request(
    `/admin/events/${target.id}`,
    { result: 'MADE', reason: 'Verified correction test' },
    a,
    201,
  );
  await request('/admin/weeks/lock', { season: 2026, week, reason: 'Finalized test week' }, a, 201);
  await request(
    `/admin/events/${target.id}`,
    { result: 'MISSED', reason: 'Must reject locked correction' },
    a,
    400,
  );
  const blocked = await request(
    '/admin/imports/preview',
    { csv, filename: 'locked.csv', mode: 'EVENT', reason: 'Locked import must be rejected' },
    a,
    201,
  );
  assert.equal(blocked.status, 'INVALID');
  checks++;
  await request(
    '/admin/weeks/unlock',
    { season: 2026, week, reason: 'Unlock integration week' },
    a,
    201,
  );
  const before = await db.auditLog.count();
  let immutable = false;
  try {
    await db.auditLog.updateMany({ where: { entityId: target.id }, data: { reason: 'tamper' } });
  } catch {
    immutable = true;
  }
  assert.equal(immutable, true);
  assert.equal(await db.auditLog.count(), before);
  checks++;
  const summary = `season,week,nfl_team,fg_miss_under_30,fg_miss_30_plus,xp_miss_block,fg_made_over_50\n2026,${week},BUF,0,0,0,0`;
  await importCsv(summary, 'SUMMARY');
  const zero = await request(`/leagues/${l.id}/standings?week=${week}`, undefined, t[0]);
  assert.equal(
    zero.find((r: any) => r.ownerId === users[0].user.id).weeklyPoints,
    0,
    'Zero-count snapshot removes previous points',
  );
  checks++;
  // Rotation is single use, and logout revokes access immediately.
  const fresh = await request(
    '/auth/refresh',
    { refreshToken: users[0].refreshToken },
    undefined,
    201,
  );
  await request('/auth/refresh', { refreshToken: users[0].refreshToken }, undefined, 401);
  await request('/auth/logout', { refreshToken: fresh.refreshToken }, undefined, 201);
  await request('/auth/me', undefined, fresh.accessToken, 401);
  console.log(
    `PASS: ${checks} HTTP/database/realtime checks; concurrent capacity and picks, automatic draft clock, cross-league franchise inheritance, repeat imports, corrections, week locks, audit immutability, refresh rotation, logout.`,
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(process.exitCode || 0);
  });
