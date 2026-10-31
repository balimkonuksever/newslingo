import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EXPRESSION_SOURCE_NOTE } from "@/components/learning/expression-details";
import { RealEnglishList } from "@/components/learning/real-english-list";
import { categoryAccent } from "@/components/news/category-accent";
import { EmptyState } from "@/components/shared/empty-state";
import { textLink } from "@/components/ui/styles";
import { formatExpressionCount } from "@/lib/format";
import {
  getCategoryExpressions,
  listCategoriesWithArticleCounts,
} from "@/server/categories/queries";
import { staticParams } from "@/server/render-mode";

export function generateStaticParams() {
  return staticParams(listCategoriesWithArticleCounts);
}

export async function generateMetadata(
  props: PageProps<"/category/[slug]/expressions">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const category = await getCategoryExpressions(slug);

  // Throwing here too keeps the 404 page's title once metadata streams in.
  if (!category) {
    notFound();
  }

  return {
    title: `Real English for ${category.name}`,
    description: `Expressions you meet in ${category.name} news, with their Turkish meanings and the traps of translating them word for word.`,
    alternates: { canonical: `/category/${category.slug}/expressions` },
  };
}

export default async function CategoryExpressionsPage(
  props: PageProps<"/category/[slug]/expressions">,
) {
  const { slug } = await props.params;
  const category = await getCategoryExpressions(slug);

  if (!category) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-reader px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <Link
          href={`/category/${category.slug}`}
          className={`text-xs font-semibold tracking-wider uppercase hover:underline ${
            categoryAccent(category.slug).text
          }`}
        >
          {category.name}
        </Link>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Real English
        </h1>
        <p className="mt-3 text-lg text-ink-muted">
          {`Expressions you meet in ${category.name} news, with their Turkish meanings and the traps of translating them word for word.`}
        </p>
        {category.expressions.length > 0 && (
          <p className="mt-2 text-sm text-ink-muted">
            {formatExpressionCount(category.expressions.length)}
          </p>
        )}
      </header>

      {category.expressions.length === 0 ? (
        <div className="mt-8">
          <EmptyState title={`No Real English for ${category.name} yet`}>
            <p>
              Expressions appear here once they are written and checked.{" "}
              <Link href={`/category/${category.slug}`} className={textLink}>
                {`Read ${category.name} news`}
              </Link>
            </p>
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-8">
            <RealEnglishList cards={category.expressions} />
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            {EXPRESSION_SOURCE_NOTE}
          </p>
        </>
      )}
    </div>
  );
}
