import Link from "next/link";

import { categoryAccent } from "@/components/news/category-accent";
import { formatArticleCount } from "@/lib/format";

type CategoryCardProps = {
  category: {
    slug: string;
    name: string;
    description: string | null;
    publicArticleCount: number;
  };
};

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <article className="relative flex h-full flex-col rounded-xl border border-rule bg-surface p-5 transition-shadow hover:shadow-md has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus">
      <span
        aria-hidden="true"
        className={`mb-4 block h-1 w-10 rounded-full ${
          categoryAccent(category.slug).background
        }`}
      />
      <h3 className="font-serif text-xl font-semibold text-ink">
        <Link
          href={`/category/${category.slug}`}
          className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
        >
          {category.name}
        </Link>
      </h3>
      {category.description && (
        <p className="mt-1 text-sm text-ink-muted">{category.description}</p>
      )}
      <p className="mt-auto pt-4 text-sm font-medium text-ink">
        {formatArticleCount(category.publicArticleCount)}
      </p>
    </article>
  );
}
