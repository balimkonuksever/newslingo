import type { PrismaClient } from "../../src/generated/prisma/client";

/**
 * Deletes every row from every application table, keeping the migration
 * history. Callers must first confirm that `db` is connected to a test
 * database, for example with `requireTestDatabaseUrl`.
 */
export async function emptyDatabase(db: PrismaClient) {
  const tables = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) {
    return;
  }

  const tableList = tables
    .map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`)
    .join(", ");

  await db.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} CASCADE`);
}
