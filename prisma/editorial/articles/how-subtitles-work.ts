import type { WrittenExplainer } from "../../written-articles";

/*
 * Written by Claude (Opus 5.5) on 2026-10-28 from the BBC's and Netflix's
 * subtitle guides, which its references link to. The user reviewed its facts
 * and Turkish in the admin preview on 2026-10-30 and approved it for the
 * site.
 */
export const HOW_SUBTITLES_WORK: WrittenExplainer = {
  slug: "how-subtitles-work",
  kind: "EXPLAINER",
  title: "How Subtitles Work",
  shortSummary:
    "Who subtitles are for, how long they can be and how fast they move, according to the BBC and Netflix.",
  categorySlug: "entertainment",
  difficulty: "A2",
  writtenAt: new Date("2026-10-28T12:00:00Z"),
  publishedOnSite: new Date("2026-10-31"),
  references: [
    {
      title: "BBC Subtitle Guidelines",
      publisher: "BBC",
      url: "https://www.bbc.co.uk/accessibility/forproducts/guides/subtitles/",
      checkedAt: new Date("2026-10-28"),
    },
    {
      title: "English (USA) Timed Text Style Guide",
      publisher: "Netflix",
      url: "https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide",
      checkedAt: new Date("2026-10-28"),
    },
  ],
  paragraphs: [
    {
      english:
        "When you watch a film or a TV programme, subtitles are the words at the bottom of the screen. They tell you what people are saying. Subtitles can also describe important sounds, like music or people clapping.",
      turkish:
        "Bir film ya da televizyon programı izlerken ekranın altında gördüğünüz yazılara altyazı denir. Altyazılar, insanların ne söylediğini size aktarır. Ayrıca müzik ya da insanların alkışlaması gibi önemli sesleri de belirtebilirler.",
    },
    {
      english:
        "Subtitles are mainly for people who cannot hear well. But the BBC says that many different kinds of people use them.",
      turkish:
        "Altyazılar esas olarak iyi duyamayan insanlar içindir. Ancak BBC'ye göre altyazıları çok farklı insanlar kullanıyor.",
    },
    {
      english:
        "Subtitles must be short, so that people have time to read them. Netflix's rules for English subtitles say that a subtitle can have two lines at most, and each line can have up to 42 characters. Characters are letters, numbers, spaces and other signs.",
      turkish:
        "İnsanların okumaya vakti olsun diye altyazıların kısa olması gerekir. Netflix'in İngilizce altyazı kurallarına göre bir altyazı en fazla iki satır olabilir ve her satırda en fazla 42 karakter bulunabilir. Harfler, rakamlar, boşluklar ve diğer işaretlerin her biri bir karakterdir.",
    },
    {
      english:
        "Subtitles cannot move too fast, either. The BBC's guide says that subtitles should usually move at about 160 to 180 words a minute. Netflix counts characters instead: up to 20 characters a second in programmes for adults, and up to 17 in programmes for children.",
      turkish:
        "Altyazılar çok hızlı da geçemez. BBC'nin kılavuzuna göre altyazılar genellikle dakikada yaklaşık 160 ila 180 kelime hızında geçmeli. Netflix ise karakter sayıyor: yetişkinlere yönelik programlarda saniyede en fazla 20, çocuk programlarında ise en fazla 17 karakter.",
    },
    {
      english:
        "Behind the scenes, subtitle writers have to make choices. When people speak very fast, a subtitle is sometimes a little shorter than what they say. But the writers try to stay as close as possible to the words people really say.",
      turkish:
        "Perde arkasında altyazı yazarlarının bazı seçimler yapması gerekir. İnsanlar çok hızlı konuştuğunda bir altyazı bazen söylenenden biraz daha kısa olabilir. Ama yazarlar, insanların gerçekten söylediği sözlere olabildiğince yakın kalmaya çalışır.",
    },
  ],
  senseChoices: {
    1: { screen: ["screen-device"] },
    2: { that: ["that-conjunction"] },
    3: {
      that: ["that-conjunction", "that-conjunction"],
      most: ["most-superlative"],
    },
    4: {
      too: ["too-excess"],
      second: ["second-time"],
      that: ["that-conjunction"],
      about: ["about-approximately"],
    },
  },
  keyVocabulary: [
    { paragraph: 1, word: "screen" },
    { paragraph: 1, word: "describe" },
    { paragraph: 1, word: "sounds" },
    { paragraph: 2, word: "hear" },
    { paragraph: 3, word: "lines" },
    { paragraph: 3, word: "letters" },
    { paragraph: 5, word: "choices" },
  ],
  expressions: [
    { expression: "have-time-to", paragraph: 3, text: "have time to" },
    {
      expression: "behind-the-scenes",
      paragraph: 5,
      text: "Behind the scenes",
    },
  ],
};
