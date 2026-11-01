import type {
  DictionaryLookupRequest,
  DictionaryLookupResponse,
} from "@/domain/dictionary";
import { type WordFile, wordFileKey, wordFilePath } from "@/domain/word-file";

// One request per article: the first lookup fetches its word file and the
// rest read it. A failed fetch is forgotten, so the next lookup tries again.
const wordFiles = new Map<string, Promise<WordFile | null>>();

async function fetchWordFile(articleSlug: string): Promise<WordFile | null> {
  const response = await fetch(wordFilePath(articleSlug));

  if (response.status === 404) {
    return null;
  }

  const body: unknown = response.ok
    ? await response.json().catch(() => null)
    : null;

  if (
    body &&
    typeof body === "object" &&
    "entries" in body &&
    Array.isArray(body.entries) &&
    "words" in body &&
    typeof body.words === "object"
  ) {
    return body as WordFile;
  }

  throw new Error(`The word file of "${articleSlug}" could not be read.`);
}

function wordFile(articleSlug: string) {
  let file = wordFiles.get(articleSlug);

  if (!file) {
    file = fetchWordFile(articleSlug);
    wordFiles.set(articleSlug, file);
    file.catch(() => wordFiles.delete(articleSlug));
  }

  return file;
}

/** Settles like `promise`, or rejects as soon as `signal` aborts. */
function unlessAborted<T>(promise: Promise<T>, signal?: AbortSignal) {
  if (!signal) {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);

    if (signal.aborted) {
      abort();
      return;
    }

    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", abort);
    });
  });
}

/**
 * Looks up one word in its article's word file. A network failure or an
 * unreadable file comes back as `unavailable`; only an abort rejects.
 */
export async function fetchDictionaryEntry(
  { articleSlug, paragraphOrder, start, end }: DictionaryLookupRequest,
  signal?: AbortSignal,
): Promise<DictionaryLookupResponse> {
  let file: WordFile | null;

  try {
    file = await unlessAborted(wordFile(articleSlug), signal);
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    return { error: "unavailable" };
  }

  const word = file?.words[wordFileKey(paragraphOrder, start)];

  if (!word || start + word[1].length !== end) {
    return { error: "not_found" };
  }

  const [index, surfaceWord] = word;
  const entry = index === null ? undefined : file?.entries[index];

  return entry
    ? { entry: { word: surfaceWord, ...entry } }
    : { error: "no_entry" };
}

/** Forgets fetched word files. For tests. */
export function clearWordFiles() {
  wordFiles.clear();
}
