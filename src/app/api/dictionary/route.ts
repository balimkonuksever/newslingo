import {
  dictionaryLookupRequestSchema,
  type DictionaryLookupError,
  type DictionaryLookupResponse,
} from "@/domain/dictionary";
import { getLookupDependencies } from "@/server/dictionary/config";
import { lookupWord } from "@/server/dictionary/lookup";
import { clientAddress, createRateLimiter } from "@/server/rate-limit";

/** A lookup is four small fields; larger bodies are refused unread. */
const MAX_BODY_BYTES = 1024;

// Roomy for a person reading, tight enough to slow down scripted scraping.
// The lookup service's provider-call limit is the hard cap.
const clientLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

const STATUS: Record<DictionaryLookupError, number> = {
  invalid_request: 400,
  not_found: 404,
  no_entry: 404,
  rate_limited: 429,
  unavailable: 503,
};

export async function POST(request: Request) {
  const decision = clientLimiter.take(clientAddress(request.headers));

  if (!decision.allowed) {
    return respond(
      { error: "rate_limited" },
      { "Retry-After": String(decision.retryAfterSeconds) },
    );
  }

  // Requiring JSON also makes cross-site browser requests need a CORS
  // preflight, which this route never approves.
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return respond({ error: "invalid_request" });
  }

  const parsed = dictionaryLookupRequestSchema.safeParse(
    await readJson(request, MAX_BODY_BYTES),
  );

  if (!parsed.success) {
    return respond({ error: "invalid_request" });
  }

  try {
    return respond(await lookupWord(parsed.data, getLookupDependencies()));
  } catch (error) {
    console.error("Dictionary lookup failed.", error);

    return respond({ error: "unavailable" });
  }
}

function respond(body: DictionaryLookupResponse, headers?: HeadersInit) {
  return Response.json(body, {
    status: "error" in body ? STATUS[body.error] : 200,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

/** Parses a JSON body of at most `maxBytes`, or returns `undefined`. */
async function readJson(request: Request, maxBytes: number) {
  if (Number(request.headers.get("content-length")) > maxBytes) {
    return undefined;
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return undefined;
  }

  const decoder = new TextDecoder();
  let text = "";
  let size = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return undefined;
    }

    text += decoder.decode(value, { stream: true });
  }

  try {
    return JSON.parse(text + decoder.decode()) as unknown;
  } catch {
    return undefined;
  }
}
