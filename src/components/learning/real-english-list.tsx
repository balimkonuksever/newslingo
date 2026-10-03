import {
  ExpressionBody,
  ExpressionFacts,
} from "@/components/learning/expression-details";
import type { ExpressionCard } from "@/domain/expressions";

/**
 * Real English cards as a list. Each row shows its expression, type, level
 * and Turkish meaning, and opens to the rest of the card. The rows are
 * native disclosure widgets, so the list works without JavaScript.
 */
export function RealEnglishList({
  cards,
}: {
  cards: readonly ExpressionCard[];
}) {
  return (
    <ul className="real-english divide-y divide-rule rounded-xl border border-rule bg-surface">
      {cards.map((card) => (
        <li key={card.slug}>
          <details className="group">
            <summary className="flex cursor-pointer items-start justify-between gap-4 rounded-xl px-4 py-3 hover:bg-paper">
              <span className="min-w-0">
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    lang="en"
                    className="font-serif text-xl leading-snug font-semibold wrap-break-word text-ink"
                  >
                    {card.expression}
                  </span>
                  <ExpressionFacts card={card} />
                </span>
                <span lang="tr" className="mt-1 block leading-snug text-ink">
                  {card.turkishMeaning}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="mt-1 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
              >
                ▾
              </span>
            </summary>
            <div className="px-4 pb-4">
              <ExpressionBody card={card} />
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
