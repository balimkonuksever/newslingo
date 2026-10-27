/*
 * Demo articles for development and tests only. The text is original and
 * written for Newslingo: the places, organisations and people are invented and
 * must not be read as real news. The CEFR levels record the author's intent
 * and are not verified labels, so never use these articles as evaluation data.
 *
 * Every demo news article is attributed to DEMO_SOURCE_NAME with a URL on a
 * reserved `.example` domain, so a fixture can never be mistaken for ingested
 * news. The demo explainer's references are fixtures on the same domain.
 * Word count and reading time are derived from the English paragraphs when
 * the seed runs.
 */

import type { Difficulty } from "../../src/generated/prisma/enums";
import type { ReferenceCategorySlug } from "../reference/categories";

export const DEMO_SOURCE_NAME = "Newslingo demo fixture";

const DEMO_SOURCE_ORIGIN = "https://demo.newslingo.example";

export function demoSourceUrl(slug: string) {
  return `${DEMO_SOURCE_ORIGIN}/articles/${slug}`;
}

export function demoReferenceUrl(slug: string) {
  return `${DEMO_SOURCE_ORIGIN}/references/${slug}`;
}

type DemoArticleContent = {
  slug: string;
  title: string;
  shortSummary: string | null;
  categorySlug: ReferenceCategorySlug;
  difficulty: Difficulty;
  publishedOnSiteAt: Date;
  paragraphs: ReadonlyArray<{ english: string; turkish: string }>;
};

/** News, attributed to DEMO_SOURCE_NAME when seeded. */
export type DemoNews = DemoArticleContent & {
  kind: "NEWS";
  sourcePublishedAt: Date;
};

export type DemoReference = {
  title: string;
  publisher: string;
  url: string;
  checkedAt: Date;
};

/** An explainer, with no source, dated the day it was written. */
export type DemoExplainer = DemoArticleContent & {
  kind: "EXPLAINER";
  writtenAt: Date;
  references: ReadonlyArray<DemoReference>;
};

export type DemoArticle = DemoNews | DemoExplainer;

/** The date readers see: news is dated by its source, an explainer by its writing. */
export function demoDatedAt(
  article:
    | Pick<DemoNews, "kind" | "sourcePublishedAt">
    | Pick<DemoExplainer, "kind" | "writtenAt">,
) {
  return article.kind === "NEWS"
    ? article.sourcePublishedAt
    : article.writtenAt;
}

