import "server-only";

import type {
  ProviderErrorKind,
  ProviderUsage,
} from "@/server/dictionary/provider";

export type LookupOutcome =
  /** An entry written ahead of time for the word in its sentence. */
  | "editorial_hit"
  | "cache_hit"
  | "provider_hit"
  /** Another request was already looking up the same word and context. */
  | "joined"
  | "not_found"
  /** No entry, and no provider configured to ask. */
  | "no_entry"
  /** A cache miss while lookups are switched to cache-only. */
  | "cache_only"
  /** A cache miss refused by the limit on provider calls. */
  | "provider_limited"
  | "provider_error";

/**
 * One line per lookup. It records outcome classes, timing and cost, and
 * deliberately no reader data: no IP address, word or sentence.
 */
export type LookupLogEvent = {
  outcome: LookupOutcome;
  provider: string;
  providerVersion: string;
  latencyMs: number;
  errorKind?: ProviderErrorKind;
  usage?: ProviderUsage | null;
};

/**
 * List prices in US dollars per million tokens, checked on 2026-09-25. Cache
 * writes use the 5-minute rate, 1.25 times the input price.
 */
const PRICES: Record<
  string,
  { input: number; output: number; cacheRead: number }
> = {
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1 },
};

/** An estimate from list prices, or `null` for a model without a price. */
export function estimateCostUsd(usage: ProviderUsage) {
  // Dated IDs such as "claude-haiku-4-5-20251001" share the alias's price.
  const price = PRICES[usage.model.replace(/-\d{8}$/u, "")];

  if (!price) {
    return null;
  }

  // Tokens times dollars per million tokens gives millionths of a dollar.
  const microDollars =
    usage.inputTokens * price.input +
    usage.cacheCreationInputTokens * price.input * 1.25 +
    usage.cacheReadInputTokens * price.cacheRead +
    usage.outputTokens * price.output;

  return Math.round(microDollars) / 1_000_000;
}

export function logLookup(event: LookupLogEvent) {
  const { usage, ...rest } = event;

  console.info(
    JSON.stringify({
      event: "dictionary_lookup",
      ...rest,
      ...(usage && { usage, estimatedCostUsd: estimateCostUsd(usage) }),
    }),
  );
}
