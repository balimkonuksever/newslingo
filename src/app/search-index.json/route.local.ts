import { buildSearchIndex } from "@/server/articles/search-index";

// On the local server the search index follows the database, as every page
// does. `route.site.ts` renders it into the static site.
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await buildSearchIndex());
}
