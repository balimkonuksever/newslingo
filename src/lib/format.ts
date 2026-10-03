/** "1 article", "3 articles". */
export function formatArticleCount(count: number) {
  return `${count} ${count === 1 ? "article" : "articles"}`;
}

/** "1 expression", "13 expressions". */
export function formatExpressionCount(count: number) {
  return `${count} ${count === 1 ? "expression" : "expressions"}`;
}
