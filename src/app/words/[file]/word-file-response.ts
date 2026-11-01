import { slugSchema } from "@/lib/slug";
import { buildWordFile } from "@/server/dictionary/word-file";

/**
 * Answers `/words/<slug>.json` with the article's word file, or 404 for
 * anything but a public article. `route.local.ts` serves it on the local
 * server and `route.site.ts` renders it into the static site.
 */
export async function wordFileResponse(file: string) {
  const slug = slugSchema.safeParse(file.replace(/\.json$/u, ""));
  const wordFile =
    file.endsWith(".json") && slug.success
      ? await buildWordFile(slug.data)
      : null;

  return wordFile
    ? Response.json(wordFile)
    : Response.json({ error: "not_found" }, { status: 404 });
}
