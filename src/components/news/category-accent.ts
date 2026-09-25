// Keyed by the permanent reference-category slugs in
// prisma/reference/categories.ts. Class names are spelled out in full so
// Tailwind can find them.
const categoryAccents: Record<string, { text: string; background: string }> = {
  ai: { text: "text-category-ai", background: "bg-category-ai" },
  technology: {
    text: "text-category-technology",
    background: "bg-category-technology",
  },
  world: { text: "text-category-world", background: "bg-category-world" },
  business: {
    text: "text-category-business",
    background: "bg-category-business",
  },
  entertainment: {
    text: "text-category-entertainment",
    background: "bg-category-entertainment",
  },
  beauty: { text: "text-category-beauty", background: "bg-category-beauty" },
};

const defaultAccent = {
  text: "text-category-default",
  background: "bg-category-default",
};

export function categoryAccent(slug: string) {
  return categoryAccents[slug] ?? defaultAccent;
}
