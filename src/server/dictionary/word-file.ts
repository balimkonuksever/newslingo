import "server-only";

import {
  DICTIONARY_SCHEMA_VERSION,
  EDITORIAL_SOURCE,
} from "@/domain/dictionary";
import { type WordFile, wordFileKey } from "@/domain/word-file";
import { hashContext } from "@/lib/text/context-hash";
import { buildLookupContext } from "@/lib/text/lookup-context";
import { tokenize } from "@/lib/text/tokenize";
import { publicArticleWhere } from "@/server/articles/queries";
import { db } from "@/server/db/client";

const cacheKey = (normalizedWord: string, contextHash: string) =>
  `${normalizedWord} ${contextHash}`;

/**
 * The word file of a public article, or null for any other slug. Each word
 * gets the editorial entry a lookup would return for it, found by the same
 * key: the word and a hash of its marked sentence.
 */
export async function buildWordFile(slug: string): Promise<WordFile | null> {
  const article = await db.article.findFirst({
    where: { slug, ...publicArticleWhere },
    select: {
      paragraphs: {
        orderBy: { order: "asc" },
        select: { order: true, english: true },
      },
    },
  });

  if (!article) {
    return null;
  }

  const words = article.paragraphs.flatMap(({ order, english }) =>
    tokenize(english).flatMap((token) => {
      const lookup =
        token.kind === "word" &&
        buildLookupContext(english, token.start, token.end);

      return lookup
        ? [
            {
              key: wordFileKey(order, token.start),
              surfaceWord: lookup.surfaceWord,
              normalizedWord: lookup.normalizedWord,
              contextHash: hashContext(lookup.context),
            },
          ]
        : [];
    }),
  );
  const stored = await db.vocabularyEntry.findMany({
    where: {
      provider: EDITORIAL_SOURCE.provider,
      providerVersion: EDITORIAL_SOURCE.version,
      schemaVersion: DICTIONARY_SCHEMA_VERSION,
      contextHash: { in: [...new Set(words.map((word) => word.contextHash))] },
    },
    select: {
      normalizedWord: true,
      contextHash: true,
      lemma: true,
      partOfSpeech: true,
      englishDefinition: true,
      turkishMeaning: true,
      exampleSentence: true,
      ipa: true,
    },
  });
  const byKey = new Map(
    stored.map(({ normalizedWord, contextHash, ...entry }) => [
      cacheKey(normalizedWord, contextHash),
      entry,
    ]),
  );
  const file: WordFile = { entries: [], words: {} };
  // Each occurrence has its own cache row, so "the" has dozens; the file
  // holds each distinct entry once.
  const indexes = new Map<string, number>();

  for (const word of words) {
    const entry = byKey.get(cacheKey(word.normalizedWord, word.contextHash));
    let index: number | null = null;

    if (entry) {
      const content = JSON.stringify(entry);
      index = indexes.get(content) ?? file.entries.push(entry) - 1;
      indexes.set(content, index);
    }

    file.words[word.key] = [index, word.surfaceWord];
  }

  return file;
}
