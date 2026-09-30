// Empties the test database named by DATABASE_URL, then loads the reference
// categories and expressions, the demo articles, their dictionary entries and
// their expression occurrences, so browser tests start from a known state.
// Run it through the guarded runner: `pnpm db:reset:test`.
import nextEnv from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";

import {
  provisionReferenceData,
  seedDemoArticles,
  seedDemoDictionary,
  seedDemoExpressions,
} from "../prisma/seeders";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  assertDemoSeedAllowed,
  requireTestDatabaseUrl,
} from "../src/lib/database-env";
import { emptyDatabase } from "../tests/support/empty-database";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const databaseUrl = requireTestDatabaseUrl(
  "DATABASE_URL",
  process.env.DATABASE_URL,
);
assertDemoSeedAllowed({ nodeEnv: process.env.NODE_ENV, databaseUrl });

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

try {
  await emptyDatabase(db);
  await provisionReferenceData(db);
  const { articles } = await seedDemoArticles(db);
  await seedDemoDictionary(db);
  await seedDemoExpressions(db);

  console.log(`Reset the test database and loaded ${articles} demo articles.`);
} finally {
  await db.$disconnect();
}
