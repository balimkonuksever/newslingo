import type { WrittenNews } from "../../written-articles";

/*
 * Adapted by Claude (Opus 5.5) on 2026-10-31 from the Department for
 * Business, Innovation, Science and Trade's GOV.UK story of 15 October 2026,
 * published with the UK Space Agency, under the Open Government Licence
 * v3.0. The user reviews its facts and Turkish in the admin preview before
 * it is marked published.
 */
export const UK_MISSION_TO_CLEAN_UP_SPACE: WrittenNews = {
  slug: "uk-mission-to-clean-up-rubbish-in-space",
  kind: "NEWS",
  title: "The UK Plans a Mission to Clean Up Rubbish in Space",
  shortSummary:
    "A new spacecraft will catch two old satellites with robotic claws and take them down to burn up in the Earth's atmosphere.",
  categorySlug: "technology",
  difficulty: "B1",
  source: {
    name: "Department for Business, Innovation, Science and Trade",
    url: "https://www.gov.uk/government/news/world-first-mission-puts-uk-expertise-to-work-to-help-clean-up-space",
    publishedAt: new Date("2026-10-15T09:34:27Z"),
    licence: "OGL_3_0",
  },
  paragraphs: [
    {
      english:
        "The UK is planning a mission to clean up rubbish in space. A new spacecraft will use giant robotic claws to catch two old satellites that do not work, the government announced on 15 October.",
      turkish:
        "Birleşik Krallık, uzaydaki çöpleri temizlemek için bir görev planlıyor. Hükümetin 15 Ekim'de açıkladığına göre yeni bir uzay aracı, çalışmayan iki eski uyduyu dev robotik kıskaçlarla yakalayacak.",
    },
    {
      english:
        "Thousands of working satellites travel around the Earth, and we depend on them every day for GPS, weather forecasts and communications. But space is also full of junk: old satellites that are useless now, and broken pieces of them. According to the government, hundreds of thousands of these pieces are being tracked. They travel at more than 17,000 miles an hour, and they are big enough to damage the satellites we need.",
      turkish:
        "Dünya'nın çevresinde binlerce çalışan uydu dolaşıyor ve GPS, hava tahminleri ve iletişim için her gün onlara güveniyoruz. Ama uzay aynı zamanda çöple dolu: artık işe yaramayan eski uydular ve onların kırık parçaları. Hükümete göre bu parçaların yüz binlercesi izleniyor. Saatte 17.000 milden daha hızlı hareket ediyorlar ve ihtiyaç duyduğumuz uydulara zarar verecek kadar büyükler.",
    },
    {
      english:
        "The spacecraft will take the two old satellites lower and release them into the Earth's atmosphere, where they will burn up naturally. The government says it will be the first time that a spacecraft has removed more than one satellite in this way. It is spending more than £60 million on the mission. The spacecraft will be launched from Scotland in 2029, and the two satellites should be gone by 2032.",
      turkish:
        "Uzay aracı iki eski uyduyu daha aşağıya götürüp Dünya'nın atmosferine bırakacak; uydular orada kendiliğinden yanıp yok olacak. Hükümete göre bu, bir uzay aracının bu yolla birden fazla uyduyu ilk kez kaldırması olacak. Hükümet bu göreve 60 milyon sterlinden fazla para harcıyor. Uzay aracı 2029'da İskoçya'dan fırlatılacak ve iki uydunun 2032'ye kadar kaldırılmış olması bekleniyor.",
    },
    {
      english:
        "Today, satellites can only be used once. When they run out of fuel or develop a problem, they are left in space. The UK wants to develop technology that can repair satellites and refuel them, and the government expects this area to grow into a billion-dollar industry within the next ten years. The new spacecraft itself can be refuelled, so it could make a difference for many years.",
      turkish:
        "Bugün uydular yalnızca bir kez kullanılabiliyor. Yakıtları bittiğinde ya da bir arıza çıktığında uzayda bırakılıyorlar. Birleşik Krallık, uyduları onarabilen ve onlara yeniden yakıt verebilen teknolojiler geliştirmek istiyor. Hükümet bu alanın önümüzdeki on yıl içinde milyar dolarlık bir sektöre dönüşmesini bekliyor. Yeni uzay aracına da yeniden yakıt verilebiliyor, bu yüzden uzun yıllar boyunca fark yaratabilir.",
    },
    {
      english:
        "The spacecraft is being built by the company ClearSpace UK, which is working with the UK Space Agency. Space Minister Liz Lloyd said that the UK was determined to lead the world's effort to clean up space. The public can also take part in a competition to choose a name for the spacecraft.",
      turkish:
        "Uzay aracını, Birleşik Krallık Uzay Ajansı ile birlikte çalışan ClearSpace UK şirketi üretiyor. Uzay Bakanı Liz Lloyd, Birleşik Krallık'ın uzayı temizlemeye yönelik dünya çapındaki çabaya öncülük etmekte kararlı olduğunu söyledi. Halk da uzay aracına bir isim seçmek için düzenlenen bir yarışmaya katılabilir.",
    },
  ],
  senseChoices: {
    1: { that: ["that-relative"], work: ["work-function"] },
    2: { working: ["work-function"], that: ["that-relative"] },
    3: { atmosphere: ["atmosphere-air"], that: ["that-relative"] },
    4: {
      run: ["run-out"],
      that: ["that-relative"],
      repair: ["repair-verb"],
      next: ["next-following"],
    },
    5: {
      which: ["which-relative"],
      working: ["work-job"],
      that: ["that-conjunction"],
      competition: ["competition-contest"],
      public: ["public-noun"],
    },
  },
  keyVocabulary: [
    { paragraph: 1, word: "rubbish" },
    { paragraph: 1, word: "spacecraft" },
    { paragraph: 1, word: "satellites" },
    { paragraph: 2, word: "junk" },
    { paragraph: 2, word: "damage" },
    { paragraph: 3, word: "atmosphere" },
    { paragraph: 4, word: "fuel" },
    { paragraph: 4, word: "repair" },
  ],
  expressions: [
    {
      expression: "make-a-difference",
      paragraph: 4,
      text: "make a difference",
    },
    { expression: "take-part-in", paragraph: 5, text: "take part in" },
  ],
};
