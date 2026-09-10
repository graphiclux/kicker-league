import { PrismaClient, Prisma } from '@prisma/client';
export const db = new PrismaClient();
export type Tx = Prisma.TransactionClient;
export const json = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v));
export async function audit(
  tx: Tx,
  actorId: string,
  action: string,
  entityId: string,
  reason: string,
  before?: unknown,
  after?: unknown,
  leagueId?: string,
) {
  return tx.auditLog.create({
    data: {
      actorId,
      action,
      entityId,
      reason,
      before: before === undefined ? undefined : json(before),
      after: after === undefined ? undefined : json(after),
      leagueId,
    },
  });
}
export async function outbox(tx: Tx, topic: string, payload: unknown) {
  await tx.outbox.create({ data: { topic, payload: json(payload) } });
}
export async function mailOutbox(tx: Tx, input: {
  to: string; subject: string; eyebrow: string; title: string; copy: string; text?: string; url?: string; button?: string;
}) {
  await outbox(tx, 'mail.send', input);
}
export async function lockLeague(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM "League" WHERE id=${id} FOR UPDATE`;
}
export async function lockWeek(tx: Tx, season: number, week: number, allowLocked = false) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${season}::integer, ${week}::integer)`;
  const s = await tx.season.findUnique({ where: { year: season }, include: { rule: true } });
  if (!s) throw new Error(`Season ${season} does not exist`);
  const w = await tx.week.upsert({
    where: { season_week: { season, week } },
    create: { season, week },
    update: {},
  });
  if (w.lockedAt && !allowLocked) throw new Error(`Season ${season}, week ${week} is locked`);
  return s;
}
