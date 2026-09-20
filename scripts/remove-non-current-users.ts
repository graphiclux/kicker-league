import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const admin = await db.user.findFirstOrThrow({ where: { role: 'SUPER_ADMIN', deletedAt: null } });
  const league = await db.league.findFirstOrThrow({ where: { name: "And It's No Good · 2026", status: { not: 'ARCHIVED' } } });
  const removable = await db.user.findMany({
    where: {
      deletedAt: null,
      role: { not: 'SUPER_ADMIN' },
      teams: { none: { leagueId: league.id } },
    },
    select: { id: true, email: true, displayName: true },
  });
  const deletedAt = new Date();
  await db.$transaction(async (tx) => {
    for (const user of removable) {
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.authToken.deleteMany({ where: { userId: user.id } });
      await tx.pushDevice.deleteMany({ where: { userId: user.id } });
      await tx.notification.deleteMany({ where: { userId: user.id } });
      await tx.user.update({
        where: { id: user.id },
        data: {
          email: `deleted+${user.id}@invalid.local`,
          displayName: 'Deleted user',
          passwordHash: await argon2.hash(randomBytes(32).toString('hex')),
          notificationsEnabled: false,
          emailScoringEnabled: false,
          emailDraftEnabled: false,
          emailLeagueEnabled: false,
          emailSecurityEnabled: false,
          deletedAt,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: 'USER_REMOVED_OUTSIDE_CURRENT_LEAGUE',
          entityId: user.id,
          reason: `Removed account outside ${league.name}`,
          before: { email: user.email, displayName: user.displayName },
          after: { deletedAt, leagueId: league.id },
        },
      });
    }
  });
  console.log(JSON.stringify({ leagueId: league.id, removed: removable.length, emails: removable.map((user) => user.email) }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
