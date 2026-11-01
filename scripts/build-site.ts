// Builds the static site for GitHub Pages into out/ (IMPLEMENTATION_PLAN.md
// M9), the way the Pages workflow does:
//
//   pnpm site:build
//
// It empties the site database, SITE_DATABASE_URL, by default newslingo_site
// on DATABASE_URL's server, creating it if it is missing. It then applies the
// migrations, provisions the reference data and imports the written articles,
// publishing the ones whose files are marked, so the site never holds demo
// articles. Then `next build` renders every public page, and each article's
// word file, from that database. Last, every page gets its content security
// policy, and the site is checked for anything that must not be published
// (scripts/site-security.ts). SITE_URL sets the site's address; it must end
// with the base path in next.config.ts.
//
// Like `pnpm build`, it writes .next, so run `pnpm build` again before
// `pnpm start`. The dev server's .next/dev is left alone.
import { spawn } from "node:child_process";

import nextEnv from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";

import { WRITTEN_ARTICLES } from "../prisma/editorial/articles";
import { DEMO_ARTICLES, DEMO_SOURCE_NAME } from "../prisma/fixtures/articles";
import { DEMO_DRAFTS } from "../prisma/fixtures/drafts";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  parsePostgresUrl,
  requireSiteDatabaseUrl,
} from "../src/lib/database-env";
import { checkSite, secureSite } from "./site-security";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const SITE_URL =
  process.env.SITE_URL ?? "https://balimkonuksever.github.io/newslingo";

function defaultSiteDatabaseUrl() {
  const url = new URL(
    parsePostgresUrl("DATABASE_URL", process.env.DATABASE_URL),
  );
  url.pathname = "/newslingo_site";

  return url.toString();
}

const siteDatabaseUrl = requireSiteDatabaseUrl(
  process.env.SITE_DATABASE_URL ?? defaultSiteDatabaseUrl(),
);
const siteDatabase = new URL(siteDatabaseUrl);
const databaseName = decodeURIComponent(siteDatabase.pathname.slice(1));

/** Creates the site database if it is missing, then empties it. */
async function prepareDatabase() {
  const server = new URL(siteDatabaseUrl);
  server.pathname = "/postgres";
  server.search = "";

  const admin = new PrismaClient({
    adapter: new PrismaPg({ connectionString: server.toString() }),
  });

  try {
    const existing = await admin.$queryRaw<unknown[]>`
      SELECT 1 FROM pg_database WHERE datname = ${databaseName}`;

    if (existing.length === 0) {
      if (!/^[a-z0-9_]+$/u.test(databaseName)) {
        throw new Error(`Cannot create a database named "${databaseName}".`);
      }
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
    }
  } finally {
    await admin.$disconnect();
  }

  const site = new PrismaClient({
    adapter: new PrismaPg({ connectionString: siteDatabaseUrl }),
  });

  try {
    await site.$executeRawUnsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await site.$executeRawUnsafe("CREATE SCHEMA public");
  } finally {
    await site.$disconnect();
  }
}

// Builds never call a live model, even when .env.local configures one.
const environment: NodeJS.ProcessEnv = {
  ...process.env,
  DATABASE_URL: siteDatabaseUrl,
  DICTIONARY_PROVIDER: "none",
  NEXT_PUBLIC_SITE_URL: SITE_URL,
};
delete environment.ANTHROPIC_API_KEY;

async function run(label: string, args: string[], extra = {}) {
  console.log(`\n▸ ${label}`);

  const code = await new Promise<number>((resolve, reject) => {
    const child = spawn("pnpm", ["exec", ...args], {
      env: { ...environment, ...extra },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (exitCode) => resolve(exitCode ?? 1));
  });

  if (code !== 0) {
    throw new Error(`${label} failed. Nothing was deployed.`);
  }
}

console.log(
  `Building the static site for ${SITE_URL} from the database "${databaseName}" at ${siteDatabase.host}.`,
);
console.log("\n▸ Emptying the site database");
await prepareDatabase();
await run("Applying the migrations", ["prisma", "migrate", "deploy"]);
await run("Provisioning the reference data", [
  "tsx",
  "prisma/seed.ts",
  "reference",
]);
await run("Importing the written articles", [
  "tsx",
  "scripts/import-articles.ts",
]);
await run("Building the static site into out/", ["next", "build"], {
  SITE_BUILD: "1",
});
// The site build's route types leave out the admin; put the local ones back.
await run("Restoring the local server's route types", ["next", "typegen"]);

console.log("\n▸ Adding each page's content security policy");
console.log(`Secured ${await secureSite("out")} pages.`);

console.log("\n▸ Checking the site for anything that must not be published");
const problems = await checkSite("out", {
  published: WRITTEN_ARTICLES.filter((article) => article.publishedOnSite).map(
    ({ slug }) => slug,
  ),
  forbidden: [
    ...[...DEMO_ARTICLES, ...DEMO_DRAFTS].map(({ slug }) => ({
      text: slug,
      what: "a demo article",
    })),
    ...WRITTEN_ARTICLES.filter((article) => !article.publishedOnSite).map(
      ({ slug }) => ({ text: slug, what: "a draft" }),
    ),
    { text: DEMO_SOURCE_NAME, what: "the demo articles' source" },
    { text: "newslingo.example", what: "a demo article's address" },
  ],
});

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(`  ✗ ${problem}`);
  }
  throw new Error("The site failed its check. Nothing was deployed.");
}
console.log("\nThe static site is in out/.");
