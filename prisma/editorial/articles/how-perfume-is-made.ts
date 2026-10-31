import type { WrittenExplainer } from "../../written-articles";

/*
 * Written by Claude (Opus 5.5) on 2026-10-31 from Britannica's article on
 * perfume, which its reference links to. The user reviewed its facts and
 * Turkish in the admin preview on 2026-10-31 and approved it for the site.
 */
export const HOW_PERFUME_IS_MADE: WrittenExplainer = {
  slug: "how-perfume-is-made",
  kind: "EXPLAINER",
  title: "How Perfume Is Made",
  shortSummary:
    "Where the smells in a perfume come from, how they are mixed, and why a perfume smells different after an hour.",
  categorySlug: "beauty",
  difficulty: "A2",
  writtenAt: new Date("2026-10-31T12:00:00Z"),
  publishedOnSite: new Date("2026-10-31"),
  references: [
    {
      title: "Perfume",
      publisher: "Encyclopaedia Britannica",
      url: "https://www.britannica.com/art/perfume",
      checkedAt: new Date("2026-10-31"),
    },
  ],
  paragraphs: [
    {
      english:
        "People have made perfume for thousands of years. In ancient Egypt, China, Greece and Rome, people already knew how to make it. The word comes from Latin, and it means “through smoke”.",
      turkish:
        "İnsanlar binlerce yıldır parfüm yapıyor. Antik Mısır, Çin, Yunanistan ve Roma'da insanlar parfüm yapmayı zaten biliyordu. Parfüm kelimesi Latinceden gelir ve “duman yoluyla” anlamına gelir.",
    },
    {
      english:
        "Many of the smells in perfume come from plants: flowers like roses and jasmine, wood like sandalwood, and the skin of fruits like lemons and oranges. Scientists also create new ones in laboratories. Thanks to them, a perfume can smell like things that do not exist in nature.",
      turkish:
        "Parfümdeki kokuların çoğu bitkilerden gelir: gül ve yasemin gibi çiçeklerden, sandal ağacı gibi ağaçlardan, limon ve portakal gibi meyvelerin kabuğundan. Bilim insanları laboratuvarlarda yeni kokular da üretir. Bu kokular sayesinde bir parfüm, doğada var olmayan şeyler gibi kokabilir.",
    },
    {
      english:
        "To get the oil out of a plant, perfume makers often use hot steam, which carries the oil out of the flowers or leaves. With lemons and oranges, it is easier: the oil is pressed out of the skin.",
      turkish:
        "Parfüm üreticileri bir bitkinin yağını çıkarmak için çoğu zaman sıcak buhar kullanır. Buhar, yağı çiçeklerden ya da yapraklardan dışarı taşır. Limon ve portakalda iş daha kolaydır: yağ, kabuk sıkılarak çıkarılır.",
    },
    {
      english:
        "A person who creates perfumes is called a perfumer. A perfumer mixes many oils, like a cook with a recipe, and a fine perfume can have more than 100 ingredients. Then alcohol is added. In a perfume, about 10 to 25 percent is oil, so a little goes a long way.",
      turkish:
        "Parfüm yaratan kişiye parfümör denir. Parfümör, tarifi olan bir aşçı gibi birçok yağı karıştırır ve kaliteli bir parfümde 100'den fazla malzeme olabilir. Ardından alkol eklenir. Bir parfümün yaklaşık yüzde 10 ila 25'i yağdır, bu yüzden azı bile uzun süre yeter.",
    },
    {
      english:
        "A perfume does not smell the same all the time. You notice the top note first. It is fresh, but it soon disappears. Then you smell the middle note. The base note stays for hours. That is why a perfume smells different after an hour.",
      turkish:
        "Bir parfüm her zaman aynı kokmaz. Önce üst notayı fark edersiniz. Ferahtır ama kısa sürede kaybolur. Ardından orta notanın kokusunu alırsınız. Alt nota ise saatlerce kalır. Bu yüzden bir parfüm bir saat sonra farklı kokar.",
    },
  ],
  senseChoices: {
    2: {
      smells: ["smell-noun"],
      smell: ["smell-verb"],
      that: ["that-relative"],
    },
    3: { which: ["which-relative"] },
    4: { about: ["about-approximately"] },
    5: {
      smell: ["smell-verb", "smell-verb"],
      note: ["note-perfume", "note-perfume", "note-perfume"],
      that: ["that-demonstrative"],
      smells: ["smell-verb"],
    },
  },
  keyVocabulary: [
    { paragraph: 1, word: "smoke" },
    { paragraph: 2, word: "smells" },
    { paragraph: 2, word: "plants" },
    { paragraph: 3, word: "steam" },
    { paragraph: 3, word: "pressed" },
    { paragraph: 4, word: "ingredients" },
    { paragraph: 5, word: "fresh" },
  ],
  expressions: [
    { expression: "thanks-to", paragraph: 2, text: "Thanks to" },
    {
      expression: "a-little-goes-a-long-way",
      paragraph: 4,
      text: "a little goes a long way",
    },
  ],
};
