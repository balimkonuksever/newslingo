import {
  DICTIONARY_SCHEMA_VERSION,
  dictionaryEntryFieldsSchema,
  EDITORIAL_SOURCE,
  type PartOfSpeech,
} from "../src/domain/dictionary";
import { hashContext } from "../src/lib/text/context-hash";
import { buildLookupContext } from "../src/lib/text/lookup-context";
import { normalizeWord, tokenize } from "../src/lib/text/tokenize";

/** One meaning of a word, written ahead of time and reviewed. */
export type EditorialSense = {
  /** Required when another sense shares one of this sense's spellings. */
  id?: string;
  /** The dictionary form shown on the card, e.g. "country" for "countries". */
  lemma: string;
  /** Every normalized spelling this sense covers. Defaults to the lemma's. */
  forms?: readonly string[];
  pos: PartOfSpeech;
  /** The lemma's British pronunciation, between slashes. */
  ipa: string;
  tr: string;
  en: string;
  example: string;
};

/**
 * The sense of every spelling that has more than one, by article slug and
 * paragraph number: for each spelling, sense ids in the order the spelling
 * occurs in that paragraph.
 */
export type SenseChoices = Readonly<
  Record<
    string,
    Readonly<Record<number, Readonly<Record<string, readonly string[]>>>>
  >
>;

type Articles = ReadonlyArray<{
  slug: string;
  paragraphs: ReadonlyArray<{ english: string }>;
}>;

export type EditorialOccurrence = {
  slug: string;
  paragraphOrder: number;
  start: number;
  end: number;
  sense: EditorialSense;
};

export class EditorialDictionaryError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(
      `The editorial dictionary has ${problems.length} problem(s):\n- ${problems
        .slice(0, 100)
        .join("\n- ")}`,
    );
    this.name = "EditorialDictionaryError";
  }
}

const formsOf = (sense: EditorialSense) =>
  sense.forms ?? [normalizeWord(sense.lemma)];

function checkSenses(senses: readonly EditorialSense[], problems: string[]) {
  const byForm = new Map<string, EditorialSense[]>();
  const ids = new Set<string>();

  for (const sense of senses) {
    const label = `"${sense.id ?? sense.lemma}"`;
    const fields = dictionaryEntryFieldsSchema.safeParse({
      lemma: sense.lemma,
      partOfSpeech: sense.pos,
      englishDefinition: sense.en,
      turkishMeaning: sense.tr,
      exampleSentence: sense.example,
      ipa: sense.ipa,
    });

    if (!fields.success) {
      for (const issue of fields.error.issues) {
        problems.push(`${label}: ${issue.path.join(".")} ${issue.message}`);
      }
    }
    if (!/^\/[^/]+\/$/u.test(sense.ipa)) {
      problems.push(`${label}: the IPA must be between slashes`);
    }
    if (sense.id !== undefined) {
      if (ids.has(sense.id)) {
        problems.push(`${label}: the id is used twice`);
      }
      ids.add(sense.id);
    }

    for (const form of formsOf(sense)) {
      if (form !== normalizeWord(form)) {
        problems.push(`${label}: "${form}" is not a normalized spelling`);
      }
      byForm.set(form, [...(byForm.get(form) ?? []), sense]);
    }
  }

  for (const [form, candidates] of byForm) {
    if (candidates.length > 1 && candidates.some(({ id }) => !id)) {
      problems.push(
        `"${form}" has ${candidates.length} senses, so each of them needs an id`,
      );
    }
  }

  return byForm;
}

/**
 * Finds the sense of every word in the articles, and reports every gap at
 * once: words without an entry, spellings with several senses but no choice,
 * leftover choices and unused entries.
 */
