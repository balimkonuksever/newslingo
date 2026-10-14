// Seeds the database named by DATABASE_URL.
//
//   tsx prisma/seed.ts reference   production-safe categories and expressions
//   tsx prisma/seed.ts demo        demo articles (local databases only)
//   tsx prisma/seed.ts [all]       both; this is what `prisma db seed` runs
import nextEnv from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  assertDemoSeedAllowed,
  parsePostgresUrl,
} from "../src/lib/database-env";
import {
  provisionReferenceData,
  seedDemoArticles,
  seedDemoDictionary,
  seedDemoExpressions,
  seedDemoKeyVocabulary,
} from "./seeders";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const targets = ["all", "reference", "demo"] as const;
const target = targets.find((name) => name === (process.argv[2] ?? "all"));

if (!target) {
  throw new Error(
    `Unknown seed target "${process.argv[2]}". Use one of: ${targets.join(", ")}.`,
  );
}

const databaseUrl = parsePostgresUrl("DATABASE_URL", process.env.DATABASE_URL);
const { hostname, port, pathname } = new URL(databaseUrl);

// Run the guard before connecting so that a refused run writes nothing.
if (target !== "reference") {
  assertDemoSeedAllowed({ nodeEnv: process.env.NODE_ENV, databaseUrl });
}

console.log(
  `Seeding ${target} into database "${decodeURIComponent(pathname.slice(1))}" at ${hostname}:${port || "5432"}.`,
);

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

try {
  if (target !== "demo") {
    const { categories, expressions } = await provisionReferenceData(db);
    console.log(
      `Provisioned ${categories} reference categories and ${expressions} expressions.`,
    );
  }

  if (target !== "reference") {
    const { articles, paragraphs } = await seedDemoArticles(db);
    console.log(
      `Seeded ${articles} demo articles with ${paragraphs} paragraph pairs.`,
    );

    const { entries, senses } = await seedDemoDictionary(db);
    console.log(
      `Seeded ${entries} dictionary entries from ${senses} word senses.`,
    );

    const { words } = await seedDemoKeyVocabulary(db);
    console.log(`Linked ${words} key vocabulary words to the demo articles.`);

    const { occurrences } = await seedDemoExpressions(db);
    console.log(
      `Marked ${occurrences} expression occurrences in the demo articles.`,
    );
  }
} finally {
  await db.$disconnect();
}
