// @vitest-environment node
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  checkSite,
  contentSecurityPolicy,
  inlineScriptHashes,
  secureSite,
  withContentSecurityPolicy,
} from "./site-security";

// The example in MDN's CSP guide: this script and its published hash.
const EXAMPLE_SCRIPT = "alert('Hello, world.');";
const EXAMPLE_HASH = "'sha256-qznLcsROx4GACP2dm0UCKCzCG+HiZ1guq6ZZDob/Tng='";

function page(body = "") {
  return `<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><script src="/newslingo/_next/static/chunks/main.js" async=""></script></head><body>${body}<script>${EXAMPLE_SCRIPT}</script></body></html>`;
}

describe("inlineScriptHashes", () => {
  it("hashes inline scripts as the CSP specification does", () => {
    expect(inlineScriptHashes(page())).toEqual([EXAMPLE_HASH]);
  });

  it("hashes a script's exact text, whitespace included, as browsers do", () => {
    expect(
      inlineScriptHashes(`<script>\n  ${EXAMPLE_SCRIPT}\n</script>`),
    ).not.toContain(EXAMPLE_HASH);
  });

  it("leaves out scripts loaded from files, data blocks and repeats", () => {
    const html = `${page()}<script type="application/ld+json">{"@type":"Article"}</script><script>${EXAMPLE_SCRIPT}</script><script type="module">import("./a.js")</script>`;

    expect(inlineScriptHashes(html)).toEqual([
      EXAMPLE_HASH,
      expect.stringMatching(/^'sha256-[A-Za-z0-9+/]+=*'$/),
    ]);
  });
});

describe("withContentSecurityPolicy", () => {
  it("puts the policy right after the charset, with the page's scripts", () => {
    const secured = withContentSecurityPolicy(page());

    expect(secured).toContain(
      `<head><meta charSet="utf-8"/><meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy(page())}"/><script src=`,
    );
    expect(contentSecurityPolicy(page())).toBe(
      `default-src 'none'; script-src 'self' ${EXAMPLE_HASH}; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'`,
    );
  });

  it("refuses a page without a charset or with a policy already", () => {
    expect(() =>
      withContentSecurityPolicy("<html><head></head></html>"),
    ).toThrow("no <meta charset>");
    expect(() =>
      withContentSecurityPolicy(withContentSecurityPolicy(page())),
    ).toThrow("already has a content security policy");
  });
});

describe("secureSite and checkSite", () => {
  let out: string;

  async function put(path: string, content: string) {
    await mkdir(dirname(join(out, path)), { recursive: true });
    await writeFile(join(out, path), content);
  }

  const expected = {
    published: ["published-story"],
    forbidden: [
      { text: "demo-story", what: "a demo article" },
      { text: "draft-story", what: "a draft" },
    ],
  };

  beforeEach(async () => {
    out = await mkdtemp(join(tmpdir(), "newslingo-site-"));
    await put(
      "index.html",
      page('<a href="/newslingo/article/published-story/">Read</a>'),
    );
    await put("article/published-story/index.html", page("<h1>Story</h1>"));
    await put("article/published-story/index.txt", "1:payload");
    await put("words/published-story.json", '{"words":{}}');
    await put(
      "search-index.json",
      JSON.stringify({ articles: [{ slug: "published-story" }] }),
    );
    await put("_next/static/chunks/main.js", "console.log(1)");
  });

  afterEach(async () => {
    await rm(out, { recursive: true, force: true });
  });

  it("secures every page, and then finds nothing to report", async () => {
    expect(await secureSite(out)).toBe(2);
    expect(await readFile(join(out, "index.html"), "utf8")).toContain(
      EXAMPLE_HASH,
    );
    expect(await checkSite(out, expected)).toEqual([]);
  });

  it("reports pages without their policy", async () => {
    expect(await checkSite(out, expected)).toEqual([
      "article/published-story/index.html does not start its <head> with its content security policy.",
      "index.html does not start its <head> with its content security policy.",
    ]);
  });

  it("reports the admin, the dictionary endpoint, source maps and environment files", async () => {
    await put("admin/index.html", page());
    await put("api/dictionary", "{}");
    await put("_next/static/chunks/main.js.map", "{}");
    await put(".env.local", "SECRET=1");
    await secureSite(out);

    expect(await checkSite(out, expected)).toEqual(
      expect.arrayContaining([
        "admin/index.html belongs to the admin or the dictionary endpoint, which stay on your computer.",
        "api/dictionary belongs to the admin or the dictionary endpoint, which stay on your computer.",
        "_next/static/chunks/main.js.map is a source map.",
        ".env.local is an environment file.",
      ]),
    );
  });

  it("reports an article that is not published, and a published one that is missing", async () => {
    await put("article/demo-story/index.html", page());
    await rm(join(out, "words/published-story.json"));
    await put(
      "search-index.json",
      JSON.stringify({ articles: [{ slug: "draft-story" }] }),
    );
    await secureSite(out);

    expect(await checkSite(out, expected)).toEqual(
      expect.arrayContaining([
        "“demo-story” has a page, but no written article with that slug is marked published.",
        "The published article “published-story” has no word file.",
        "“draft-story” has a search entry, but no written article with that slug is marked published.",
        "The published article “published-story” has no search entry.",
        "search-index.json contains a draft: “draft-story”.",
      ]),
    );
  });

  it("reports server settings, database addresses and source map links", async () => {
    await put(
      "_next/static/chunks/main.js",
      'const url = process.env.DATABASE_URL ?? "postgresql://user:pass@host/db";\n//# sourceMappingURL=main.js.map',
    );
    await secureSite(out);

    expect(await checkSite(out, expected)).toEqual([
      "_next/static/chunks/main.js contains a database setting: “DATABASE_URL”.",
      "_next/static/chunks/main.js contains a database address: “postgresql://”.",
      "_next/static/chunks/main.js contains a link to a source map: “sourceMappingURL=”.",
    ]);
  });

  it("reports a missing search index", async () => {
    await rm(join(out, "search-index.json"));
    await secureSite(out);

    expect(await checkSite(out, expected)).toContain(
      "search-index.json is missing or unreadable.",
    );
  });
});
