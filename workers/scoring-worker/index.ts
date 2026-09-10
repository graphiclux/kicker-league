import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { db, json } from '../../apps/api/src/db';
import { processImport } from '../../apps/api/src/scoring.service';
import { runDraftClocks } from '../../apps/api/src/draft.service';
import { sendProductMail } from '../../apps/api/src/auth';
const connection = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
const queue = new Queue('aing-imports', { connection });
const worker = new Worker('aing-imports', async (job) => processImport(job.data.importId), {
  connection,
  concurrency: 2,
});
worker.on('failed', (job, e) => console.error('Import failed', job?.id, e.message));
let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    const messages = await db.outbox.findMany({
      where: {
        deliveredAt: null,
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    for (const m of messages) {
      try {
        const p = m.payload as any;
        if (m.topic === 'push.send') {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(process.env.EXPO_ACCESS_TOKEN
                ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
                : {}),
            },
            body: JSON.stringify(p),
            signal: AbortSignal.timeout(10000),
          });
          if (!response.ok) throw new Error(`Expo push returned ${response.status}`);
          const ticket = (await response.json()) as any;
          if (ticket.data?.status === 'error') {
            if (ticket.data.details?.error === 'DeviceNotRegistered')
              await db.pushDevice.deleteMany({ where: { token: p.to } });
            else throw new Error(`Push delivery rejected: ${ticket.data?.message}`);
          } else if (ticket.data?.id) {
            await db.outbox.create({
              data: {
                topic: 'push.receipt',
                nextAttemptAt: new Date(Date.now() + 15 * 60 * 1000),
                payload: json({ ticketId: ticket.data.id, token: p.to }),
              },
            });
          }
        } else if (m.topic === 'mail.send') {
          await sendProductMail(p);
        } else if (m.topic === 'push.receipt') {
          const r = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(process.env.EXPO_ACCESS_TOKEN
                ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
                : {}),
            },
            body: JSON.stringify({ ids: [p.ticketId] }),
            signal: AbortSignal.timeout(10000),
          });
          if (!r.ok) throw new Error(`Push receipt request returned ${r.status}`);
          const data = (await r.json()) as any;
          const receipt = data.data?.[p.ticketId];
          if (!receipt && Date.now() - m.createdAt.getTime() < 24 * 60 * 60 * 1000) {
            await db.outbox.update({
              where: { id: m.id },
              data: { nextAttemptAt: new Date(Date.now() + 15 * 60 * 1000) },
            });
            continue;
          }
          if (receipt?.details?.error === 'DeviceNotRegistered')
            await db.pushDevice.deleteMany({ where: { token: p.token } });
        } else if (m.topic === 'import.queued') {
          // Outbox IDs are unique per confirmation, allowing a failed import to be retried.
          await queue.add(
            'import',
            { importId: p.importId },
            { jobId: m.id, removeOnComplete: 100, removeOnFail: 200 },
          );
        } else {
          await connection.publish('aing:events', JSON.stringify({ topic: m.topic, payload: p }));
          if (m.topic === 'scores.updated')
            await db.$transaction(async (tx) => {
              // Transactional marker prevents duplicate inbox notifications on worker retries.
              await tx.$queryRaw`SELECT id FROM "Outbox" WHERE id=${m.id} FOR UPDATE`;
              if ((await tx.outbox.findUniqueOrThrow({ where: { id: m.id } })).deliveredAt) return;
              const teams = await tx.fantasyTeam.findMany({
                where: {
                  league: { season: p.season },
                  roster: { isNot: null },
                  owner: { notificationsEnabled: true },
                },
                include: { roster: true },
              });
              for (const t of teams) {
                const s = await tx.teamWeekScore.findUnique({
                  where: {
                    season_week_teamCode: {
                      season: p.season,
                      week: p.week,
                      teamCode: t.roster!.teamCode,
                    },
                  },
                });
                const title = "It's no good! Scores updated";
                const body = `${t.name}: ${t.roster!.teamCode} has ${s?.points || 0} points in week ${p.week}.`;
                await tx.notification.create({
                  data: { userId: t.ownerId, title, body, data: json(p) },
                });
                await tx.outbox.create({
                  data: {
                    topic: 'mail.send',
                    payload: json({
                      to: (await tx.user.findUniqueOrThrow({ where: { id: t.ownerId }, select: { email: true } })).email,
                      subject: `Week ${p.week} scoring update: ${t.roster!.teamCode}`,
                      eyebrow: 'SCORING UPDATE',
                      title: 'The scoreboard has moved.',
                      copy: `${t.name} picked the ${t.roster!.teamCode} kicking position. It now has ${s?.points || 0} fantasy points for week ${p.week}. The misses are adding up nicely.`,
                      url: `${process.env.WEB_URL}/`,
                      button: 'Open the clubhouse',
                    }),
                  },
                });
                const devices = await tx.pushDevice.findMany({ where: { userId: t.ownerId } });
                for (const device of devices)
                  await tx.outbox.create({
                    data: {
                      topic: 'push.send',
                      payload: json({ to: device.token, title, body, data: p }),
                    },
                  });
              }
              await tx.outbox.update({ where: { id: m.id }, data: { deliveredAt: new Date() } });
            });
        }
        await db.outbox.update({
          where: { id: m.id },
          data: { deliveredAt: new Date(), lastError: null },
        });
      } catch (e) {
        console.error('Outbox delivery failed', m.id, (e as Error).message);
        await db.outbox.update({
          where: { id: m.id },
          data: {
            attempts: { increment: 1 },
            lastError: (e as Error).message,
            nextAttemptAt: new Date(
              Date.now() + Math.min(3600000, 1000 * 2 ** Math.min(m.attempts, 12)),
            ),
          },
        });
      }
    }
  } catch (e) {
    console.error('Worker tick failed', e);
  } finally {
    running = false;
  }
}
let clocksRunning = false;
let lastReminderCheck = 0;
async function clocks() {
  if (clocksRunning) return;
  clocksRunning = true;
  try {
    await runDraftClocks();
    await sendDraftReminders();
    await connection.set('aing:worker:heartbeat', String(Date.now()), 'EX', 20);
  } catch (e) {
    console.error('Draft clock failed', e);
  } finally {
    clocksRunning = false;
  }
}
async function sendDraftReminders() {
  const now = Date.now();
  if (now - lastReminderCheck < 60_000) return;
  lastReminderCheck = now;
  const leagues = await db.league.findMany({
    where: { status: 'LOBBY', scheduledAt: { gt: new Date(now), lte: new Date(now + 24 * 60 * 60 * 1000) } },
    include: { teams: { include: { owner: true } } },
  });
  for (const league of leagues) {
    const remaining = league.scheduledAt!.getTime() - now;
    const threshold = remaining <= 15 * 60 * 1000 ? '15m' : '24h';
    const key = `aing:mail:draft-reminder:${league.id}:${threshold}`;
    if ((await connection.set(key, '1', 'EX', 3 * 24 * 60 * 60, 'NX')) !== 'OK') continue;
    for (const team of league.teams) await db.outbox.create({
      data: {
        topic: 'mail.send',
        payload: json({
          to: team.owner.email,
          subject: `${league.name} draft starts ${threshold === '15m' ? 'in 15 minutes' : 'tomorrow'}`,
          eyebrow: 'DRAFT REMINDER',
          title: threshold === '15m' ? 'The clock is almost ticking.' : 'Your draft is on the horizon.',
          copy: `The ${league.name} draft is scheduled for ${league.scheduledAt!.toLocaleString()}. Set your rankings, pick your poison, and be ready.`,
          url: `${process.env.WEB_URL}/`, button: 'Open the draft room',
        }),
      },
    });
  }
}
const clockTimer = setInterval(clocks, 1000);
void clocks();
const timer = setInterval(tick, 1000);
void tick();
async function stop() {
  clearInterval(timer);
  clearInterval(clockTimer);
  await worker.close();
  await queue.close();
  await connection.quit();
  await db.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
