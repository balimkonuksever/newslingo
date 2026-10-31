// Imports the written articles in prisma/editorial/articles into the
// database named by DATABASE_URL (milestone W): as drafts for review, or
// published when a file has the publication mark.
//
//   pnpm articles:import           check the files, show what would change, write
//   pnpm articles:import --check   check the files only, without a database
//
// Any invalid file refuses the whole batch, and so does a changed article
// that is no longer a draft. Writing to a database that is not on this
// machine waits for its host to be typed. Demo articles are never imported.
import { createInterface } from "node:readline/promises";

import nextEnv from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";

import {
  ArticleImportError,
  type ImportStep,
  importArticles,
  planArticleImport,
} from "../prisma/article-import";
import { EDITORIAL_DICTIONARY } from "../prisma/editorial/dictionary";
import { WRITTEN_ARTICLES } from "../prisma/editorial/articles";
import { DEMO_ARTICLES, demoSourceUrl } from "../prisma/fixtures/articles";
import { DEMO_DRAFTS } from "../prisma/fixtures/drafts";
import { REFERENCE_EXPRESSIONS } from "../prisma/reference/expressions";
import {
  resolveWrittenArticles,
  WrittenArticlesError,
} from "../prisma/written-articles";
import { PrismaClient } from "../src/generated/prisma/client";
import { isLocalDatabaseHost, parsePostgresUrl } from "../src/lib/database-env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const checkOnly = process.argv.includes("--check");
const demoArticles = [...DEMO_ARTICLES, ...DEMO_DRAFTS];

function describe(step: ImportStep) {
  switch (step.action) {
    case "create":
      return `  new        ${step.slug}${step.publish ? ", published" : ""}`;
    case "update":
      return `  changed    ${step.slug} (${step.changed.join(", ")})${step.publish ? ", published" : ""}`;
    case "unchanged":
      return `  unchanged  ${step.slug}`;
    case "refuse":
      return `  refused    ${step.slug} (${step.status.toLowerCase()})`;
  }
}

async function confirm(hostname: string) {
  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await prompt.question(
      `This database is not on this machine. Type its host, ${hostname}, to go on: `,
    );

    return answer.trim() === hostname;
  } finally {
    prompt.close();
  }
}

let resolved: ReturnType<typeof resolveWrittenArticles>;

try {
  resolved = resolveWrittenArticles(WRITTEN_ARTICLES, {
    dictionary: EDITORIAL_DICTIONARY,
    expressions: REFERENCE_EXPRESSIONS,
    demoArticles,
    demoSourceUrls: new Set(
      demoArticles.map(({ slug }) => demoSourceUrl(slug)),
    ),
  });
} catch (error) {
  if (error instanceof WrittenArticlesError) {
    console.error(`${error.message}\nNothing was written.`);
    process.exit(1);
  }

  throw error;
}

console.log(
  `${resolved.articles.length} written article(s) checked, with ${resolved.vocabularyRows.length} dictionary entries.`,
);

if (checkOnly) {
  process.exit(0);
}

const databaseUrl = parsePostgresUrl("DATABASE_URL", process.env.DATABASE_URL);
const { hostname, port, pathname } = new URL(databaseUrl);

console.log(
  `Importing into database "${decodeURIComponent(pathname.slice(1))}" at ${hostname}:${port || "5432"}.`,
);

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
let failed = false;

try {
  const plan = await planArticleImport(
    db,
    resolved.articles,
    resolved.vocabularyRows,
  );

  console.log(plan.steps.map(describe).join("\n") || "  no articles");
  console.log(
    `  dictionary: ${plan.entries.added} entries to add, ${plan.entries.changed} to correct`,
  );

  const writes = plan.steps.filter(
    ({ action }) => action === "create" || action === "update",
  ).length;

  if (plan.problems.length > 0) {
    throw new ArticleImportError(
      "Nothing was imported, because:",
      plan.problems,
    );
  }

  if (writes === 0 && plan.entries.added + plan.entries.changed === 0) {
    console.log("Nothing to change.");
  } else if (!isLocalDatabaseHost(hostname) && !(await confirm(hostname))) {
    console.log("Stopped. Nothing was changed.");
  } else {
    const result = await importArticles(
      db,
      resolved.articles,
      resolved.vocabularyRows,
    );

    console.log(
      `Done: ${result.created} new and ${result.updated} changed article(s), ${result.published} of them published, ${result.unchanged} unchanged; ${result.entries.added} dictionary entries added and ${result.entries.changed} corrected. Review the drafts at /admin/articles?status=draft.`,
    );
  }
} catch (error) {
  failed = true;

  if (error instanceof ArticleImportError) {
    console.error(error.message);
  } else {
    console.error(error);
  }
} finally {
  await db.$disconnect();
}

process.exit(failed ? 1 : 0);
