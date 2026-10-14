import {
  DisclosureList,
  DisclosureRow,
} from "@/components/learning/disclosure-list";
import type { KeyWord } from "@/domain/dictionary";

const quote = "mt-1 border-l-2 border-rule pl-3 leading-relaxed text-ink-muted";

/**
 * An article's key vocabulary as a list. Each row shows the word's dictionary
 * form, part of speech, pronunciation and Turkish meaning in the article, and
 * opens to its English definition, the article's sentence and an example.
 */
export function KeyVocabularyList({ words }: { words: readonly KeyWord[] }) {
  return (
    <DisclosureList>
      {words.map((word) => {
        const headword = word.lemma ?? word.word;
        const showWord =
          headword.toLocaleLowerCase("en") !==
          word.word.toLocaleLowerCase("en");
        const facts = [
          word.partOfSpeech,
          word.ipa,
          showWord ? `here: “${word.word}”` : null,
        ].filter(Boolean);

        return (
          <DisclosureRow
            key={`${word.word} ${word.sentence}`}
            summary={
              <>
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    lang="en"
                    className="font-serif text-xl leading-snug font-semibold wrap-break-word text-ink"
                  >
                    {headword}
                  </span>
                  {facts.length > 0 && (
                    <span className="text-sm text-ink-muted">
                      {facts.join(" · ")}
                    </span>
                  )}
                </span>
                <span lang="tr" className="mt-1 block leading-snug text-ink">
                  {word.turkishMeaning}
                </span>
              </>
            }
          >
            <p lang="en" className="mt-2 leading-relaxed">
              {word.englishDefinition}
            </p>
            <p className="mt-3 text-sm text-ink-muted">In this article</p>
            <p lang="en" className={`${quote} italic`}>
              {word.sentence}
            </p>
            {word.exampleSentence && (
              <>
                <p className="mt-3 text-sm text-ink-muted">Another example</p>
                <p lang="en" className={`${quote} italic`}>
                  {word.exampleSentence}
                </p>
              </>
            )}
          </DisclosureRow>
        );
      })}
    </DisclosureList>
  );
}
