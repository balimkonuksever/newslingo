import {
  DisclosureList,
  DisclosureRow,
} from "@/components/learning/disclosure-list";
import {
  ExpressionBody,
  ExpressionFacts,
} from "@/components/learning/expression-details";
import type { ExpressionCard } from "@/domain/expressions";

/**
 * Real English cards as a list. Each row shows its expression, type, level
 * and Turkish meaning, and opens to the rest of the card.
 */
export function RealEnglishList({
  cards,
}: {
  cards: readonly ExpressionCard[];
}) {
  return (
    <DisclosureList>
      {cards.map((card) => (
        <DisclosureRow
          key={card.slug}
          summary={
            <>
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
            </>
          }
        >
          <ExpressionBody card={card} />
        </DisclosureRow>
      ))}
    </DisclosureList>
  );
}
