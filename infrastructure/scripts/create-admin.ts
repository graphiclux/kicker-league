import { PrismaClient } from '@prisma/client';
import { passwordHash } from '../../apps/api/src/auth';
const db = new PrismaClient();
async function main() {
  const email = process.env.ADMIN_EMAIL,
    password = process.env.ADMIN_PASSWORD;
  if (!email || !email.includes('@') || !password || password.length < 16)
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (16+ characters) in the environment');
  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      displayName: 'Commissioner',
      role: 'SUPER_ADMIN',
      passwordHash: await passwordHash(password),
      verifiedAt: new Date(),
    },
  });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: 'ADMIN_BOOTSTRAPPED',
      entityId: user.id,
      reason: 'Initial administrator created through deployment CLI',
    },
  });
  console.log('Administrator created:', user.email);
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
