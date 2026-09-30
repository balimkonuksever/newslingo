import "server-only";

import { z } from "zod";

import {
  dictionaryEntryFieldsSchema,
  PARTS_OF_SPEECH,
} from "@/domain/dictionary";

/**
 * The fields a provider returns. Kept to plain types so the same schema works
 * as a Claude structured-output format; `providerResultSchema` then applies
 * the stricter checks before anything is cached or shown.
 */
export const providerOutputSchema = z.object({
  lemma: z.string(),
  partOfSpeech: z.enum(PARTS_OF_SPEECH),
  englishDefinition: z.string(),
  turkishMeaning: z.string(),
  exampleSentence: z.string(),
  ipa: z.string(),
});

/** Validation applied to every provider result, whatever the provider. */
export const providerResultSchema = dictionaryEntryFieldsSchema.extend({
  // Stored between slashes whether or not the provider added them.
  ipa: dictionaryEntryFieldsSchema.shape.ipa.transform(
    (ipa) => `/${ipa.replace(/^[/[]+|[/\]]+$/gu, "")}/`,
  ),
});

export type ProviderResult = z.infer<typeof providerResultSchema>;

/** Token usage for one provider call, for cost and latency logs. */
export type ProviderUsage = {
  /** The model that produced the answer, which a fallback may change. */
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
};

export type ProviderLookup = {
  output: unknown;
  usage: ProviderUsage | null;
};

export type ProviderInput = {
  /** The word as it appears in the article. */
  word: string;
  /** The sentence around the word, with the word marked (see lookup-context). */
  context: string;
};

export interface DictionaryProvider {
  /** Provider family, part of the cache key, e.g. "anthropic" or "fixture". */
  readonly name: string;
  /** Changes whenever the model or prompt changes, so stale entries are not reused. */
  readonly version: string;
  lookup(input: ProviderInput): Promise<ProviderLookup>;
}

export type ProviderErrorKind =
  "rate_limited" | "unavailable" | "refused" | "invalid_output";

export class DictionaryProviderError extends Error {
  /** Tokens spent before the failure, when the provider knows them. */
  readonly usage: ProviderUsage | null;

  constructor(
    readonly kind: ProviderErrorKind,
    message: string,
    options?: { cause?: unknown; usage?: ProviderUsage | null },
  ) {
    super(message, { cause: options?.cause });
    this.name = "DictionaryProviderError";
    this.usage = options?.usage ?? null;
  }
}
