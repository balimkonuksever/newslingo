import type { ReferenceExpression } from "../../expression-library";

/** Entertainment's expression page, in display order: common phrases first. */
export const ENTERTAINMENT_EXPRESSIONS: ReferenceExpression[] = [
  {
    slug: "be-a-hit",
    expression: "be a hit",
    type: "COLLOCATION",
    level: "B1",
    en: "If a film, song or show is a hit, a lot of people like it and it is very successful.",
    tr: "tutmak, çok beğenilmek, hit olmak",
    example: {
      en: "Her first song was a big hit.",
      tr: "İlk şarkısı çok tuttu.",
    },
    usage:
      "Often with “big” or “huge”: “The show was a huge hit with teenagers.”",
    warning: "“Hit” here is a success, not “vurmak”.",
    categories: ["entertainment"],
    reviewed: "2026-09-30",
  },
  {
    slug: "sell-out",
    expression: "sell out",
    type: "PHRASAL_VERB",
    level: "B1",
    en: "If tickets or a product sell out, they are all bought and none are left.",
    tr: "(bilet, ürün) tükenmek; (gösteri) kapalı gişe oynamak",
    example: {
      en: "The concert sold out in ten minutes.",
      tr: "Konserin biletleri on dakikada tükendi.",
    },
    usage: "“Sold out” is also an adjective: “Tonight's show is sold out.”",
    warning:
      "“Out” does not mean “dışarı” here. For a show, Turkish says “kapalı gişe”.",
    categories: ["entertainment"],
    reviewed: "2026-09-30",
  },
  {
    slug: "behind-the-scenes",
    expression: "behind the scenes",
    type: "IDIOM",
    level: "B2",
    en: "Out of public view: the work that happens where the audience cannot see it.",
    tr: "perde arkasında, kamera arkasında",
    example: {
      en: "Hundreds of people work behind the scenes on every film.",
      tr: "Her filmin perde arkasında yüzlerce kişi çalışır.",
    },
    usage:
      "Also used for politics and business: “talks behind the scenes”. Before a noun it takes hyphens: “a behind-the-scenes video”.",
    categories: ["entertainment"],
    reviewed: "2026-09-30",
  },
  {
    slug: "go-viral",
    expression: "go viral",
    type: "COMMON_EXPRESSION",
    level: "B2",
    en: "If a video, photo or post goes viral, it spreads very quickly online and a huge number of people see it.",
    tr: "(internette) hızla yayılmak, viral olmak",
    example: {
      en: "Her video from the rehearsal went viral overnight.",
      tr: "Provada çektiği video bir gecede viral oldu.",
    },
    usage:
      "Used for things people share online: videos, photos, posts and songs.",
    warning: "“Go” means “become” here, as in “go red”; it is not “gitmek”.",
    categories: ["entertainment"],
    reviewed: "2026-09-30",
  },
  {
    slug: "steal-the-show",
    expression: "steal the show",
    type: "IDIOM",
    level: "B2",
    en: "To get more attention and praise than anyone else at a performance or event.",
    tr: "tüm ilgiyi üzerine çekmek, herkesi gölgede bırakmak",
    example: {
      en: "The lead actor was good, but the little girl in the second scene stole the show.",
      tr: "Başrol oyuncusu iyiydi ama ikinci sahnedeki küçük kız herkesi gölgede bıraktı.",
    },
    usage: "Also used for things: “The costumes stole the show.”",
    warning: "Nothing is stolen: it is praise, not a crime.",
    categories: ["entertainment"],
    reviewed: "2026-09-30",
  },
  {
    slug: "live-up-to-the-hype",
    expression: "live up to the hype",
    type: "COMMON_EXPRESSION",
    level: "B2",
    en: "To be as good as everyone said it would be.",
    tr: "beklentileri karşılamak, abartıldığı kadar iyi çıkmak",
    example: {
      en: "Everyone was talking about the new series, but it didn't live up to the hype.",
      tr: "Herkes yeni diziden bahsediyordu ama dizi beklentileri karşılamadı.",
    },
    usage:
      "Most often in the negative. The core phrase is “live up to”: “live up to expectations”.",
    warning:
      "Nothing to do with “yaşamak”: “live up to” means “to be as good as”.",
    categories: ["entertainment"],
    reviewed: "2026-09-30",
  },
  {
    slug: "make-a-comeback",
    expression: "make a comeback",
    type: "COLLOCATION",
    level: "B2",
    en: "To become popular or successful again after a long time.",
    tr: "geri dönüş yapmak; (moda, akım) yeniden popüler olmak",
    example: {
      en: "After ten years away, the band is making a comeback with a new album.",
      tr: "On yıllık aranın ardından grup, yeni bir albümle geri dönüş yapıyor.",
    },
    usage:
      "Also used for fashions and objects: “Vinyl records have made a comeback.”",
    categories: ["entertainment"],
    reviewed: "2026-09-30",
  },
  {
    slug: "box-office-hit",
    expression: "box-office hit",
    type: "COLLOCATION",
    level: "B2",
    en: "A film that sells a lot of cinema tickets and makes a lot of money.",
    tr: "gişe başarısı, gişede çok iş yapan film",
    example: {
      en: "The comedy became the biggest box-office hit of the summer.",
      tr: "Komedi, yazın en büyük gişe başarısı oldu.",
    },
    usage:
      "“The box office” means ticket sales: “The film did well at the box office.” The opposite is “a box-office flop”.",
    categories: ["entertainment"],
    reviewed: "2026-09-30",
  },
  {
    slug: "spoiler-alert",
    expression: "spoiler alert",
    type: "COMMON_EXPRESSION",
    level: "B1",
    en: "A warning that you are about to say what happens in a film, series or book.",
    tr: "Spoiler uyarısı! (sürprizi bozacak bilgi geliyor)",
    example: {
      en: "Spoiler alert: the detective was the killer all along.",
      tr: "Spoiler uyarısı: katil baştan beri dedektifmiş.",
    },
    usage:
      "Said or written just before revealing a twist. The verb is “spoil”: “Don't spoil the ending!”",
    categories: ["entertainment"],
    reviewed: "2026-09-30",
  },
  {
    slug: "break-a-leg",
    expression: "break a leg",
    type: "IDIOM",
    level: "B2",
    en: "Said to a performer before they go on stage, to wish them good luck.",
    tr: "Bol şans! (sahneye çıkacak birine)",
    example: {
      en: "Is tonight your first time on stage? Break a leg!",
      tr: "Bu akşam ilk kez mi sahneye çıkıyorsun? Bol şans!",
    },
    usage:
      "In the theatre, saying “good luck” is thought to bring bad luck, so people say this instead.",
    warning:
      "Never translate it word for word: it is a kind wish, not “bacağını kır”.",
    categories: ["entertainment"],
    reviewed: "2026-09-30",
  },
  {
    slug: "the-talk-of-the-town",
    expression: "the talk of the town",
    type: "IDIOM",
    level: "B2",
    en: "Someone or something that everyone is talking about.",
    tr: "herkesin dilinde olmak, herkesin konuştuğu kişi ya da şey",
    example: {
      en: "After the festival, the young director was the talk of the town.",
      tr: "Festivalden sonra genç yönetmen herkesin dilindeydi.",
    },
    usage: "Usually after “be” or “become”.",
    warning:
      "“Town” just means “everyone” here: think “herkesin dilinde”, not “şehrin konuşması”.",
    categories: ["entertainment"],
    reviewed: "2026-09-30",
  },
  {
    slug: "breakout-star",
    expression: "breakout star",
    type: "COLLOCATION",
    level: "C1",
    en: "A performer who suddenly becomes famous, usually because of one role, show or song.",
    tr: "bir anda parlayan yıldız, bir anda ünlü olan oyuncu ya da sanatçı",
    example: {
      en: "The film turned its young lead into a breakout star.",
      tr: "Film, genç başrol oyuncusunu bir anda yıldız yaptı.",
    },
    usage:
      "“Breakout” also describes the role or song that made someone famous: “her breakout role”.",
    warning:
      "Nothing to do with escaping: “breakout” here means a sudden success.",
    categories: ["entertainment"],
    reviewed: "2026-09-30",
  },
  {
    slug: "rave-reviews",
    expression: "rave reviews",
    type: "COLLOCATION",
    level: "C1",
    en: "Extremely positive opinions from critics.",
    tr: "övgü dolu eleştiriler",
    example: {
      en: "The new album got rave reviews from critics.",
      tr: "Yeni albüm eleştirmenlerden övgü dolu yorumlar aldı.",
    },
    usage:
      "Usually after “get” or “receive”, or in “open to rave reviews”: “The play opened to rave reviews.”",
    warning:
      "Nothing to do with a rave party: “rave” here means “extremely enthusiastic”.",
    categories: ["entertainment"],
    reviewed: "2026-09-30",
  },
];
