/**
 * Marks an explainer, so readers never mistake it for news. News carries no
 * badge: it is what readers expect of a news site.
 */
export function ExplainerBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-rule-strong px-2 py-0.5 text-xs font-semibold tracking-wide text-ink-muted">
      Explainer
    </span>
  );
}
