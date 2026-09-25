/**
 * The six launch categories. This is production reference data: provisioning
 * upserts it by slug, so slugs are permanent identifiers and must never be
 * renamed. Descriptions are shown to learners, so keep them plain.
 */
export const REFERENCE_CATEGORIES = [
  {
    slug: "ai",
    name: "AI",
    description:
      "Artificial intelligence: new tools, research and the debates around them.",
    displayOrder: 1,
    isActive: true,
  },
  {
    slug: "technology",
    name: "Technology",
    description:
      "Phones, software, the internet and the companies that build them.",
    displayOrder: 2,
    isActive: true,
  },
  {
    slug: "world",
    name: "World",
    description:
      "International news about countries, politics and the events shaping them.",
    displayOrder: 3,
    isActive: true,
  },
  {
    slug: "business",
    name: "Business",
    description: "Companies, work, money and the economy.",
    displayOrder: 4,
    isActive: true,
  },
  {
    slug: "entertainment",
    name: "Entertainment",
    description: "Film, television, music, books and popular culture.",
    displayOrder: 5,
    isActive: true,
  },
  {
    slug: "beauty",
    name: "Beauty",
    description: "Skincare, make-up, style and personal care.",
    displayOrder: 6,
    isActive: true,
  },
] as const;

export type ReferenceCategorySlug =
  (typeof REFERENCE_CATEGORIES)[number]["slug"];
