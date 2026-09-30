import { segmentParagraph } from "@/lib/text/segment";

/**
 * A paragraph's English text with every word in a lightweight span that the
 * reader's lookup handler recognises by `data-w`, the word's start offset.
 * The spans have no role, so screen readers read the text as plain prose.
 * The first word is the paragraph's single tab stop; the arrow keys move
 * between words from there (see word-navigation.ts).
 */
export function EnglishText({ text }: { text: string }) {
  let isFirstWord = true;

  return segmentParagraph(text, []).map((segment) => {
    if (segment.kind === "text") {
      return segment.text;
    }

    const tabIndex = isFirstWord ? 0 : undefined;
    isFirstWord = false;

    return (
      <span key={segment.start} data-w={segment.start} tabIndex={tabIndex}>
        {segment.text}
      </span>
    );
  });
}
