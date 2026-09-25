/** "1 article", "3 articles". */
export function formatArticleCount(count: number) {
  return `${count} ${count === 1 ? "article" : "articles"}`;
}
