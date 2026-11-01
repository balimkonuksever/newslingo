import { wordFileResponse } from "./word-file-response";

// On the local server a word file follows the database, as every page does.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  return wordFileResponse((await params).file);
}
