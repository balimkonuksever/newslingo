import { describe, expect, it } from "vitest";

import { countWords } from "../../src/lib/reading-time";
import { slugSchema } from "../../src/lib/slug";
import { REFERENCE_CATEGORIES } from "../reference/categories";
import { DEMO_ARTICLES, demoSourceUrl } from "./articles";

// These checks enforce the seed-content quality rules in IMPLEMENTATION_PLAN.md (M2).
describe("demo article fixtures", () => {
  const paragraphs = DEMO_ARTICLES.flatMap((article) => article.paragraphs);

  it("covers every reference category", () => {
    const covered = new Set(DEMO_ARTICLES.map((a) => a.categorySlug));

    for (const category of REFERENCE_CATEGORIES) {
      expect(covered, category.slug).toContain(category.slug);
    }
  });

  it("covers all four CEFR levels", () => {
    expect(new Set(DEMO_ARTICLES.map((a) => a.difficulty))).toEqual(
      new Set(["A2", "B1", "B2", "C1"]),
    );
  });

  it("uses unique, valid slugs and unique titles", () => {
    const slugs = DEMO_ARTICLES.map((a) => a.slug);

    for (const slug of slugs) {
      expect(slugSchema.safeParse(slug).success, slug).toBe(true);
    }

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(DEMO_ARTICLES.map((a) => a.title)).size).toBe(
      DEMO_ARTICLES.length,
    );
  });

  it("gives every article several paragraph pairs with trimmed, non-empty text", () => {
    for (const article of DEMO_ARTICLES) {
      expect(article.paragraphs.length, article.slug).toBeGreaterThanOrEqual(3);

      for (const { english, turkish } of article.paragraphs) {
        expect(english.trim()).not.toBe("");
        expect(turkish.trim()).not.toBe("");
        expect(english).toBe(english.trim());
        expect(turkish).toBe(turkish.trim());
      }
    }
  });

  it("includes every Turkish-specific letter", () => {
    const turkishText = paragraphs.map((p) => p.turkish).join(" ");

    for (const letter of ["ç", "ğ", "ı", "İ", "ö", "ş", "ü"]) {
      expect(turkishText, letter).toContain(letter);
    }
  });

  it("includes a long title and varied paragraph lengths", () => {
    expect(
      Math.max(...DEMO_ARTICLES.map((a) => a.title.length)),
    ).toBeGreaterThanOrEqual(100);

    const lengths = paragraphs.map((p) => countWords(p.english));

    expect(Math.max(...lengths)).toBeGreaterThanOrEqual(
      2 * Math.min(...lengths),
    );
  });

  it("orders publication times deterministically after the source time", () => {
    const siteTimes = DEMO_ARTICLES.map((a) => a.publishedOnSiteAt.getTime());

    expect(new Set(siteTimes).size).toBe(DEMO_ARTICLES.length);

    for (const article of DEMO_ARTICLES) {
      expect(article.publishedOnSiteAt.getTime(), article.slug).toBeGreaterThan(
        article.sourcePublishedAt.getTime(),
      );
    }
  });

  it("attributes fixtures to a reserved example domain", () => {
    const url = new URL(demoSourceUrl("any-slug"));

    expect(url.protocol).toBe("https:");
    expect(url.hostname.endsWith(".example")).toBe(true);
  });
});
