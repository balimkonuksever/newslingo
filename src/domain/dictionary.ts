import { z } from "zod";

import { slugSchema } from "@/lib/slug";

/** The longest word a reader can look up, in UTF-16 code units. */
export const MAX_LOOKUP_WORD_LENGTH = 64;

/** Bump when stored entries change meaning, so old ones are not reused. */
export const DICTIONARY_SCHEMA_VERSION = 1;

/**
 * Entries written ahead of time (see prisma/editorial/dictionary). They are
 * stored in the same cache as provider answers, under this provider name,
 * and every lookup checks them first.
 */
export const EDITORIAL_SOURCE = { provider: "editorial", version: "1" };

/**
 * A lookup names a word by its position in a published article, never by
 * free text: the server reads the word and its sentence from the database.
 * This keeps the endpoint from becoming a general-purpose model proxy, and
 * every cache entry belongs to a real article sentence.
 */
export const dictionaryLookupRequestSchema = z
  .object({
    articleSlug: slugSchema,
    paragraphOrder: z.int().min(1).max(500),
    /** UTF-16 offsets of the word in the paragraph's English text. */
    start: z.int().min(0).max(20_000),
    end: z.int().min(1).max(20_000),
  })
  .strict()
  .refine(
    ({ start, end }) => end > start && end - start <= MAX_LOOKUP_WORD_LENGTH,
    { message: `A word spans 1 to ${MAX_LOOKUP_WORD_LENGTH} characters.` },
  );

export type DictionaryLookupRequest = z.infer<
  typeof dictionaryLookupRequestSchema
>;

export const PARTS_OF_SPEECH = [
  "noun",
  "proper noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "determiner",
  "numeral",
  "interjection",
] as const;

export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

const text = (max: number) => z.string().trim().min(1).max(max);

/** The bounds every stored entry meets, whoever wrote it. */
export const dictionaryEntryFieldsSchema = z.object({
  lemma: text(64),
  partOfSpeech: z.enum(PARTS_OF_SPEECH),
  englishDefinition: text(300),
  turkishMeaning: text(200),
  exampleSentence: text(300),
  /** The lemma's British pronunciation, between slashes. */
  ipa: text(64),
});

/** What the reader shows for a looked-up word. */
export type DictionaryEntry = {
  /** The word exactly as it appears in the article. */
  word: string;
  lemma: string | null;
  partOfSpeech: string | null;
  englishDefinition: string;
  turkishMeaning: string;
  exampleSentence: string | null;
  ipa: string | null;
};

export type DictionaryLookupError =
  | "invalid_request"
  | "not_found"
  /** A real word that has no entry yet and no provider to ask. */
  | "no_entry"
  | "rate_limited"
  | "unavailable";

export type DictionaryLookupResponse =
  { entry: DictionaryEntry } | { error: DictionaryLookupError };

/** A word chosen as key vocabulary for an article, with its meaning there. */
export type KeyWord = DictionaryEntry & {
  /** The article's sentence the word comes from. */
  sentence: string;
};
