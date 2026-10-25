/*
 * An unpublished demo article for the admin workflow (M5). The demo seed
 * writes it as a draft that only an admin can publish, and reseeding makes
 * it a draft again. Like the published demo articles it is original and
 * invented, its CEFR level is the author's intent, and it is never evaluation
 * data. Its Turkish has not been reviewed by a native speaker, and its words
 * have no editorial dictionary entries.
 */

import type { DemoArticle } from "./articles";

export type DemoDraft = Omit<DemoArticle, "publishedOnSiteAt">;

export const DEMO_DRAFTS: ReadonlyArray<DemoDraft> = [
  {
    slug: "town-library-lends-tools-as-well-as-books",
    title: "A Town Library Now Lends Tools as Well as Books",
    shortSummary:
      "Readers can borrow a drill, a ladder or a sewing machine with the same card they use for books.",
    categorySlug: "world",
    difficulty: "B1",
    sourcePublishedAt: new Date("2026-10-20T06:00:00Z"),
    paragraphs: [
      {
        english:
          "A public library in a small town has started lending tools as well as books. Residents can now borrow a drill, a ladder or a sewing machine with the same card they use for novels and magazines.",
        turkish:
          "Küçük bir kasabadaki halk kütüphanesi, kitapların yanı sıra alet de ödünç vermeye başladı. Kasaba sakinleri artık roman ve dergi için kullandıkları kartla matkap, merdiven ya da dikiş makinesi ödünç alabiliyor.",
      },
      {
        english:
          "The librarians say the idea came from readers. Many people need a tool only once or twice a year, so buying one felt like a waste of money and space.",
        turkish:
          "Kütüphaneciler fikrin okurlardan geldiğini söylüyor. Pek çok kişinin bir alete yılda yalnızca bir iki kez ihtiyacı oluyor, bu yüzden bir tane satın almak para ve yer israfı gibi geliyordu.",
      },
      {
        english:
          "In the first month, more than two hundred tools went out. The most popular item was a carpet cleaner, which was booked every weekend.",
        turkish:
          "İlk ayda iki yüzden fazla alet ödünç verildi. En çok ilgi gören ise her hafta sonu ayırtılan halı yıkama makinesi oldu.",
      },
    ],
  },
];