export function resolveEditorialSenses(
  articles: Articles,
  senses: readonly EditorialSense[],
  choices: SenseChoices,
): EditorialOccurrence[] {
  const problems: string[] = [];
  const byForm = checkSenses(senses, problems);
  const used = new Set<EditorialSense>();
  const occurrences: EditorialOccurrence[] = [];

  for (const { slug, paragraphs } of articles) {
    paragraphs.forEach(({ english }, index) => {
      const order = index + 1;
      const chosen = choices[slug]?.[order] ?? {};
      const counted = new Map<string, number>();

      for (const token of tokenize(english)) {
        if (token.kind !== "word") {
          continue;
        }

        const form = normalizeWord(token.text);
        const candidates = byForm.get(form) ?? [];
        const where = `${slug} ¶${order} "${token.text}"`;
        let sense = candidates.length === 1 ? candidates[0] : undefined;

        if (candidates.length === 0) {
          problems.push(`${where}: no entry`);
          continue;
        }

        if (candidates.length > 1) {
          const occurrence = counted.get(form) ?? 0;
          const id = chosen[form]?.[occurrence];
          counted.set(form, occurrence + 1);
          sense =
            id === undefined
              ? undefined
              : candidates.find((candidate) => candidate.id === id);

          if (!sense) {
            problems.push(
              `${where}: choose one of ${candidates
                .map((candidate) => candidate.id ?? "(missing id)")
                .join(", ")}${id ? ` (got "${id}")` : ""}`,
            );
            continue;
          }
        }

        used.add(sense!);
        occurrences.push({
          slug,
          paragraphOrder: order,
          start: token.start,
          end: token.end,
          sense: sense!,
        });
      }

      for (const [form, ids] of Object.entries(chosen)) {
        const occurrences = counted.get(form) ?? 0;
        if (ids.length !== occurrences) {
          problems.push(
            `${slug} ¶${order}: ${ids.length} choice(s) for "${form}", which has ${occurrences} occurrence(s) needing one`,
          );
        }
      }
    });
  }

  for (const [slug, paragraphs] of Object.entries(choices)) {
    const article = articles.find((candidate) => candidate.slug === slug);

    for (const order of Object.keys(paragraphs).map(Number)) {
      if (!article || order < 1 || order > article.paragraphs.length) {
        problems.push(`choices for a missing paragraph: ${slug} ¶${order}`);
      }
    }
  }

  for (const sense of senses) {
    if (!used.has(sense)) {
      problems.push(`"${sense.id ?? sense.lemma}" is never used`);
    }
  }

  if (problems.length > 0) {
    throw new EditorialDictionaryError(problems);
  }

  return occurrences;
}

/**
 * The vocabulary rows for every word in the articles, keyed exactly as the
 * lookup service keys a live answer for the same word in the same sentence.
 */
export function editorialVocabularyRows(
  articles: Articles,
  senses: readonly EditorialSense[],
  choices: SenseChoices,
) {
  const texts = new Map(
    articles.map(({ slug, paragraphs }) => [slug, paragraphs]),
  );
  const senseByKey = new Map<string, EditorialSense>();

  return resolveEditorialSenses(articles, senses, choices).flatMap(
    ({ slug, paragraphOrder, start, end, sense }) => {
      const english = texts.get(slug)![paragraphOrder - 1].english;
      const lookup = buildLookupContext(english, start, end)!;
      const contextHash = hashContext(lookup.context);
      const key = `${lookup.normalizedWord} ${contextHash}`;
      const earlier = senseByKey.get(key);

      // The same word in an identical sentence is one row.
      if (earlier) {
        if (earlier !== sense) {
          throw new EditorialDictionaryError([
            `${slug} ¶${paragraphOrder} "${lookup.surfaceWord}" has two senses in the same sentence`,
          ]);
        }
        return [];
      }
      senseByKey.set(key, sense);

      return [
        {
          surfaceWord: lookup.surfaceWord,
          normalizedWord: lookup.normalizedWord,
          lemma: sense.lemma,
          partOfSpeech: sense.pos,
          englishDefinition: sense.en,
          turkishMeaning: sense.tr,
          exampleSentence: sense.example,
          ipa: sense.ipa,
          contextSentence: lookup.context,
          contextHash,
          provider: EDITORIAL_SOURCE.provider,
          providerVersion: EDITORIAL_SOURCE.version,
          schemaVersion: DICTIONARY_SCHEMA_VERSION,
        },
      ];
    },
  );
}
