import type { ReferenceExpression } from "../../expression-library";

/**
 * Everyday phrases that belong to no single topic. No category page lists
 * them; they appear in the articles that use them.
 */
export const GENERAL_EXPRESSIONS: ReferenceExpression[] = [
  {
    slug: "thanks-to",
    expression: "thanks to",
    type: "COMMON_EXPRESSION",
    level: "B1",
    en: "Because of someone or something, usually when the result is good.",
    tr: "sayesinde",
    example: {
      en: "We got home early thanks to the new train line.",
      tr: "Yeni tren hattı sayesinde eve erken vardık.",
    },
    usage:
      "With a bad result it sounds ironic: “Thanks to the traffic, we missed the start.”",
    warning: "It is not a thank-you: it means “sayesinde”, not “teşekkürler”.",
    categories: [],
    reviewed: "2026-09-30",
  },
  {
    slug: "open-its-doors",
    expression: "open its doors",
    type: "COMMON_EXPRESSION",
    level: "B1",
    en: "When a cinema, shop, museum or school opens its doors, it starts working, or starts again after being closed.",
    tr: "kapılarını açmak, açılmak, hizmete girmek",
    example: {
      en: "The new museum will open its doors to visitors in May.",
      tr: "Yeni müze mayısta kapılarını ziyaretçilere açacak.",
    },
    usage:
      "The opposite is “close its doors”, which often means closing permanently.",
    categories: [],
    reviewed: "2026-09-30",
  },
];
