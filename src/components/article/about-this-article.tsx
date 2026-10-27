import type { ReactNode } from "react";

import { eyebrow, textLink } from "@/components/ui/styles";
import { isWebAddress } from "@/domain/moderation";
import { knownSource, SOURCE_LICENCES } from "@/domain/sources";
import { formatArticleDate } from "@/lib/dates";
import type { ArticleDetail } from "@/server/articles/queries";

type Credit = Pick<
  ArticleDetail,
  "kind" | "sourceName" | "sourceUrl" | "sourceLicence" | "references"
>;

/** Opens in a new tab and tells screen readers so. */
function ExternalLink({
  href,
  children,
  className = textLink,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function NewsCredit({
  sourceName,
  sourceUrl,
  sourceLicence,
}: {
  sourceName: string;
  sourceUrl: string;
  sourceLicence: Credit["sourceLicence"];
}) {
  const publisher = knownSource(sourceUrl)?.publisher;
  const licence = sourceLicence && SOURCE_LICENCES[sourceLicence];

  return (
    <>
      <p className="mt-2 text-ink">
        Newslingo adapted this story for English learners and added a Turkish
        translation. Original source: <strong>{sourceName}</strong>
        {publisher && `, ${publisher}`}.
      </p>
      {/* Only a web address becomes a link, so a draft's stored
          `javascript:` URL or the like never runs in the admin preview. */}
      {isWebAddress(sourceUrl) && (
        <p className="mt-3">
          <ExternalLink
            href={sourceUrl}
            className="font-medium text-brand underline underline-offset-4 hover:no-underline"
          >
            Read the original article <span aria-hidden="true">↗</span>
          </ExternalLink>
        </p>
      )}
      {licence && (
        <p className="mt-3 text-sm text-ink-muted">
          {licence.creditLead}{" "}
          <ExternalLink href={licence.url}>{licence.name}</ExternalLink>.
        </p>
      )}
    </>
  );
}

function ExplainerCredit({ references }: Pick<Credit, "references">) {
  return (
    <>
      <p className="mt-2 text-ink">
        Newslingo wrote this explainer for English learners and added a Turkish
        translation.
        {references.length > 0 && " You can check its facts in these sources:"}
      </p>
      {references.length > 0 && (
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink">
          {references.map(({ title, publisher, url, checkedAt }, index) => (
            <li key={index}>
              {isWebAddress(url) ? (
                <ExternalLink href={url}>{title}</ExternalLink>
              ) : (
                title
              )}
              , {publisher}.{" "}
              <span className="text-sm text-ink-muted">
                Checked{" "}
                <time dateTime={checkedAt.toISOString().slice(0, 10)}>
                  {formatArticleDate(checkedAt)}
                </time>
                .
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

/**
 * The credit at the end of every article: news names and links its source,
 * with the licence when the source requires one; an explainer lists the
 * references its facts can be checked in.
 */
export function AboutThisArticle({ article }: { article: Credit }) {
  const { kind, sourceName, sourceUrl, sourceLicence, references } = article;

  return (
    <aside
      aria-labelledby="source-heading"
      className="mt-12 rounded-xl border border-rule bg-surface p-5 sm:p-6"
    >
      <h2 id="source-heading" className={eyebrow}>
        About this article
      </h2>
      {kind === "EXPLAINER" ? (
        <ExplainerCredit references={references} />
      ) : (
        // The database requires a source on news.
        sourceName &&
        sourceUrl && (
          <NewsCredit
            sourceName={sourceName}
            sourceUrl={sourceUrl}
            sourceLicence={sourceLicence}
          />
        )
      )}
    </aside>
  );
}
