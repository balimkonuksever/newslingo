import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import {
  EXPRESSION_TYPE_LABELS,
  type ExpressionCard,
} from "@/domain/expressions";
import { normalizeExpression } from "@/lib/text/phrases";

/** Where Real English cards come from, said once wherever cards appear. */
export const EXPRESSION_SOURCE_NOTE =
  "Written with AI and checked by a native Turkish speaker.";

/**
 * The card's type and level, and `surface`, the expression as an article
 * wrote it, when that differs from the card's form, as "sold out" does from
 * "sell out".
 */
export function ExpressionFacts({
  card,
  surface,
}: {
  card: ExpressionCard;
  surface?: string;
}) {
  const showSurface =
    surface !== undefined &&
    normalizeExpression(surface) !== normalizeExpression(card.expression);

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
      <span>{EXPRESSION_TYPE_LABELS[card.type]}</span>
      {card.difficulty && <DifficultyBadge level={card.difficulty} />}
      {showSurface && <span lang="en">{`here: “${surface}”`}</span>}
    </span>
  );
}

/**
 * Everything on the card after its Turkish meaning: the English meaning, an
 * example with its translation, how it is used, and what a word-for-word
 * Turkish translation gets wrong.
 */
export function ExpressionBody({ card }: { card: ExpressionCard }) {
  return (
    <>
      <p lang="en" className="mt-2 leading-relaxed">
        {card.englishMeaning}
      </p>
      {card.exampleEnglish && (
        <div className="mt-3 border-l-2 border-rule pl-3 leading-relaxed text-ink-muted">
          <p lang="en" className="italic">
            {card.exampleEnglish}
          </p>
          {card.exampleTurkish && (
            <p lang="tr" className="mt-1">
              {card.exampleTurkish}
            </p>
          )}
        </div>
      )}
      {card.usageNote && (
        <p lang="en" className="mt-3 text-sm leading-relaxed">
          {card.usageNote}
        </p>
      )}
      {card.literalWarning && (
        <p
          lang="en"
          className="mt-3 rounded-lg bg-highlight px-3 py-2 text-sm leading-relaxed"
        >
          <span className="font-semibold">Watch out: </span>
          {card.literalWarning}
        </p>
      )}
    </>
  );
}

/** A whole Real English card, as the lookup card shows it. */
export function ExpressionDetails({
  card,
  surface,
}: {
  card: ExpressionCard;
  surface?: string;
}) {
  return (
    <div className="mt-1">
      <p>
        <ExpressionFacts card={card} surface={surface} />
      </p>
      <p lang="tr" className="mt-3 text-lg leading-snug font-semibold">
        {card.turkishMeaning}
      </p>
      <ExpressionBody card={card} />
    </div>
  );
}
