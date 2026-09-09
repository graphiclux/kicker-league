import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const pass = process.env.APP_DB_PASSWORD;
  if (!pass || !/^[a-f0-9]{64}$/.test(pass))
    throw new Error('APP_DB_PASSWORD must be a random 64-character hex string');
  const exists = await db.$queryRaw<any[]>`SELECT rolname FROM pg_roles WHERE rolname='aing_app'`;
  if (!exists.length) await db.$executeRawUnsafe(`CREATE ROLE aing_app LOGIN PASSWORD '${pass}'`);
  else await db.$executeRawUnsafe(`ALTER ROLE aing_app PASSWORD '${pass}'`);
  await db.$executeRawUnsafe('GRANT CONNECT ON DATABASE aing TO aing_app');
  await db.$executeRawUnsafe('GRANT USAGE ON SCHEMA public TO aing_app');
  await db.$executeRawUnsafe(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aing_app',
  );
  await db.$executeRawUnsafe('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aing_app');
  await db.$executeRawUnsafe(
    'REVOKE UPDATE, DELETE ON "AuditLog", "ScoringRule", "Roster" FROM aing_app',
  );
  await db.$executeRawUnsafe('REVOKE ALL ON "_prisma_migrations" FROM aing_app');
  console.log('Runtime role provisioned with DML-only access and immutable tables protected.');
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
