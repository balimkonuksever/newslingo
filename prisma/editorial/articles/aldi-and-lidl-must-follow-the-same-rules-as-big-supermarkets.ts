import type { WrittenNews } from "../../written-articles";

/*
 * Adapted by Claude (Opus 5.5) on 2026-10-28 from the Competition and Markets
 * Authority's GOV.UK story of 22 October 2026, under the Open Government
 * Licence v3.0. The user reviewed its facts and Turkish in the admin preview
 * on 2026-10-30 and approved it for the site.
 */
export const ALDI_AND_LIDL_SUPERMARKET_RULES: WrittenNews = {
  slug: "aldi-and-lidl-must-follow-the-same-rules-as-big-supermarkets",
  kind: "NEWS",
  title:
    "Aldi and Lidl Must Now Follow the Same Rules as Other Big Supermarkets",
  shortSummary:
    "A decision by the UK's competition regulator means the two chains cannot use land agreements to stop rival supermarkets opening nearby.",
  categorySlug: "business",
  difficulty: "B1",
  source: {
    name: "Competition and Markets Authority",
    url: "https://www.gov.uk/government/news/aldi-and-lidl-will-be-subject-to-same-rules-as-major-supermarkets",
    publishedAt: new Date("2026-10-22T09:02:23Z"),
    licence: "OGL_3_0",
  },
  publishedOnSite: new Date("2026-10-31"),
  paragraphs: [
    {
      english:
        "Aldi and Lidl, two of the UK's biggest supermarket chains, will have to follow the same rules as the country's other large supermarkets. The decision was announced by the Competition and Markets Authority (CMA), the organisation that makes sure companies in the UK compete fairly.",
      turkish:
        "Birleşik Krallık'ın en büyük süpermarket zincirlerinden ikisi olan Aldi ve Lidl, ülkedeki diğer büyük süpermarketlerle aynı kurallara uymak zorunda kalacak. Kararı, şirketlerin Birleşik Krallık'ta adil biçimde rekabet etmesini sağlamakla görevli Rekabet ve Piyasalar Kurumu (CMA) açıkladı.",
    },
    {
      english:
        "The rules were introduced in 2010. They stop large supermarkets from using agreements about land to make it harder for rival supermarkets to open in the same area. For example, an agreement might include a condition that no other supermarket can open a shop on a piece of land. The CMA says the rules help supermarkets compete freely, so shoppers have more choice about where to buy their food and how much to pay for it.",
      turkish:
        "Kurallar 2010'da getirildi. Bu kurallar, büyük süpermarketlerin arazi anlaşmalarını rakip süpermarketlerin aynı bölgede mağaza açmasını zorlaştırmak için kullanmasını engelliyor. Örneğin bir anlaşmaya, bir arsada başka hiçbir süpermarketin mağaza açamayacağına dair bir şart konabilir. CMA'ya göre bu kurallar süpermarketlerin serbestçe rekabet etmesine yardımcı oluyor; böylece müşterilerin, yiyeceklerini nereden alacakları ve bunun için ne kadar ödeyecekleri konusunda daha fazla seçeneği oluyor.",
    },
    {
      english:
        "Until now, the rules covered seven supermarket chains, including Tesco, Sainsbury's and Asda. Aldi and Lidl will now be treated in the same way. They cannot include these kinds of conditions in new agreements, and the CMA can review their existing agreements if landowners, developers or rival supermarkets ask it to.",
      turkish:
        "Şimdiye kadar bu kurallar, aralarında Tesco, Sainsbury's ve Asda'nın da bulunduğu yedi süpermarket zincirini kapsıyordu. Artık aynı kurallar Aldi ve Lidl için de geçerli olacak. Bu iki zincir yeni anlaşmalarına bu tür şartlar koyamayacak; arazi sahipleri, gayrimenkul geliştiricileri ya da rakip süpermarketler isterse CMA, mevcut anlaşmalarını da inceleyebilecek.",
    },
    {
      english:
        "In August, the CMA asked for opinions on its plan. Everyone who replied, including Morrisons, Waitrose and the frozen food chain Iceland, supported it. Aldi and Lidl did not send any comments.",
      turkish:
        "CMA, ağustos ayında planı hakkında görüş istedi. Görüş bildirenlerin hepsi planı destekledi; aralarında Morrisons, Waitrose ve dondurulmuş gıda zinciri Iceland de vardı. Aldi ve Lidl ise hiç yorum göndermedi.",
    },
    {
      english:
        "One of the CMA's directors said the change would help to “level the playing field”. She added that it would also help shoppers find the best choice of products and prices near where they live.",
      turkish:
        "CMA'nın yöneticilerinden biri, bu değişikliğin “herkes için eşit şartlar” sağlamaya yardımcı olacağını söyledi. Yönetici ayrıca, değişikliğin müşterilerin yaşadıkları yerin yakınında en iyi ürün ve fiyat seçeneklerini bulmasına da yardımcı olacağını ekledi.",
    },
    {
      english:
        "The CMA estimates that the UK's food and grocery market is worth £222.7 billion. It points out that Aldi and Lidl are both among the five biggest grocery retailers by market share.",
      turkish:
        "CMA, Birleşik Krallık'taki gıda ve market pazarının 222,7 milyar sterlin değerinde olduğunu tahmin ediyor. Kurum, pazar payına göre en büyük beş market perakendecisinden ikisinin Aldi ve Lidl olduğuna dikkat çekiyor.",
    },
  ],
  senseChoices: {
    1: {
      chains: ["chain-stores"],
      competition: ["competition-rivalry"],
      that: ["that-relative"],
    },
    2: {
      about: ["about-topic", "about-topic"],
      open: ["open-verb", "open-verb"],
      that: ["that-conjunction"],
      help: ["help-verb"],
    },
    3: { chains: ["chain-stores"], conditions: ["condition-requirement"] },
    5: {
      change: ["change-noun"],
      help: ["help-verb", "help-verb"],
      field: ["field-sport"],
      that: ["that-conjunction"],
    },
    6: { that: ["that-conjunction", "that-conjunction"] },
  },
  keyVocabulary: [
    { paragraph: 1, word: "chains" },
    { paragraph: 2, word: "rival" },
    { paragraph: 2, word: "condition" },
    { paragraph: 3, word: "review" },
    { paragraph: 3, word: "existing" },
    { paragraph: 6, word: "estimates" },
    { paragraph: 6, word: "retailers" },
  ],
  expressions: [
    { expression: "until-now", paragraph: 3, text: "Until now" },
    { expression: "point-out", paragraph: 6, text: "points out" },
  ],
};
