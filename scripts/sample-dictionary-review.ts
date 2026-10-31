// Prints a review sheet for the editorial dictionary's Turkish, in Markdown:
// every key vocabulary word, then a random sample of the other entries, each
// shown in a sentence where an article uses it. The sample is drawn with a
// fixed seed, so the same seed always gives the same sheet. With --written,
// the sheet covers the written articles only: their key words, then a sample
// of the entries no demo article uses, which were written for them.
// --written=<slug> covers one written article and the entries no demo article
// and no written article listed before it uses, so each new article's entries
// can be reviewed with it.
//
//   tsx scripts/sample-dictionary-review.ts [sample size] [seed] [--written[=<slug>]]
import { WRITTEN_ARTICLES } from "../prisma/editorial/articles";
import { DEMO_ARTICLES } from "../prisma/fixtures/articles";
import { EDITORIAL_DICTIONARY } from "../prisma/editorial/dictionary";
import { DEMO_KEY_VOCABULARY } from "../prisma/fixtures/key-vocabulary";
import { DEMO_SENSE_CHOICES } from "../prisma/fixtures/sense-choices";
import {
  type EditorialOccurrence,
  type EditorialSense,
  resolveEditorialSenses,
} from "../prisma/editorial-dictionary";
import { resolveKeyVocabulary } from "../prisma/key-vocabulary";
import { sentenceSpanAt } from "../src/lib/text/segment";
import { normalizeWord } from "../src/lib/text/tokenize";

const writtenArgument = process.argv.find((argument) =>
  argument.startsWith("--written"),
);
const writtenOnly = writtenArgument !== undefined;
/** With --written=<slug>, the one written article the sheet covers. */
const onlySlug = writtenArgument?.split("=")[1];
const [sizeArgument, seedArgument] = process.argv
  .slice(2)
  .filter((argument) => argument !== writtenArgument);
const sampleSize = Number(sizeArgument ?? 40);
const seed = Number(seedArgument ?? 20261014);

/** mulberry32: a small seeded generator, so the sample is reproducible. */
function random(seedValue: number) {
  let state = seedValue >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const articles = [...DEMO_ARTICLES, ...WRITTEN_ARTICLES];
const writtenSlugs = new Set(WRITTEN_ARTICLES.map(({ slug }) => slug));
if (onlySlug !== undefined && !writtenSlugs.has(onlySlug)) {
  throw new Error(`No written article has the slug "${onlySlug}".`);
}
/** Whether the sheet covers an article: with --written, written ones only. */
const covered = (slug: string) =>
  onlySlug !== undefined ? slug === onlySlug : writtenSlugs.has(slug);
const occurrences = resolveEditorialSenses(articles, EDITORIAL_DICTIONARY, {
  ...DEMO_SENSE_CHOICES,
  ...Object.fromEntries(
    WRITTEN_ARTICLES.map(({ slug, senseChoices }) => [
      slug,
      senseChoices ?? {},
    ]),
  ),
});
const englishOf = (slug: string, paragraphOrder: number) =>
  articles.find((article) => article.slug === slug)!.paragraphs[
    paragraphOrder - 1
  ].english;

/** The occurrence's sentence, with the word in bold. */
function sentence({ slug, paragraphOrder, start, end }: EditorialOccurrence) {
  const english = englishOf(slug, paragraphOrder);
  const span = sentenceSpanAt(english, start)!;
  return `${english.slice(span.start, start)}**${english.slice(start, end)}**${english.slice(end, span.end)}`;
}

function item(number: number, occurrence: EditorialOccurrence) {
  const { sense } = occurrence;
  return [
    `### ${number}. ${sense.lemma} (${sense.pos})`,
    "",
    `> ${sentence(occurrence)}`,
    "",
    `- **Turkish:** ${sense.tr}`,
    `- English: ${sense.en}`,
  ].join("\n");
}

// Part A: each key word, through the sense it has in its sentence.
const keyWords = resolveKeyVocabulary(articles, {
  ...DEMO_KEY_VOCABULARY,
  ...Object.fromEntries(
    WRITTEN_ARTICLES.map(({ slug, keyVocabulary }) => [slug, keyVocabulary]),
  ),
})
  .filter(({ articleSlug }) => !writtenOnly || covered(articleSlug))
  .map((word) =>
    occurrences.find(
      (occurrence) =>
        occurrence.slug === word.articleSlug &&
        occurrence.paragraphOrder === word.paragraphOrder &&
        normalizeWord(
          englishOf(occurrence.slug, occurrence.paragraphOrder).slice(
            occurrence.start,
            occurrence.end,
          ),
        ) === word.normalizedWord,
    )!,
  );
const keySenses = new Set<EditorialSense>(keyWords.map(({ sense }) => sense));

// Part B: a uniform sample of the other senses, each in its first sentence.
// With --written, only senses the sheet's articles use and no demo article
// does. With --written=<slug>, also none that a written article listed before
// it uses: a sense belongs to the first article that uses it, so a sense
// shared by two new articles is on the earlier one's sheet, not missing from
// both.
const writtenBefore = new Set(
  onlySlug === undefined
    ? []
    : WRITTEN_ARTICLES.slice(
        0,
        WRITTEN_ARTICLES.findIndex(({ slug }) => slug === onlySlug),
      ).map(({ slug }) => slug),
);
const sensesOfSlugs = (included: (slug: string) => boolean) =>
  new Set(
    occurrences.filter(({ slug }) => included(slug)).map(({ sense }) => sense),
  );
const sensesOnSheet = sensesOfSlugs(covered);
const sensesBefore = sensesOfSlugs(
  (slug) => !writtenSlugs.has(slug) || writtenBefore.has(slug),
);
const others = EDITORIAL_DICTIONARY.filter(
  (sense) =>
    !keySenses.has(sense) &&
    !(writtenOnly && (!sensesOnSheet.has(sense) || sensesBefore.has(sense))),
);
const next = random(seed);
const pool = [...others];
for (let i = pool.length - 1; i > 0; i -= 1) {
  const j = Math.floor(next() * (i + 1));
  [pool[i], pool[j]] = [pool[j], pool[i]];
}
const sample = pool
  .slice(0, sampleSize)
  .map((sense) =>
    occurrences.find((occurrence) => occurrence.sense === sense)!,
  );

console.log(
  [
    "# Editorial dictionary review",
    "",
    `Generated by \`pnpm exec tsx scripts/sample-dictionary-review.ts ${sampleSize} ${seed}${writtenArgument ? ` ${writtenArgument}` : ""}\` from the ${EDITORIAL_DICTIONARY.length} entries in \`prisma/editorial/dictionary/\`${onlySlug ? `, for the written article “${onlySlug}” only` : writtenOnly ? ", for the written articles only" : ""}.`,
    "",
    "For each entry, check that the Turkish fits the word in this sentence and reads naturally. Mark it OK, or give the Turkish it should have.",
    "",
    `## Part A: the ${keyWords.length} key vocabulary words`,
    "",
    "Every word the articles' “Key vocabulary” lists show.",
    "",
    keyWords
      .map((occurrence, index) => item(index + 1, occurrence))
      .join("\n\n"),
    "",
    `## Part B: ${sample.length} entries drawn at random from the other ${others.length}${onlySlug ? ", which no demo or earlier written article uses" : writtenOnly ? ", which no demo article uses" : ""}`,
    "",
    sample
      .map((occurrence, index) => item(keyWords.length + index + 1, occurrence))
      .join("\n\n"),
  ].join("\n"),
);
