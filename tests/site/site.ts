import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";

import { expect, test as base } from "@playwright/test";

// The static site tests (playwright.site.config.ts) run against the build in
// out/, which holds the published written articles and never the demo
// fixtures, so they find their pages and articles in the build itself.

/** The site's path on GitHub Pages, as in next.config.ts. */
const BASE_PATH = "/newslingo";

const OUT = join(process.cwd(), "out");

/** A path on the static site: `site("/search/")` is `/newslingo/search/`. */
export const site = (path: string) => `${BASE_PATH}${path}`;

/**
 * Every page the build wrote, by its address. Next.js's own copies of the
 * not-found page are left out; a missing address tests that page instead.
 */
export function builtPages() {
  return readdirSync(OUT, { recursive: true, encoding: "utf8" })
    .map((path) => path.split(sep).join("/"))
    .filter((path) => /(?:^|\/)index\.html$/.test(path))
    .filter((path) => !/^(?:404|_not-found)\//.test(path))
    .map((path) => site(`/${path.replace(/index\.html$/, "")}`))
    .sort();
}

type IndexedArticle = {
  slug: string;
  title: string;
  difficulty: string;
};

/** The published articles, newest first, as the search index lists them. */
export function indexedArticles(): IndexedArticle[] {
  return (
    JSON.parse(readFileSync(join(OUT, "search-index.json"), "utf8")) as {
      articles: IndexedArticle[];
    }
  ).articles;
}

/**
 * Fails a test whose pages break their content security policy, log an error
 * or throw one. A test that expects an error, such as the not-found page's
 * own 404, lists it with `test.use({ expectedErrors })`.
 */
export const test = base.extend<{ expectedErrors: RegExp[] }>({
  expectedErrors: [[], { option: true }],
  // Playwright's guides name the second argument `use`, which React's hook
  // rule would take for React's `use`.
  page: async ({ page, expectedErrors }, provide) => {
    const problems: string[] = [];

    await page.exposeFunction("reportPolicyViolation", (violation: string) => {
      problems.push(`policy violation: ${violation}`);
    });
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        (
          window as unknown as { reportPolicyViolation(text: string): void }
        ).reportPolicyViolation(
          `${event.violatedDirective} blocked ${event.blockedURI || "inline code"}`,
        );
      });
    });
    page.on("pageerror", (error) =>
      problems.push(`uncaught: ${error.message}`),
    );
    page.on("console", (message) => {
      const text = message.text();

      if (
        message.type() === "error" &&
        !expectedErrors.some((pattern) => pattern.test(text))
      ) {
        problems.push(`console error: ${text}`);
      }
    });

    await provide(page);

    expect(problems).toEqual([]);
  },
});

export { expect };
