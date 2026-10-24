import "server-only";

import {
  DICTIONARY_SCHEMA_VERSION,
  type DictionaryEntry,
  type DictionaryLookupError,
  type DictionaryLookupRequest,
  EDITORIAL_SOURCE,
} from "@/domain/dictionary";
import type { Prisma } from "@/generated/prisma/client";
import { hashContext } from "@/lib/text/context-hash";
import { buildLookupContext } from "@/lib/text/lookup-context";
import { publicArticleWhere } from "@/server/articles/queries";
import { db } from "@/server/db/client";
import { type LookupLogEvent, logLookup } from "@/server/dictionary/log";
import {
  type DictionaryProvider,
  DictionaryProviderError,
  providerResultSchema,
  type ProviderUsage,
} from "@/server/dictionary/provider";
import type { RateLimiter } from "@/server/rate-limit";

export type LookupDependencies = {
  /** Who answers words without an entry; `null` means nobody does. */
  provider: DictionaryProvider | null;
  /** The kill switch: serve cached entries, look up nothing new. */
  cacheOnly?: boolean;
  /** Limits provider calls across all readers. */
  providerLimiter?: RateLimiter;
  log?: (event: LookupLogEvent) => void;
};

export type LookupResult =
  { entry: DictionaryEntry } | { error: DictionaryLookupError };

const entrySelect = {
  lemma: true,
  partOfSpeech: true,
  englishDefinition: true,
  turkishMeaning: true,
  exampleSentence: true,
  ipa: true,
} satisfies Prisma.VocabularyEntrySelect;

type StoredEntry = Prisma.VocabularyEntryGetPayload<{
  select: typeof entrySelect;
}>;

type CacheKey =
  Prisma.VocabularyEntryNormalizedWordContextHashProviderProviderVersionSchemaVersionCompoundUniqueInput;

type Log = (
  event: Omit<LookupLogEvent, "provider" | "providerVersion" | "latencyMs">,
) => void;

// Concurrent lookups of the same uncached word share one provider call.
const inFlight = new Map<
  string,
  Promise<{ entry: StoredEntry; usage: ProviderUsage | null }>
>();

/**
 * Looks up a word in a published article, in this order: the entry written
 * ahead of time for the word in its sentence, the provider's cached answer,
 * and finally a new provider answer, which is validated and cached before it
 * is returned.
 */
export async function lookupWord(
  request: DictionaryLookupRequest,
  dependencies: LookupDependencies,
): Promise<LookupResult> {
  const { provider, cacheOnly = false, providerLimiter } = dependencies;
  const started = performance.now();
  const log: Log = (event) =>
    (dependencies.log ?? logLookup)({
      ...event,
      provider: provider?.name ?? "none",
      providerVersion: provider?.version ?? "none",
      latencyMs: Math.round(performance.now() - started),
    });

  const paragraph = await db.articleParagraph.findFirst({
    where: {
      order: request.paragraphOrder,
      article: { slug: request.articleSlug, ...publicArticleWhere },
    },
    select: { english: true },
  });
  const lookup =
    paragraph &&
    buildLookupContext(paragraph.english, request.start, request.end);

  if (!lookup) {
    log({ outcome: "not_found" });
    return { error: "not_found" };
  }

  const keyFor = (source: { provider: string; version: string }) => ({
    normalizedWord: lookup.normalizedWord,
    contextHash: hashContext(lookup.context),
    provider: source.provider,
    providerVersion: source.version,
    schemaVersion: DICTIONARY_SCHEMA_VERSION,
  });
  const toResult = (entry: StoredEntry) => ({
    entry: { word: lookup.surfaceWord, ...entry },
  });

  const editorial = await findEntry(keyFor(EDITORIAL_SOURCE));

  if (editorial) {
    log({ outcome: "editorial_hit" });
    return toResult(editorial);
  }

  if (!provider) {
    log({ outcome: "no_entry" });
    return { error: "no_entry" };
  }

  const key = keyFor({ provider: provider.name, version: provider.version });
  const cached = await findEntry(key);

  if (cached) {
    log({ outcome: "cache_hit" });
    return toResult(cached);
  }

  if (cacheOnly) {
    log({ outcome: "cache_only" });
    return { error: "no_entry" };
  }

  const flightKey = JSON.stringify(key);
  const pending = inFlight.get(flightKey);

  if (pending) {
    try {
      const { entry } = await pending;
      log({ outcome: "joined" });
      return toResult(entry);
    } catch (error) {
      return failure(error, log);
    }
  }

  if (providerLimiter && !providerLimiter.take("provider").allowed) {
    log({ outcome: "provider_limited" });
    return { error: "rate_limited" };
  }

  const flight = fetchAndStore(provider, key, lookup).finally(() =>
    inFlight.delete(flightKey),
  );
  inFlight.set(flightKey, flight);

  try {
    const { entry, usage } = await flight;
    log({ outcome: "provider_hit", usage });
    return toResult(entry);
  } catch (error) {
    return failure(error, log);
  }
}

function findEntry(key: CacheKey) {
  return db.vocabularyEntry.findUnique({
    where: {
      normalizedWord_contextHash_provider_providerVersion_schemaVersion: key,
    },
    select: entrySelect,
  });
}

async function fetchAndStore(
  provider: DictionaryProvider,
  key: CacheKey,
  lookup: { surfaceWord: string; context: string },
) {
  const { output, usage } = await provider.lookup({
    word: lookup.surfaceWord,
    context: lookup.context,
  });
  const result = providerResultSchema.safeParse(output);

  if (!result.success) {
    throw new DictionaryProviderError(
      "invalid_output",
      `The provider's answer failed validation at ${result.error.issues
        .map((issue) => issue.path.join(".") || "root")
        .join(", ")}.`,
      { usage },
    );
  }

  // Another server process may have stored the same entry meanwhile.
  await db.vocabularyEntry.createMany({
    data: [
      {
        ...key,
        ...result.data,
        surfaceWord: lookup.surfaceWord,
        contextSentence: lookup.context,
      },
    ],
    skipDuplicates: true,
  });

  const entry = await findEntry(key);

  if (!entry) {
    throw new Error("The stored dictionary entry disappeared.");
  }

  return { entry, usage };
}

function failure(error: unknown, log: Log): LookupResult {
  if (!(error instanceof DictionaryProviderError)) {
    throw error;
  }

  log({ outcome: "provider_error", errorKind: error.kind, usage: error.usage });

  return {
    error: error.kind === "rate_limited" ? "rate_limited" : "unavailable",
  };
}
