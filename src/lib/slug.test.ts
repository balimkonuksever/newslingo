import { describe, expect, it } from "vitest";

import { SLUG_MAX_LENGTH, slugify, slugSchema } from "./slug";

describe("slugSchema", () => {
  it.each(["ai", "world", "farmers-use-ai-forecasts", "top-10-stories-2026"])(
    "accepts %s",
    (slug) => {
      expect(slugSchema.safeParse(slug).success).toBe(true);
    },
  );

  it.each([
    "",
    "AI",
    "-leading",
    "trailing-",
    "double--hyphen",
    "with space",
    "türkçe",
    "../etc/passwd",
    "a".repeat(SLUG_MAX_LENGTH + 1),
  ])("rejects %j", (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(false);
  });
});

describe("slugify", () => {
  it("lowercases words and joins them with single hyphens", () => {
    expect(slugify("  Farmers Turn to AI -- Weather   Forecasts! ")).toBe(
      "farmers-turn-to-ai-weather-forecasts",
    );
  });

  it("transliterates Turkish letters", () => {
    expect(slugify("İstanbul’da Çığ Gibi Büyüyen Şirketler: Ilık Öğle")).toBe(
      "istanbul-da-cig-gibi-buyuyen-sirketler-ilik-ogle",
    );
  });

  it("drops whole words instead of cutting one in half", () => {
    expect(slugify("Three neighbouring countries sign", 20)).toBe(
      "three-neighbouring",
    );
  });

  it("truncates a single word that is longer than the limit", () => {
    expect(slugify("Supercalifragilistic", 5)).toBe("super");
  });

  it("returns an empty string when there is nothing to keep", () => {
    expect(slugify("!!! — ???")).toBe("");
  });

  it("produces slugs that pass validation", () => {
    const slug = slugify(
      "After Years of Negotiation, Three Neighbouring Countries Sign an Agreement to Share and Protect the River That Connects Them",
    );

    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(slugSchema.parse(slug)).toBe(slug);
  });
});
