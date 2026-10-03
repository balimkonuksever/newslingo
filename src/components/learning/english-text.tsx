import type { ExpressionMark } from "@/domain/expressions";
import { segmentParagraph } from "@/lib/text/segment";

/**
 * A paragraph's English text with every word in a lightweight span that the
 * reader's lookup handler recognises by `data-w`, the start offset. A known
 * Real English expression is one such span covering all its words, also
 * marked with its card's slug in `data-e`, so it is looked up as a whole.
 * The spans have no role, so screen readers read the text as plain prose.
 * The first span is the paragraph's single tab stop; the arrow keys move
 * between spans from there (see word-navigation.ts).
 */
export function EnglishText({
  text,
  expressions = [],
}: {
  text: string;
  expressions?: readonly ExpressionMark[];
}) {
  let isFirstTarget = true;
  const marks = expressions.map(({ slug, start, end }) => ({
    expressionId: slug,
    start,
    end,
  }));

  return segmentParagraph(text, marks).map((segment) => {
    if (segment.kind === "text") {
      return segment.text;
    }

    const tabIndex = isFirstTarget ? 0 : undefined;
    isFirstTarget = false;

    return (
      <span
        key={segment.start}
        data-w={segment.start}
        data-e={
          segment.kind === "expression" ? segment.expressionId : undefined
        }
        tabIndex={tabIndex}
      >
        {segment.text}
      </span>
    );
  });
}
