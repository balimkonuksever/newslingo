import { listPublicArticleSlugs } from "@/server/articles/queries";

import { wordFileResponse } from "./word-file-response";

// The static site renders one word file per public article at build time.
export const dynamic = "force-static";

export async function generateStaticParams() {
  return (await listPublicArticleSlugs()).map(({ slug }) => ({
    file: `${slug}.json`,
  }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  return wordFileResponse((await params).file);
}