export const DEMO_ARTICLES: ReadonlyArray<DemoArticle> = [
  {
    slug: "three-neighbouring-countries-sign-river-agreement",
    title:
      "After Years of Negotiation, Three Neighbouring Countries Sign an Agreement to Share and Protect the River That Connects Them",
    shortSummary:
      "The deal ties each country's share of water to the river's actual flow and creates a joint commission to monitor pollution, but critics question how it will be enforced.",
    categorySlug: "world",
    difficulty: "C1",
    kind: "NEWS",
    sourcePublishedAt: new Date("2026-09-19T21:45:00Z"),
    publishedOnSiteAt: new Date("2026-09-20T07:30:00Z"),
    paragraphs: [
      {
        english:
          "Three neighbouring countries have signed an agreement on the shared management of a river that flows through all of their territories, bringing to an end more than a decade of intermittent and often acrimonious negotiations. The accord, which must still be ratified by each national parliament, establishes a framework for allocating water during droughts and commits the signatories to reducing industrial and agricultural pollution along the river's course.",
        turkish:
          "Üç komşu ülke, topraklarının tamamından geçen bir nehrin ortak yönetimine ilişkin bir anlaşma imzalayarak on yılı aşkın süredir aralıklarla süren ve çoğu zaman gergin geçen müzakerelere son verdi. Her ülkenin parlamentosunda ayrıca onaylanması gereken anlaşma, kuraklık dönemlerinde suyun paylaştırılmasına yönelik bir çerçeve oluşturuyor ve imzacı ülkeleri nehir boyunca sanayi ve tarım kaynaklı kirliliği azaltmakla yükümlü kılıyor.",
      },
      {
        english:
          "The river rises in the mountains of the northernmost country and flows south for several hundred kilometres before reaching the sea. It supplies drinking water to millions of people and irrigates a substantial proportion of the region's farmland. Over the past twenty years, declining rainfall and rising demand have intensified competition for its water, and the three governments have repeatedly accused one another of taking more than their fair share.",
        turkish:
          "Nehir, en kuzeydeki ülkenin dağlarından doğuyor ve denize ulaşmadan önce birkaç yüz kilometre boyunca güneye akıyor. Milyonlarca insana içme suyu sağlıyor ve bölgedeki tarım arazilerinin önemli bir kısmını suluyor. Son yirmi yılda azalan yağışlar ve artan talep, nehrin suyu üzerindeki rekabeti kızıştırdı; üç hükümet de birbirini defalarca hakkından fazlasını almakla suçladı.",
      },
      {
        english:
          "At the heart of the deal is a formula that links each country's share to the river's actual flow rather than to fixed annual quantities. Negotiators argued that fixed quotas, which featured in earlier drafts, would have been unworkable in dry years, when the upstream country might have been obliged to release more water than the river was carrying. Under the new arrangement, shortages are shared proportionally, and a country facing an emergency may request an additional allocation, subject to the approval of the other two.",
        turkish:
          "Anlaşmanın merkezinde, her ülkenin payını sabit yıllık miktarlara değil nehrin gerçek akışına bağlayan bir formül yer alıyor. Müzakereciler, önceki taslaklarda yer alan sabit kotaların kurak yıllarda uygulanamaz olacağını savundu; çünkü böyle yıllarda yukarı havzadaki ülke, nehrin taşıdığından daha fazla su bırakmak zorunda kalabilirdi. Yeni düzenlemeye göre su kıtlığının yükü orantılı olarak paylaşılacak; olağanüstü bir durumla karşılaşan bir ülke ise diğer ikisinin onayıyla ek su tahsisi talep edebilecek.",
      },
      {
        english:
          "The agreement also creates a joint river commission, staffed by engineers and scientists from all three countries, which will operate a network of monitoring stations and publish water-quality data. Supporters regard this transparency as the accord's most significant achievement. For years, each government relied on its own measurements, and talks frequently stalled because the parties could not even agree on the basic figures.",
        turkish:
          "Anlaşma ayrıca üç ülkenin mühendis ve bilim insanlarından oluşan ortak bir nehir komisyonu kuruyor. Komisyon, bir izleme istasyonları ağını işletecek ve su kalitesi verilerini yayımlayacak. Anlaşmayı destekleyenler bu şeffaflığı anlaşmanın en önemli kazanımı olarak görüyor. Yıllarca her hükümet kendi ölçümlerine dayanmıştı ve taraflar temel rakamlarda bile uzlaşamadığı için görüşmeler sık sık tıkanıyordu.",
      },
      {
        english:
          "Environmental groups have cautiously welcomed the deal, but several have pointed out that it contains no binding penalties for countries that miss their pollution targets. Instead, disputes will be referred to the commission and, if they remain unresolved, to a panel of independent experts whose recommendations are not legally enforceable. Critics fear that, without stronger enforcement mechanisms, the most ambitious commitments could remain largely symbolic.",
        turkish:
          "Çevre örgütleri anlaşmayı temkinli bir memnuniyetle karşıladı; ancak bazıları, kirlilik hedeflerini tutturamayan ülkeler için bağlayıcı hiçbir yaptırım öngörülmediğine dikkat çekti. Bunun yerine anlaşmazlıklar komisyona, orada çözülemezse de tavsiyeleri hukuken bağlayıcı olmayan bağımsız bir uzmanlar kuruluna götürülecek. Eleştirmenler, daha güçlü yaptırım mekanizmaları olmadan en iddialı taahhütlerin büyük ölçüde sembolik kalabileceğinden endişe ediyor.",
      },
      {
        english:
          "Farmers in the downstream country, whose irrigation systems depend heavily on the river, have expressed mixed feelings. Many welcome the guarantee of a proportional share during droughts, yet others worry that the pollution rules will force costly changes to the way they use fertilisers. Officials have promised financial support for the transition, although the details have yet to be published.",
        turkish:
          "Sulama sistemleri büyük ölçüde nehre bağlı olan aşağı havzadaki ülkenin çiftçileri ise karışık duygular içinde. Pek çoğu kuraklık dönemlerinde orantılı bir pay güvencesini memnuniyetle karşılarken, bazıları kirlilik kurallarının gübre kullanım biçimlerinde maliyetli değişiklikler gerektireceğinden endişe ediyor. Yetkililer bu geçiş süreci için mali destek sözü verdi; ancak ayrıntılar henüz açıklanmadı.",
      },
      {
        english:
          "Analysts note that agreements of this kind rarely succeed or fail on the strength of their wording alone. Much will depend on whether the commission receives adequate funding and genuine independence, and on whether governments are prepared to accept its findings when they prove politically inconvenient. The first real test is likely to come during the next prolonged dry season, when the pressure on each country to protect its own supply will be at its greatest.",
        turkish:
          "Analistler, bu tür anlaşmaların başarısının ya da başarısızlığının nadiren yalnızca metnin ifadelerine bağlı olduğunu belirtiyor. Çok şey, komisyona yeterli finansman ve gerçek bir bağımsızlık tanınıp tanınmayacağına ve hükümetlerin, siyasi açıdan işlerine gelmediğinde bile komisyonun bulgularını kabul etmeye hazır olup olmadığına bağlı olacak. İlk gerçek sınavın, her ülkenin kendi su kaynağını koruma baskısının en yüksek düzeye ulaşacağı bir sonraki uzun kurak mevsimde yaşanması bekleniyor.",
      },
    ],
  },
  {
    slug: "farmers-turn-to-ai-weather-forecasts",
    title: "Farmers Turn to AI Weather Forecasts to Decide When to Harvest",
    shortSummary:
      "Small farms are using AI tools that predict rain and frost for a single field, but many growers still trust their own eyes before making the final call.",
    categorySlug: "ai",
    difficulty: "B2",
    kind: "NEWS",
    sourcePublishedAt: new Date("2026-09-18T06:30:00Z"),
    publishedOnSiteAt: new Date("2026-09-18T11:00:00Z"),
    paragraphs: [
      {
        english:
          "For generations, farmers have looked at the sky, checked the wind and relied on experience to decide when to harvest. Now a growing number of small and medium-sized farms are adding another tool to that routine: weather forecasts produced by artificial intelligence. Instead of predicting conditions for a whole region, these systems estimate what is likely to happen on a single field over the next few days.",
        turkish:
          "Çiftçiler kuşaklar boyunca hasat zamanına karar vermek için gökyüzüne bakmış, rüzgârı kontrol etmiş ve deneyimlerine güvenmiştir. Şimdi giderek daha fazla küçük ve orta ölçekli çiftlik bu alışkanlığa yeni bir araç ekliyor: yapay zekâ tarafından üretilen hava tahminleri. Bu sistemler bütün bir bölge için tahmin yapmak yerine, önümüzdeki birkaç gün içinde tek bir tarlada neler olabileceğini öngörüyor.",
      },
      {
        english:
          "The tools combine satellite images, data from nearby weather stations and years of historical records. Machine-learning models search this information for patterns and turn them into hour-by-hour predictions of rain, frost and humidity. Some services also send a warning to the farmer's phone when conditions are about to change, for example when a sudden frost could damage fruit that is almost ready to be picked.",
        turkish:
          "Bu araçlar uydu görüntülerini, yakındaki hava istasyonlarından gelen verileri ve yıllara dayanan geçmiş kayıtları bir araya getiriyor. Makine öğrenmesi modelleri bu bilgilerde örüntüler arıyor ve bunları yağmur, don ve nem için saat saat tahminlere dönüştürüyor. Bazı hizmetler, koşullar değişmek üzereyken çiftçinin telefonuna uyarı da gönderiyor; örneğin ani bir don, toplanmaya neredeyse hazır meyvelere zarar verebilecekse.",
      },
      {
        english:
          "Most of these forecasts are delivered through simple mobile apps. Farmers enter the location of each field, the type of crop and the date it was planted. The app then combines this information with the weather data and suggests the best days for jobs such as spraying, watering or harvesting.",
        turkish:
          "Bu tahminlerin çoğu basit mobil uygulamalar aracılığıyla sunuluyor. Çiftçiler her tarlanın konumunu, ekilen ürünün türünü ve ekim tarihini giriyor. Uygulama daha sonra bu bilgileri hava durumu verileriyle birleştiriyor ve ilaçlama, sulama ya da hasat gibi işler için en uygun günleri öneriyor.",
      },
      {
        english:
          "Supporters say the extra precision can make a real difference. Harvesting a day too early can mean lower-quality crops, while waiting a day too long can leave a field exposed to a storm. One grape grower said the forecasts helped her team send pickers to the right vineyard at the right time, which reduced the amount of fruit they lost last season.",
        turkish:
          "Destekçiler bu ek hassasiyetin gerçek bir fark yaratabileceğini söylüyor. Hasadı bir gün erken yapmak ürün kalitesinin düşmesi anlamına gelebilirken, bir gün fazla beklemek tarlayı bir fırtınaya karşı savunmasız bırakabilir. Bir üzüm üreticisi, tahminlerin ekibinin işçileri doğru zamanda doğru bağa göndermesine yardımcı olduğunu ve böylece geçen sezon kaybettikleri meyve miktarının azaldığını anlattı.",
      },
      {
        english:
          "However, the technology is far from perfect. The models depend on good data, and some rural areas have very few weather stations to learn from. When data is limited, a forecast can be confidently wrong. Several farmers said they treat the predictions as advice rather than instructions, and they still walk through their fields every morning before making a final decision.",
        turkish:
          "Ancak teknoloji kusursuz olmaktan uzak. Modeller iyi verilere bağımlı ve bazı kırsal bölgelerde öğrenilebilecek çok az hava istasyonu bulunuyor. Veri sınırlı olduğunda bir tahmin, kendinden emin bir şekilde yanlış olabiliyor. Birçok çiftçi, tahminleri talimat değil tavsiye olarak gördüklerini ve son kararı vermeden önce hâlâ her sabah tarlalarını yürüyerek dolaştıklarını söyledi.",
      },
      {
        english:
          "Cost is another concern. Large agricultural companies can afford their own sensors and data teams, but smaller farms usually depend on free or low-cost apps. Agricultural advisers warn that if the most accurate tools become expensive, the benefits of AI could go mainly to the farms that already have the most resources.",
        turkish:
          "Maliyet de ayrı bir endişe kaynağı. Büyük tarım şirketleri kendi sensörlerini ve veri ekiplerini karşılayabiliyor; daha küçük çiftlikler ise genellikle ücretsiz ya da düşük maliyetli uygulamalara bağımlı. Tarım danışmanları, en isabetli araçlar pahalı hâle gelirse yapay zekânın faydalarının çoğunlukla zaten en fazla kaynağa sahip olan çiftliklere gidebileceği konusunda uyarıyor.",
      },
      {
        english:
          "For now, most experts agree that AI forecasts work best when they are combined with local knowledge. As one adviser put it, a model can tell you that rain is likely at four o'clock, but only someone who knows the land can tell you which corner of the field floods first.",
        turkish:
          "Şimdilik uzmanların çoğu, yapay zekâ tahminlerinin yerel bilgiyle birleştirildiğinde en iyi sonucu verdiği konusunda hemfikir. Bir danışmanın deyişiyle, bir model saat dörtte yağmur yağma ihtimalinin yüksek olduğunu söyleyebilir; ama tarlanın hangi köşesini önce su basacağını ancak o toprağı tanıyan biri söyleyebilir.",
      },
    ],
  },
  {
    slug: "more-people-repair-their-phones",
    title:
      "Why More People Are Repairing Their Phones Instead of Buying New Ones",
    shortSummary:
      "Higher prices, easier-to-find spare parts and volunteer repair cafés are helping people keep their phones for longer.",
    categorySlug: "technology",
    difficulty: "B1",
    kind: "NEWS",
    sourcePublishedAt: new Date("2026-09-17T08:15:00Z"),
    publishedOnSiteAt: new Date("2026-09-17T13:40:00Z"),
    paragraphs: [
      {
        english:
          "A few years ago, a cracked screen or a weak battery was often a reason to buy a new phone. Today, more people are choosing to repair their old devices instead. Repair shops say they are busier than before, and community “repair cafés”, where volunteers help people fix things for free, are opening in many towns.",
        turkish:
          "Birkaç yıl önce çatlamış bir ekran ya da zayıflamış bir pil, çoğu zaman yeni bir telefon almak için yeterli bir nedendi. Bugün ise daha fazla insan eski cihazını tamir ettirmeyi tercih ediyor. Tamirciler eskisinden daha yoğun olduklarını söylüyor; gönüllülerin insanlara eşyalarını ücretsiz onarmalarında yardım ettiği “tamir kafeleri” de birçok kasabada açılıyor.",
      },
      {
        english:
          "There are several reasons for this change. New phones have become more expensive, and many people feel that their current phone is still good enough for what they need. Spare parts, such as batteries and screens, are also easier to find online than they were in the past.",
        turkish:
          "Bu değişikliğin birkaç nedeni var. Yeni telefonlar daha pahalı hâle geldi ve pek çok kişi, elindeki telefonun ihtiyaçları için hâlâ yeterince iyi olduğunu düşünüyor. Pil ve ekran gibi yedek parçaları internette bulmak da eskiye göre daha kolay.",
      },
      {
        english:
          "The environment is another important reason. Making a new phone uses metals, water and energy, and old phones often end up as electronic waste. Keeping a phone for one or two more years is a simple way to reduce that waste. A volunteer at one repair café explained that most visitors arrive with the same three problems: a broken screen, a tired battery or a charging port full of dust.",
        turkish:
          "Çevre de önemli bir neden. Yeni bir telefon üretmek metal, su ve enerji gerektiriyor; eski telefonlar ise çoğu zaman elektronik atığa dönüşüyor. Bir telefonu bir ya da iki yıl daha kullanmak, bu atığı azaltmanın basit bir yolu. Bir tamir kafesinde çalışan bir gönüllü, ziyaretçilerin çoğunun aynı üç sorunla geldiğini anlattı: kırık bir ekran, yorgun bir pil ya da tozla dolmuş bir şarj girişi.",
      },
      {
        english:
          "Not every repair is easy, though. Some phones are glued together, which makes them difficult to open without special tools. Some manufacturers also sell parts only to approved shops. Repair supporters want companies to design phones that are easier to open and to publish repair guides that anyone can use.",
        turkish:
          "Yine de her onarım kolay değil. Bazı telefonların parçaları birbirine yapıştırılmış durumda; bu da onları özel aletler olmadan açmayı zorlaştırıyor. Bazı üreticiler ise parçaları yalnızca yetkili servislere satıyor. Onarım savunucuları, şirketlerin daha kolay açılabilen telefonlar tasarlamasını ve herkesin kullanabileceği tamir kılavuzları yayımlamasını istiyor.",
      },
      {
        english:
          "Learning to repair can also be a social activity. At repair cafés, visitors usually sit next to a volunteer and watch each step, so they can do simple repairs themselves next time. Many people say they enjoy the friendly atmosphere as much as the free help.",
        turkish:
          "Tamir etmeyi öğrenmek aynı zamanda sosyal bir etkinlik de olabilir. Tamir kafelerinde ziyaretçiler genellikle bir gönüllünün yanına oturup her adımı izliyor; böylece bir dahaki sefere basit onarımları kendileri yapabiliyor. Pek çok kişi, samimi ortamdan en az ücretsiz yardım kadar keyif aldığını söylüyor.",
      },
      {
        english:
          "If you want your phone to last longer, experts suggest a few simple habits: use a case and a screen protector, try not to let the battery run down to zero too often, and clean the charging port gently from time to time.",
        turkish:
          "Telefonunuzun daha uzun dayanmasını istiyorsanız uzmanlar birkaç basit alışkanlık öneriyor: Kılıf ve ekran koruyucu kullanın, pilin çok sık sıfıra kadar düşmesine izin vermemeye çalışın ve şarj girişini zaman zaman nazikçe temizleyin.",
      },
    ],
  },
  {
    slug: "bakery-delivers-bread-by-bicycle",
    title: "A Small Bakery Starts Delivering Bread by Bicycle",
    shortSummary: null,
    categorySlug: "business",
    difficulty: "A2",
    kind: "NEWS",
    sourcePublishedAt: new Date("2026-09-16T05:00:00Z"),
    publishedOnSiteAt: new Date("2026-09-16T09:20:00Z"),
    paragraphs: [
      {
        english:
          "A small family bakery has started a new service. Every morning, two riders take fresh bread to homes and offices by bicycle. The bakery opened ten years ago. Until now, customers always came to the shop to buy their bread.",
        turkish:
          "Küçük bir aile fırını yeni bir hizmet başlattı. Her sabah iki kurye, taze ekmeği bisikletle evlere ve ofislere götürüyor. Fırın on yıl önce açıldı. Şimdiye kadar müşteriler ekmeklerini almak için hep dükkâna geliyordu.",
      },
      {
        english:
          "The owner runs the bakery with her brother. She says the idea came from their customers. Many older people in the neighbourhood cannot carry heavy bags, and some busy parents do not have time to visit the shop before work. So the family bought two electric bikes and started the delivery service in the spring.",
        turkish:
          "Fırının sahibi, işletmeyi erkek kardeşiyle birlikte yürütüyor. Fikrin müşterilerinden geldiğini söylüyor. Mahalledeki pek çok yaşlı insan ağır çanta taşıyamıyor, bazı yoğun ebeveynlerin de işe gitmeden önce dükkâna uğrayacak vakti yok. Bu yüzden aile iki elektrikli bisiklet aldı ve teslimat hizmetini ilkbaharda başlattı.",
      },
      {
        english:
          "Customers order on the bakery's website or by phone before eight o'clock in the evening. The riders leave the shop at six o'clock the next morning, when the bread is still warm. Delivery costs a little extra, but it is free for people over seventy.",
        turkish:
          "Müşteriler akşam saat sekize kadar fırının internet sitesinden ya da telefonla sipariş veriyor. Kuryeler ertesi sabah saat altıda, ekmekler hâlâ sıcakken dükkândan çıkıyor. Teslimat için küçük bir ek ücret ödeniyor, ancak yetmiş yaşın üzerindekiler için teslimat ücretsiz.",
      },
      {
        english:
          "The service is popular. In the first month, the bakery got about forty orders a day. Now it gets more than a hundred. The owner has hired a new baker and one more rider. She says bikes are cheaper than a van, and they are also quieter and cleaner for the city.",
        turkish:
          "Hizmet çok ilgi görüyor. İlk ay fırın günde yaklaşık kırk sipariş aldı. Şimdi bu sayı yüzü geçiyor. Fırının sahibi yeni bir fırıncı ve bir kurye daha işe aldı. Bisikletlerin bir minibüsten daha ucuz olduğunu, üstelik şehir için daha sessiz ve daha temiz olduğunu söylüyor.",
      },
      {
        english:
          "Next year, the family wants to deliver cakes and biscuits too. But they have one rule: they only deliver to places that a bike can reach in fifteen minutes. They want every loaf to arrive fresh.",
        turkish:
          "Aile gelecek yıl kek ve bisküvi de teslim etmek istiyor. Ancak tek bir kuralları var: Yalnızca bisikletle on beş dakikada ulaşılabilen yerlere teslimat yapıyorlar. Her ekmeğin taze ulaşmasını istiyorlar.",
      },
    ],
  },
  {
    slug: "old-cinema-reopens-with-films-chosen-by-neighbours",
    title: "An Old Cinema Reopens With Films Chosen by Its Neighbours",
    shortSummary:
      "Five years after it closed, a neighbourhood cinema is back — and local members vote on the films it shows.",
    categorySlug: "entertainment",
    difficulty: "B1",
    kind: "NEWS",
    sourcePublishedAt: new Date("2026-09-15T17:30:00Z"),
    publishedOnSiteAt: new Date("2026-09-16T08:10:00Z"),
    paragraphs: [
      {
        english:
          "An old cinema that closed five years ago has opened its doors again, thanks to a group of local residents. The building first opened in the 1950s and has one large screen, red velvet seats and a small café in the entrance hall. For many people in the neighbourhood, it was the place where they saw their first film.",
        turkish:
          "Beş yıl önce kapanan eski bir sinema, bir grup mahalle sakini sayesinde kapılarını yeniden açtı. İlk kez 1950'lerde açılan binada tek bir büyük perde, kırmızı kadife koltuklar ve giriş holünde küçük bir kafe bulunuyor. Mahalledeki pek çok kişi için burası, hayatlarında ilk filmi izledikleri yerdi.",
      },
      {
        english:
          "When the cinema closed, the owners said it cost too much to run. Large cinemas in shopping centres were attracting most of the audience, and the old building needed a new roof. The residents formed a group, collected money through small monthly donations and found volunteers to help with the repairs.",
        turkish:
          "Sinema kapandığında sahipleri, işletmenin çok pahalıya mal olduğunu söylemişti. Alışveriş merkezlerindeki büyük sinemalar izleyicilerin çoğunu kendine çekiyordu ve eski binanın yeni bir çatıya ihtiyacı vardı. Mahalle sakinleri bir grup kurdu, küçük aylık bağışlarla para topladı ve onarımlara yardım edecek gönüllüler buldu.",
      },
      {
        english:
          "The most unusual thing about the new cinema is the way it chooses its films. Every month, members vote online for the films they want to see. The programme includes new releases, old classics and films from different countries, always shown with subtitles. On Sunday mornings, there are cheaper tickets for families with young children.",
        turkish:
          "Yeni sinemanın en sıra dışı yanı, filmleri seçme biçimi. Üyeler her ay izlemek istedikleri filmler için internet üzerinden oy veriyor. Programda yeni vizyon filmleri, eski klasikler ve farklı ülkelerden filmler yer alıyor; filmler her zaman altyazılı gösteriliyor. Pazar sabahları küçük çocuklu aileler için daha ucuz biletler de var.",
      },
      {
        english:
          "The first weekend was a big success, and every show was sold out. A retired teacher who has lived in the area for forty years said she cried a little when the lights went down, because the cinema felt exactly the same as when she was a child.",
        turkish:
          "İlk hafta sonu büyük bir başarıydı ve tüm seanslar kapalı gişe oynadı. Kırk yıldır bu bölgede yaşayan emekli bir öğretmen, ışıklar karardığında biraz ağladığını, çünkü sinemanın tıpkı çocukluğundaki gibi hissettirdiğini anlattı.",
      },
      {
        english:
          "The group knows that keeping the cinema open will not be easy. Ticket prices are low, and the building still needs work. But the volunteers hope the cinema can become more than a place to watch films. They are planning a film club for teenagers, talks with local filmmakers and outdoor screenings in the summer.",
        turkish:
          "Grup, sinemayı açık tutmanın kolay olmayacağının farkında. Bilet fiyatları düşük ve binanın hâlâ bakıma ihtiyacı var. Ancak gönüllüler, sinemanın film izlenen bir yerden daha fazlası olmasını umuyor. Gençler için bir film kulübü, yerel film yapımcılarıyla söyleşiler ve yazın açık hava gösterimleri planlıyorlar.",
      },
    ],
  },
  {
    slug: "skincare-routines-are-getting-shorter",
    title: "Why Skincare Routines Are Getting Shorter",
    shortSummary:
      "After years of ten-step routines, many people are cutting back to a few basic products — and dermatologists say that can be good for the skin.",
    categorySlug: "beauty",
    difficulty: "B2",
    // The demo explainer, so the reader and its tests cover both kinds.
    kind: "EXPLAINER",
    writtenAt: new Date("2026-09-14T10:00:00Z"),
    references: [
      {
        title: "How to build a simple skincare routine",
        publisher: DEMO_SOURCE_NAME,
        url: demoReferenceUrl("simple-skincare-routine"),
        checkedAt: new Date("2026-09-12"),
      },
      {
        title: "Sunscreen and ultraviolet light",
        publisher: DEMO_SOURCE_NAME,
        url: demoReferenceUrl("sunscreen-and-ultraviolet-light"),
        checkedAt: new Date("2026-09-12"),
      },
    ],
    publishedOnSiteAt: new Date("2026-09-14T15:45:00Z"),
    // This article uses typographic apostrophes so later text processing is
    // exercised with both apostrophe forms.
    paragraphs: [
      {
        english:
          "For much of the last decade, social media was full of elaborate skincare routines involving cleansers, toners, serums, masks and several layers of cream. Recently, however, a different trend has been gaining attention. Instead of adding more products, many people are cutting their routines down to a few essentials, an approach sometimes described as “skin minimalism”.",
        turkish:
          "Son on yılın büyük bölümünde sosyal medya; temizleyiciler, tonikler, serumlar, maskeler ve birkaç kat kremden oluşan ayrıntılı cilt bakım rutinleriyle doluydu. Ancak son zamanlarda farklı bir akım dikkat çekiyor. Pek çok kişi rutinine yeni ürünler eklemek yerine onu birkaç temel ürüne indiriyor; bu yaklaşım bazen “cilt minimalizmi” olarak adlandırılıyor.",
      },
      {
        english:
          "Part of the reason is cost. Skincare products can be expensive, and buying a new item every time a video recommends one quickly adds up. But dermatologists say there’s also a practical benefit: using fewer products reduces the risk of irritation. When several active ingredients are applied at the same time, the skin can become red, dry or sensitive, and it’s harder to work out which product caused the problem.",
        turkish:
          "Bunun bir nedeni maliyet. Cilt bakım ürünleri pahalı olabiliyor ve bir video her önerdiğinde yeni bir ürün almak kısa sürede ciddi bir harcamaya dönüşüyor. Ancak dermatologlar bunun pratik bir faydası da olduğunu söylüyor: Daha az ürün kullanmak tahriş riskini azaltıyor. Birkaç aktif içerik aynı anda uygulandığında cilt kızarabiliyor, kuruyabiliyor ya da hassaslaşabiliyor; soruna hangi ürünün yol açtığını anlamak da zorlaşıyor.",
      },
      {
        english:
          "So what does a simple routine look like? Most dermatologists suggest three basic steps: a gentle cleanser, a moisturiser that suits your skin type and, during the day, a broad-spectrum sunscreen. Sunscreen is the step they mention most often, because ultraviolet light contributes to skin ageing and can reach the skin even when the sky is cloudy.",
        turkish:
          "Peki basit bir rutin neye benziyor? Dermatologların çoğu üç temel adım öneriyor: nazik bir temizleyici, cilt tipinize uygun bir nemlendirici ve gündüzleri geniş spektrumlu bir güneş koruyucu. En sık vurguladıkları adım güneş koruyucu; çünkü ultraviyole ışınlar cildin yaşlanmasına katkıda bulunuyor ve hava bulutlu olsa bile cilde ulaşabiliyor.",
      },
      {
        english:
          "That doesn’t mean every extra product is useless. People with specific concerns, such as acne or dark spots, may benefit from a targeted treatment. The usual advice is to introduce new products one at a time and to wait a few weeks before deciding whether something works, rather than changing the whole routine at once.",
        turkish:
          "Bu, her ek ürünün işe yaramaz olduğu anlamına gelmiyor. Akne ya da koyu lekeler gibi belirli sorunları olan kişiler hedefe yönelik bir tedaviden fayda görebilir. Genel öneri, tüm rutini bir anda değiştirmek yerine yeni ürünleri teker teker denemek ve bir ürünün işe yarayıp yaramadığına karar vermeden önce birkaç hafta beklemek.",
      },
      {
        english:
          "Some beauty brands have responded by launching products that combine several functions, such as moisturisers with built-in sun protection. Critics point out that this can also be a marketing strategy, and that a shorter routine doesn’t always mean spending less. As with any trend, experts recommend reading ingredient lists carefully and paying attention to how your own skin reacts.",
        turkish:
          "Bazı güzellik markaları bu akıma, güneş korumalı nemlendiriciler gibi birkaç işlevi bir arada sunan ürünler çıkararak yanıt verdi. Eleştirmenler bunun aynı zamanda bir pazarlama stratejisi olabileceğine ve daha kısa bir rutinin her zaman daha az harcama anlamına gelmediğine dikkat çekiyor. Her akımda olduğu gibi uzmanlar, içerik listelerini dikkatle okumayı ve kendi cildinizin nasıl tepki verdiğini gözlemlemeyi öneriyor.",
      },
    ],
  },
];
