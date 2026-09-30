import type {
  DictionaryLookupRequest,
  DictionaryLookupResponse,
} from "@/domain/dictionary";

/**
 * Asks the dictionary route about one word. Network failures and unexpected
 * replies come back as `unavailable`; only an abort rejects.
 */
export async function fetchDictionaryEntry(
  request: DictionaryLookupRequest,
  signal?: AbortSignal,
): Promise<DictionaryLookupResponse> {
  let response: Response;

  try {
    response = await fetch("/api/dictionary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    return { error: "unavailable" };
  }

  const body: unknown = await response.json().catch(() => null);

  if (
    body &&
    typeof body === "object" &&
    ("entry" in body || "error" in body)
  ) {
    return body as DictionaryLookupResponse;
  }

  return { error: "unavailable" };
}
