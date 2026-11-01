// Secures and checks the static site in out/ after `next build`
// (IMPLEMENTATION_PLAN.md M9, security). `pnpm site:build` runs both steps,
// so a site that fails the check is never deployed.
//
// GitHub Pages cannot send response headers, so every page carries its content
// security policy in a <meta> tag, first in its <head>. Next.js writes each
// page's React payload into inline scripts, and a static page cannot carry a
// per-request nonce, so the policy allows exactly those scripts by their
// SHA-256 hashes: an injected script with any other content does not run.
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

/**
 * The site loads nothing from other origins and has no inline styles,
 * frames, plugins or workers. A <meta> tag cannot carry `frame-ancestors` or
 * reporting, so the policy leaves them out.
 */
const DIRECTIVES = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
];

const CHARSET = /<meta charset="utf-8"\s*\/?>/i;
const POLICY_TAG = /<meta http-equiv="Content-Security-Policy"/i;
const POLICY_FIRST =
  /<meta charset="utf-8"\s*\/?><meta http-equiv="Content-Security-Policy" content="[^"]+"\s*\/?>/i;
const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

// Scripts of these types run. Any other type, such as an article's JSON-LD,
// is data that the browser never executes, so the policy need not allow it.
const RUNNABLE_TYPES = new Set([
  "",
  "text/javascript",
  "application/javascript",
  "module",
]);

/** The hash of each inline script the page runs, as policy sources. */
export function inlineScriptHashes(html: string) {
  const hashes = new Set<string>();

  for (const [, attributes = "", body = ""] of html.matchAll(SCRIPT)) {
    const type = /\stype="([^"]*)"/i.exec(attributes)?.[1] ?? "";

    if (/\ssrc=/i.test(attributes) || !RUNNABLE_TYPES.has(type.toLowerCase())) {
      continue;
    }
    hashes.add(
      `'sha256-${createHash("sha256").update(body).digest("base64")}'`,
    );
  }

  return [...hashes];
}

/** The page's content security policy. */
export function contentSecurityPolicy(html: string) {
  const hashes = inlineScriptHashes(html);

  return DIRECTIVES.map((directive) =>
    directive.startsWith("script-src ")
      ? [directive, ...hashes].join(" ")
      : directive,
  ).join("; ");
}

/** Puts the page's policy first in its <head>, right after the charset. */
export function withContentSecurityPolicy(html: string) {
  if (POLICY_TAG.test(html)) {
    throw new Error("the page already has a content security policy");
  }
  const charset = CHARSET.exec(html);

  if (!charset) {
    throw new Error("the page has no <meta charset> to put its policy after");
  }
  const end = charset.index + charset[0].length;

  return `${html.slice(0, end)}<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy(html)}"/>${html.slice(end)}`;
}

/** Every file under `directory`, relative to it, with forward slashes. */
async function filesIn(directory: string) {
  const entries = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      relative(directory, join(entry.parentPath, entry.name))
        .split(sep)
        .join("/"),
    )
    .sort();
}

/** Adds every page's policy. Returns how many pages it secured. */
export async function secureSite(outDirectory: string) {
  const pages = (await filesIn(outDirectory)).filter((path) =>
    path.endsWith(".html"),
  );

  for (const page of pages) {
    const file = join(outDirectory, page);

    try {
      await writeFile(
        file,
        withContentSecurityPolicy(await readFile(file, "utf8")),
      );
    } catch (error) {
      throw new Error(`${page}: ${(error as Error).message}`);
    }
  }

  return pages.length;
}

export type SiteExpectations = {
  /** The slugs of the written articles whose files are marked published. */
  published: readonly string[];
  /** Text that no published file may contain, with what it would reveal. */
  forbidden: ReadonlyArray<{ text: string; what: string }>;
};

/** Server settings and secrets, which no published file may mention. */
const SERVER_TEXT = [
  { text: "DATABASE_URL", what: "a database setting" },
  { text: "BETTER_AUTH_SECRET", what: "the admin's secret setting" },
  { text: "ANTHROPIC_API_KEY", what: "the API key setting" },
  { text: "postgresql://", what: "a database address" },
  { text: "postgres://", what: "a database address" },
  { text: "PRIVATE KEY-----", what: "a private key" },
  { text: "sourceMappingURL=", what: "a link to a source map" },
];

const TEXT_FILE = /\.(?:html|txt|json|js|css|xml)$/;

function slugsOf(files: readonly string[], pattern: RegExp) {
  return new Set(files.flatMap((path) => pattern.exec(path)?.[1] ?? []));
}

/**
 * Lists everything in the built site that must not be published: the admin
 * and the dictionary endpoint, which stay on the user's computer, any article
 * but the published written ones, demo articles and drafts, server settings,
 * source maps, and pages without their content security policy. An empty list
 * means the site may be deployed.
 */
export async function checkSite(
  outDirectory: string,
  expected: SiteExpectations,
) {
  const problems: string[] = [];
  const files = await filesIn(outDirectory);

  for (const path of files) {
    if (/^(?:admin|api)\//.test(path) || /(?:^|\/)sign-in\//.test(path)) {
      problems.push(
        `${path} belongs to the admin or the dictionary endpoint, which stay on your computer.`,
      );
    }
    if (path.endsWith(".map")) {
      problems.push(`${path} is a source map.`);
    }
    if (/(?:^|\/)\.env/.test(path)) {
      problems.push(`${path} is an environment file.`);
    }
  }

  // Each published article, and no other, has a page, a word file and an
  // entry in the search index.
  const published = new Set(expected.published);
  let indexed = new Set<string>();

  try {
    const index = JSON.parse(
      await readFile(join(outDirectory, "search-index.json"), "utf8"),
    ) as { articles: Array<{ slug: string }> };
    indexed = new Set(index.articles.map(({ slug }) => slug));
  } catch {
    problems.push("search-index.json is missing or unreadable.");
  }
  const surfaces = [
    ["page", slugsOf(files, /^article\/([^/]+)\//)],
    ["word file", slugsOf(files, /^words\/([^/]+)\.json$/)],
    ["search entry", indexed],
  ] as const;

  for (const [surface, slugs] of surfaces) {
    for (const slug of slugs) {
      if (!published.has(slug)) {
        problems.push(
          `“${slug}” has a ${surface}, but no written article with that slug is marked published.`,
        );
      }
    }
    for (const slug of published) {
      if (!slugs.has(slug)) {
        problems.push(`The published article “${slug}” has no ${surface}.`);
      }
    }
  }

  const forbidden = [...SERVER_TEXT, ...expected.forbidden];

  for (const path of files.filter((file) => TEXT_FILE.test(file))) {
    const content = await readFile(join(outDirectory, path), "utf8");

    for (const { text, what } of forbidden) {
      if (content.includes(text)) {
        problems.push(`${path} contains ${what}: “${text}”.`);
      }
    }
    if (path.endsWith(".html") && !POLICY_FIRST.test(content)) {
      problems.push(
        `${path} does not start its <head> with its content security policy.`,
      );
    }
  }

  return problems;
}
