import { PrismaPg } from "@prisma/adapter-pg";

import { DEMO_DRAFTS } from "../../prisma/fixtures/drafts";
import { writeDemoArticles } from "../../prisma/seeders";
import { PrismaClient } from "../../src/generated/prisma/client";
import {
  assertDemoSeedAllowed,
  requireTestDatabaseUrl,
} from "../../src/lib/database-env";

// The articles the moderation tests change. Both Playwright projects run at
// once against one database, and other specs read the demo articles, so
// each test acts on its own copy of the demo draft, one per project. A test
// resets its copy before it starts, so a retry begins from the same state;
// the audit rows of an earlier attempt stay, as they must.

/** What a test does to its copy, which decides the copy's starting status. */
export type ModerationScenario = "publish" | "archive" | "signed-out";

const STARTING_STATUS = {
  publish: "DRAFT",
  archive: "PUBLISHED",
  "signed-out": "DRAFT",
} as const;

function connect() {
  const databaseUrl = requireTestDatabaseUrl(
    "DATABASE_URL",
    process.env.DATABASE_URL,
  );
  assertDemoSeedAllowed({ nodeEnv: process.env.NODE_ENV, databaseUrl });

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
}

/**
 * Writes `project`'s copy of the demo draft for `scenario` in its starting
 * status, and returns where to find it.
 */
export async function resetModerationArticle(
  project: string,
  scenario: ModerationScenario,
) {
  const [draft] = DEMO_DRAFTS;

  if (!draft) {
    throw new Error("The moderation tests need a demo draft.");
  }

  const status = STARTING_STATUS[scenario];
  const copy = {
    ...draft,
    slug: `${draft.slug}-${scenario}-${project}`,
    title: `${draft.title} (${scenario} test, ${project})`,
    publishedOnSiteAt:
      status === "PUBLISHED" ? new Date("2026-10-21T08:00:00Z") : null,
  };
  const db = connect();

  try {
    await writeDemoArticles(db, [copy], status);

    return await db.article.findUniqueOrThrow({
      where: { slug: copy.slug },
      select: { id: true, slug: true, title: true },
    });
  } finally {
    await db.$disconnect();
  }
}

/** An article's status and number of audit rows, straight from the database. */
export async function moderationState(articleId: string) {
  const db = connect();

  try {
    const { status, _count } = await db.article.findUniqueOrThrow({
      where: { id: articleId },
      select: { status: true, _count: { select: { moderationEvents: true } } },
    });

    return { status, events: _count.moderationEvents };
  } finally {
    await db.$disconnect();
  }
}

/** The demo draft that the seed writes and no test changes. */
export async function demoDraft() {
  const db = connect();

  try {
    return await db.article.findUniqueOrThrow({
      where: { slug: DEMO_DRAFTS[0]?.slug },
      select: { id: true, slug: true, title: true },
    });
  } finally {
    await db.$disconnect();
  }
}
