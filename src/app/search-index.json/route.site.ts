import { buildSearchIndex } from "@/server/articles/search-index";

// The static site renders the search index once, at build time.
export const dynamic = "force-static";

export async function GET() {
  return Response.json(await buildSearchIndex());
}
