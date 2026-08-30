# Bilingual News English-Learning Website — Product & Technical Plan

## 1. Product Goal

Build a web application for Turkish speakers who want to improve their English by reading **recent, real-world news**.

The site should continuously collect fresh articles from multiple categories, transform them into learner-friendly bilingual reading material, and let users interact with individual English words without leaving the article.

The main reading format should be:

> English paragraph  
> Turkish translation  
> English paragraph  
> Turkish translation  
> ...

The product should feel like a modern news site combined with an English-learning tool.

---

## 2. Target Users

Primary users:

- Turkish native speakers learning English
- Intermediate learners who want exposure to real news
- Advanced learners who want harder vocabulary and authentic topics
- Users who dislike traditional textbook-style English study
- Users who want daily reading practice

Possible future users:

- English teachers
- University students
- Exam-prep learners
- Other language pairs besides English → Turkish

---

## 3. Core Product Concept

The application has several news categories.

Initial categories can include:

- AI
- Technology
- Business
- World
- Science
- Health
- Beauty
- Entertainment
- Culture
- Sports
- Lifestyle

Each category should show approximately **10–20 recent articles**.

Articles should be refreshed frequently, ideally daily or several times per day.

Each article should have:

- Headline
- Source
- Original publication date
- Category
- Hero image if legally/reliably available
- Estimated reading time
- English difficulty level
- English paragraphs
- Turkish translation under each paragraph
- Clickable English words
- Vocabulary definitions
- Optional example sentences
- Source attribution and link to the original article

---

## 4. Important Copyright / Content Strategy

Do **not** simply scrape and republish full copyrighted news articles.

Preferred strategy:

1. Fetch news metadata and/or article content from licensed APIs, RSS feeds, or publisher sources that permit it.
2. Use the source article as input.
3. Generate an **original learner-focused summary / rewrite** of the news story.
4. Keep factual details faithful to the source.
5. Attribute the original source clearly.
6. Link users to the original article.
7. Avoid reproducing long verbatim passages from publishers.

The generated learner article should be its own educational adaptation rather than a copied article.

---

# 5. Main User Experience

## 5.1 Homepage

Homepage sections:

- Top stories
- Latest news
- Category cards
- Difficulty selector
- Featured article
- "Learn English with today's news" section

Filters:

- Category
- Difficulty
- Reading time
- Date
- Saved articles

Example difficulty filter:

- A2 — Easy
- B1 — Intermediate
- B2 — Upper Intermediate
- C1 — Advanced

---

## 5.2 Category Page

Example:

`/category/ai`

Display:

- Category title
- Short category description
- 10–20 latest articles
- Difficulty badge
- Publication time
- Reading duration
- Source

Example card:

```text
OpenAI Announces New Developer Tools
AI · B2 · 5 min
Reuters · 2 hours ago
```

---

## 5.3 Article Reading Page

Suggested layout:

```text
Headline

B2 · AI · 6 min · Published 2 hours ago
Source: Reuters

[English paragraph]

[Turkish translation]

[English paragraph]

[Turkish translation]
```

Controls:

- Show/hide Turkish translations
- English only mode
- Turkish translation mode
- Change font size
- Change difficulty adaptation
- Save article
- Mark article as read
- Listen to English audio
- Vocabulary list
- Quiz

---

# 6. Click-a-Word Vocabulary Feature

This is one of the most important features.


# 6A. Real English — Idioms, Phrasal Verbs, Collocations & Common Expressions

Add a dedicated **Real English** learning layer to the product.

This should not be limited to traditional idioms. The goal is to teach the kind of English people actually see in news, social media, work, entertainment, technology, beauty, and daily conversation.

Expression types:

```text
IDIOM
PHRASAL VERB
COLLOCATION
COMMON EXPRESSION
SLANG
NEWS ENGLISH
```

Examples:

```text
AI / Technology
- ahead of the curve
- roll out
- under the hood
- game changer
- work out the kinks

Business
- cut corners
- get the ball rolling
- on the same page
- back to square one
- raise concerns

Beauty
- holy grail
- live up to the hype
- break out
- go-to product
- sell out

Entertainment
- steal the show
- breakout star
- behind the scenes
- go viral
- live up to the hype
```

## Category-Level Real English Section

Every category should have its own reusable expression library.

Example:

```text
/category/beauty/expressions
/category/ai/expressions
/category/business/expressions
```

Each category can surface approximately:

```text
10–30 useful expressions initially
```

and grow over time.

Each expression card should include:

```text
Expression
Type
CEFR level
Natural English meaning
Natural Turkish meaning
Example sentence
Turkish example translation
Usage note
Literal-translation warning when relevant
Pronunciation/audio where useful
Save button
```

Example:

```text
ahead of the curve

TYPE: IDIOM / COMMON EXPRESSION
LEVEL: B2

English:
More advanced or prepared than other people or competitors.

Turkish:
Diğerlerinden önde olmak.

Example:
Companies are investing heavily in AI to stay ahead of the curve.

Turkish:
Şirketler diğerlerinden önde kalmak için yapay zekâya yoğun yatırım yapıyor.

Usage:
Common in business and technology contexts.

Note:
Do not translate "curve" literally here.
```

## Article-Level Expressions

When an article naturally contains an important phrase, phrasal verb, collocation, idiom, or common expression, highlight it subtly.

Examples:

```text
live up to the hype
roll out
raise concerns
go viral
crack down on
```

Clicking the phrase should open a contextual explanation similar to the single-word vocabulary popup.

At the bottom of each article, add:

```text
Real English from this article
```

Example:

```text
4 expressions

live up to the hype
go viral
sell out
go-to product
```

This section should be generated from the actual article rather than filled with unrelated expressions.

## Phrase Detection

Do not tokenize only individual words.

The reading system must support multi-word expressions.

For example:

```text
"The product did not live up to the hype."
```

The system should be able to identify:

```text
live up to the hype
```

as one clickable expression instead of treating:

```text
live
up
to
the
hype
```

as unrelated dictionary entries.

Recommended rendering priority:

```text
1. Detect known multi-word expressions
2. Render those expressions as one interactive unit
3. Tokenize the remaining text into individual clickable words
```

## Expression Data Model

Add a model similar to:

```prisma
model Expression {
  id                String   @id @default(cuid())
  expression        String
  slug              String   @unique
  type              ExpressionType
  difficulty        Difficulty?
  englishMeaning    String
  turkishMeaning    String
  exampleEnglish    String?
  exampleTurkish    String?
  usageNote         String?
  literalWarning    String?
  categoryId        String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  category          Category? @relation(fields: [categoryId], references: [id])

  @@index([expression])
}
```

Possible enum:

```prisma
enum ExpressionType {
  IDIOM
  PHRASAL_VERB
  COLLOCATION
  COMMON_EXPRESSION
  SLANG
  NEWS_ENGLISH
}
```

Add an article relation through a join table:

```prisma
model ArticleExpression {
  articleId    String
  expressionId String
  sentence     String?
  order        Int?

  article      Article    @relation(fields: [articleId], references: [id], onDelete: Cascade)
  expression   Expression @relation(fields: [expressionId], references: [id], onDelete: Cascade)

  @@id([articleId, expressionId])
}
```

## AI Generation Requirement

When generating a learner article, also ask the model to extract approximately:

```text
2–6 useful real-English expressions
```

from that article when appropriate.

Do not force expressions when the article does not contain natural examples.

Structured output example:

```json
{
  "expressions": [
    {
      "expression": "live up to the hype",
      "type": "COMMON_EXPRESSION",
      "level": "B2",
      "englishMeaning": "to be as good as people expected",
      "turkishMeaning": "beklentileri karşılamak",
      "sentence": "The product failed to live up to the hype."
    }
  ]
}
```

## Product Positioning

This feature should help differentiate the application from generic bilingual-news tools.

The learning hierarchy becomes:

```text
CURRENT NEWS
    ↓
ENGLISH + TURKISH PARAGRAPHS
    ↓
CLICKABLE WORDS
    ↓
REAL ENGLISH EXPRESSIONS
    ↓
SAVED VOCABULARY / REVIEW
```

The product should teach not only:

```text
"What does this word mean?"
```

but also:

```text
"How would an English speaker naturally say this?"
```


When the user clicks an English word, immediately open a small popup / tooltip.

Example:

User clicks:

**significant**

Popup:

```text
significant
adjective

English:
important or large enough to be noticed

Turkish:
önemli, kayda değer

Example:
The company reported a significant increase in sales.

Pronunciation:
 /sɪɡˈnɪfɪkənt/
```

Possible actions:

- Save word
- Hear pronunciation
- See another example
- See word form
- Add to vocabulary list

---

# 7. Vocabulary Lookup Architecture

Use a hybrid approach.

## First option: Local / cached dictionary

Store frequently requested word data:

```ts
type VocabularyEntry = {
  word: string
  lemma: string
  partOfSpeech?: string
  englishDefinition?: string
  turkishMeaning?: string
  exampleSentence?: string
  ipa?: string
}
```

Advantages:

- Fast
- Cheap
- Avoid repeated API calls

## Fallback

If a word does not exist locally:

1. Send the word + sentence context to an LLM or dictionary API.
2. Generate:
   - contextual English definition
   - Turkish translation
   - part of speech
   - example
3. Save result to database/cache.

Important:

A word can have different meanings depending on context.

Example:

```text
bank
```

could mean:

- banka
- nehir kıyısı

Therefore the lookup API should receive:

```json
{
  "word": "bank",
  "sentence": "The central bank raised interest rates."
}
```

The system should return the correct contextual meaning.

---

# 8. Difficulty Levels

Use CEFR-style levels.

Recommended:

| Level | Meaning |
|---|---|
| A2 | Easy |
| B1 | Intermediate |
| B2 | Upper Intermediate |
| C1 | Advanced |

Do not rely only on the original source difficulty.

Instead, generate/adapt the same news into a target learning level.

Example:

Original sentence:

> The central bank implemented a restrictive monetary policy amid persistent inflationary pressure.

B1 version:

> The central bank introduced stricter policies because inflation remained high.

C1 version:

> The central bank implemented a restrictive monetary policy amid persistent inflationary pressure.

---

# 9. Two Possible Difficulty Models

## Model A — One difficulty per article

Each article is generated once.

Example:

```text
Article 1 → B1
Article 2 → B2
Article 3 → C1
```

Advantages:

- Less AI cost
- Simpler storage
- Easier MVP

Recommended for Version 1.

---

## Model B — Same article available at multiple levels

Example:

```text
OpenAI launches new model

A2
B1
B2
C1
```

Advantages:

- Excellent learning experience
- Users can compare levels

Disadvantages:

- More generation cost
- More database content

Recommended as a later feature.

---

# 10. News Collection Pipeline

Suggested process:

```text
News Sources
   ↓
Fetcher
   ↓
Deduplication
   ↓
Article Extraction
   ↓
Fact / Metadata Processing
   ↓
AI Educational Rewrite
   ↓
Difficulty Classification
   ↓
Turkish Translation
   ↓
Paragraph Alignment
   ↓
Database
   ↓
Website
```

---

# 11. News Sources

Possible input methods:

## RSS feeds

Advantages:

- Simple
- Cheap
- Many publishers support RSS

Use RSS where licensing / usage permits.

---

## News APIs

Potential providers include services such as:

- NewsAPI
- GNews
- The Guardian API
- New York Times APIs
- publisher-specific APIs
- Google News RSS for discovery

Before production, confirm:

- licensing
- article-content usage rights
- request limits
- commercial-use restrictions

---

# 12. Article Ingestion Workflow

Run a scheduled backend job.

Example:

```text
Every 1–3 hours
```

Steps:

### Step 1 — Fetch

Fetch latest stories from configured feeds/APIs.

### Step 2 — Normalize

Convert all sources to one internal format.

```ts
type RawNewsArticle = {
  title: string
  url: string
  source: string
  publishedAt: Date
  description?: string
  content?: string
  imageUrl?: string
}
```

### Step 3 — Deduplicate

Avoid publishing the same event 10 times.

Use:

- normalized URL
- title similarity
- semantic embeddings
- source + date

Possible rule:

If cosine similarity between article-title embeddings is > 0.88, treat as possible duplicate.

### Step 4 — Categorize

Assign one primary category.

Possible AI output:

```json
{
  "category": "AI",
  "confidence": 0.96
}
```

### Step 5 — Quality Filter

Reject articles that are:

- too short
- clickbait
- duplicated
- advertisements
- opinion pieces if the product wants factual news only
- lacking enough factual information

### Step 6 — Generate learner article

Use the source as factual input.

Generate an original educational news adaptation.

### Step 7 — Translate paragraph-by-paragraph

Each English paragraph gets exactly one Turkish paragraph.

### Step 8 — Validate

Check:

- number of English paragraphs
- number of Turkish paragraphs
- factual consistency
- missing translations
- malformed JSON

### Step 9 — Publish

Save article as:

```text
status = published
```

---

# 13. AI Generation Output Format

Use structured JSON.

Example:

```json
{
  "title": "OpenAI Announces New AI Tools",
  "category": "AI",
  "level": "B2",
  "summary": "OpenAI announced...",
  "paragraphs": [
    {
      "order": 1,
      "english": "OpenAI announced several new tools...",
      "turkish": "OpenAI birkaç yeni araç duyurdu..."
    },
    {
      "order": 2,
      "english": "The company says...",
      "turkish": "Şirket..."
    }
  ],
  "keyVocabulary": [
    {
      "word": "announce",
      "meaningTr": "duyurmak"
    }
  ]
}
```

Require valid structured output from the model instead of parsing freeform text.

---

# 14. AI Prompt Requirements

The generation prompt should explicitly say:

- preserve factual meaning
- do not invent facts
- do not invent quotes
- do not copy source wording extensively
- write for Turkish English learners
- target requested CEFR level
- produce natural modern English
- keep paragraphs short
- translate each paragraph naturally into Turkish
- keep names, numbers, dates, prices, and statistics accurate
- output strict JSON

---

# 15. Suggested Article Length

For MVP:

Easy:

```text
A2
250–400 English words
```

Intermediate:

```text
B1
350–550 words
```

Upper Intermediate:

```text
B2
450–700 words
```

Advanced:

```text
C1
550–900 words
```

Do not generate unnecessarily long articles.

---

# 16. Database Design

Recommended database:

**PostgreSQL**

Possible ORM:

**Prisma**

---

## 16.1 Article

```prisma
model Article {
  id             String   @id @default(cuid())
  slug           String   @unique
  title          String
  shortSummary   String?
  categoryId     String
  difficulty     Difficulty
  sourceName     String
  sourceUrl      String
  sourceImageUrl String?
  publishedAt    DateTime
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  status         ArticleStatus @default(DRAFT)

  category       Category @relation(fields: [categoryId], references: [id])
  paragraphs     ArticleParagraph[]
}
```

---

## 16.2 Article Paragraph

```prisma
model ArticleParagraph {
  id        String @id @default(cuid())
  articleId String
  order     Int
  english   String
  turkish   String

  article Article @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@unique([articleId, order])
}
```

---

## 16.3 Category

```prisma
model Category {
  id       String @id @default(cuid())
  slug     String @unique
  name     String
  articles Article[]
}
```

---

## 16.4 Vocabulary Entry

```prisma
model VocabularyEntry {
  id                String   @id @default(cuid())
  word              String
  lemma             String?
  contextualMeaning String?
  englishDefinition String?
  turkishMeaning    String?
  partOfSpeech      String?
  exampleSentence   String?
  ipa               String?
  createdAt         DateTime @default(now())

  @@index([word])
}
```

---

## 16.5 Saved Word

Future user-account feature:

```prisma
model SavedWord {
  id                String   @id @default(cuid())
  userId            String
  word              String
  vocabularyEntryId String?
  articleId         String?
  createdAt         DateTime @default(now())
}
```

---

## 16.6 User

Possible future model:

```prisma
model User {
  id             String @id @default(cuid())
  email          String @unique
  name           String?
  preferredLevel Difficulty @default(B1)
}
```

---

# 17. Recommended Technical Stack

## Frontend

Recommended:

```text
Next.js
TypeScript
React
Tailwind CSS
```

Useful libraries:

- shadcn/ui
- TanStack Query if needed
- Zustand only if substantial client state is needed
- next-intl if UI localization becomes necessary

---

## Backend

Option 1:

```text
Next.js API routes / server actions
```

Good enough for MVP.

Option 2:

Separate backend service later if ingestion becomes large.

Possible:

```text
FastAPI
```

or

```text
Node.js / NestJS
```

For Version 1, keeping the full application in Next.js is simpler.

---

## Database

```text
PostgreSQL
Prisma ORM
```

Possible hosting:

- Supabase
- Neon
- Railway
- AWS RDS

---

## Background Jobs

Need scheduled jobs for news ingestion.

Possible solutions:

- Vercel Cron
- Trigger.dev
- Inngest
- GitHub Actions for simple scheduled fetching
- AWS EventBridge + Lambda later

Recommended MVP:

```text
Trigger.dev or Vercel Cron
```

---

# 18. Suggested Folder Structure

```text
src/
├── app/
│   ├── page.tsx
│   ├── article/
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── category/
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── vocabulary/
│   │   └── page.tsx
│   └── api/
│       ├── dictionary/
│       ├── articles/
│       └── cron/
│
├── components/
│   ├── article/
│   │   ├── ArticleReader.tsx
│   │   ├── ArticleParagraph.tsx
│   │   ├── WordTooltip.tsx
│   │   ├── DifficultyBadge.tsx
│   │   └── TranslationToggle.tsx
│   ├── news/
│   │   ├── ArticleCard.tsx
│   │   └── CategorySection.tsx
│   └── ui/
│
├── lib/
│   ├── ai/
│   │   ├── generateArticle.ts
│   │   ├── translateArticle.ts
│   │   └── vocabularyLookup.ts
│   ├── news/
│   │   ├── fetchFeeds.ts
│   │   ├── normalizeArticle.ts
│   │   ├── deduplicate.ts
│   │   └── categorize.ts
│   ├── db.ts
│   └── utils.ts
│
├── jobs/
│   └── ingestNews.ts
│
└── types/
    └── article.ts
```

---

# 19. Clickable English Text Implementation

Do not send every individual word to the API while rendering.

Render English paragraphs normally but tokenize words client-side.

Example concept:

```tsx
<TokenizedParagraph text={paragraph.english} />
```

Tokenization should identify:

- words
- punctuation
- contractions

Example:

```text
The company's shares increased.
```

Tokens:

```text
The
company's
shares
increased
.
```

On word click:

```ts
handleWordClick({
  word,
  sentence,
  articleId
})
```

Then fetch:

```text
GET /api/dictionary?word=significant&context=...
```

Return contextual definition.

---

# 20. Dictionary API Response

Example:

```json
{
  "word": "significant",
  "lemma": "significant",
  "partOfSpeech": "adjective",
  "englishDefinition": "important enough to be noticed",
  "turkishMeaning": "önemli, kayda değer",
  "exampleSentence": "The company reported significant growth.",
  "ipa": "/sɪɡˈnɪfɪkənt/"
}
```

Cache by:

```text
lemma + contextual sense
```

For MVP, caching by:

```text
word + sentence hash
```

is acceptable.

---

# 21. Article Difficulty Detection

Do not depend exclusively on the LLM saying:

```text
"This is B2."
```

Later, calculate measurable indicators such as:

- average sentence length
- vocabulary frequency
- percentage of uncommon words
- lexical diversity
- CEFR vocabulary lists

Use this to validate AI output.

For MVP:

1. Ask AI to write at level.
2. Ask AI to classify the finished article.
3. Store the resulting level.

---

# 22. Search

Users should be able to search:

```text
OpenAI
K-pop
Samsung
skincare
Taylor Swift
Turkey
Apple
```

Search fields:

- title
- summary
- category
- article body
- source

MVP:

PostgreSQL full-text search.

Later:

- Typesense
- Meilisearch
- Elasticsearch

---

# 23. User Accounts — Version 2

Possible features:

- Save articles
- Save vocabulary
- Reading history
- Daily reading streak
- Preferred level
- Vocabulary review
- Quiz history

---

# 24. Vocabulary Notebook

Saved words page:

```text
Word            Meaning              Source
------------------------------------------------
significant     önemli              AI article
launch          piyasaya sürmek     Technology article
decline         düşüş               Business article
```

Allow:

- mark learned
- review later
- hear pronunciation
- see original sentence
- filter by category
- filter by date

---

# 25. Quiz Feature

Generate a short quiz after each article.

Example:

### Reading comprehension

```text
Why did the company launch the product?
```

### Vocabulary

```text
What does "significant" mean in this paragraph?
```

### Fill in the blank

```text
The company _____ a new AI model.
```

Possible answers:

```text
A. launched
B. escaped
C. borrowed
D. refused
```

---

# 26. Audio Feature

Future feature:

Use text-to-speech for English paragraphs.

Controls:

- Play entire article
- Play paragraph
- Play clicked word
- Playback speed

Example speeds:

```text
0.75x
1x
1.25x
```

---

# 27. Admin Dashboard

Build a simple internal admin page.

Possible route:

```text
/admin
```

Admin can:

- see fetched articles
- see generated articles
- publish/unpublish
- regenerate translation
- change category
- change difficulty
- delete bad articles
- view source URL
- trigger ingestion
- inspect failed generation jobs

---

# 28. Article Statuses

Use statuses:

```text
FETCHED
PROCESSING
DRAFT
PUBLISHED
FAILED
ARCHIVED
```

This makes the pipeline easier to debug.

---

# 29. Article Freshness

Homepage should prioritize recent stories.

Example ranking formula:

```text
score =
freshness_score
+ importance_score
+ category_relevance
- duplicate_penalty
```

Possible freshness:

```text
< 6 hours  → very high
< 24 hours → high
< 3 days   → medium
> 7 days   → low
```

Most categories should show recent articles first.

---

# 30. Category Balance

Do not let one feed dominate the site.

For example:

If AI produces 100 stories but Beauty only produces 15, enforce category quotas.

Target:

```text
10–20 published recent articles per category
```

Older stories can automatically be replaced by fresher ones.

---

# 31. Scheduled Job Strategy

Example:

```text
Every 2 hours
```

Run:

```text
fetchNews()
deduplicate()
selectCandidates()
generateEducationalArticles()
publishValidArticles()
```

Do not regenerate everything.

Only process new candidate articles.

---

# 32. Processing Queue

News generation should happen asynchronously from the user's browsing request.

Example state:

```text
Fetched article
    ↓
Queued
    ↓
Generating
    ↓
Validating
    ↓
Published
```

For MVP, sequential processing is okay.

Later use:

- Trigger.dev
- BullMQ
- Inngest
- SQS

---

# 33. Cost Control

AI calls can become expensive.

Do not automatically transform every fetched story.

Example:

```text
Fetcher finds 500 stories/day
↓
Deduplication → 250
↓
Quality filter → 120
↓
Category ranking → 70
↓
AI generation → 40
```

Only generate the strongest candidates.

---

# 34. AI Call Strategy

Ideally one primary generation request can create:

- educational English version
- Turkish paragraph translations
- key vocabulary
- difficulty

Structured response:

```json
{
  "title": "...",
  "level": "B2",
  "paragraphs": [...],
  "keyVocabulary": [...]
}
```

Then use a second lightweight validation step only if needed.

---

# 35. Reliability Rules

The system must never silently publish malformed AI content.

Validate:

```text
title exists
paragraphs.length >= 3
English paragraph exists
Turkish paragraph exists
level valid
source URL exists
publication date exists
```

If invalid:

```text
status = FAILED
```

Retry once or send to admin review.

---

# 36. Security

Important:

- Keep API keys server-side
- Never expose AI API keys to browser
- Rate-limit dictionary endpoint
- Validate URL inputs
- Sanitize any externally sourced HTML
- Do not render raw article HTML without sanitization
- Protect admin routes
- Add authentication before user data features

---

# 37. SEO

Each article should have:

```text
/title
meta description
canonical URL
OpenGraph image
Article structured data
```

Example route:

```text
/news/openai-launches-new-model
```

Possible title:

```text
OpenAI Launches New Model — Learn English with News
```

---

# 38. Design Direction

The visual design should be:

- clean
- editorial
- modern
- not childish
- focused on reading
- comfortable for long-form text

Possible inspirations:

- Medium
- BBC
- The Guardian
- Readwise Reader
- language-learning reading apps

Typography is very important.

English and Turkish paragraphs should be visually connected but distinct.

Example:

```text
EN
OpenAI announced...

TR
OpenAI duyurdu...
```

Use subtle labels instead of giant colored blocks.

---

# 39. Mobile UX

Mobile is important.

Word tooltip on desktop:

```text
small popover
```

Word lookup on mobile:

```text
bottom sheet
```

This prevents tiny unreadable popups.

---

# 40. Accessibility

Implement:

- semantic HTML
- keyboard navigation
- proper focus states
- high contrast
- adjustable text size
- screen-reader labels
- buttons instead of clickable spans where practical

---

# 41. MVP Scope

Version 1 should NOT try to include everything.

Build:

1. Homepage
2. Categories
3. Fresh-news ingestion
4. Article generation
5. English/Turkish paragraph layout
6. Difficulty level
7. Clickable word dictionary
8. Real English expressions: idioms, phrasal verbs, collocations and common expressions
9. Source attribution
10. Admin page
11. Scheduled fetching

Skip initially:

- social features
- streaks
- subscriptions
- advanced gamification
- teacher dashboard
- multiple languages

---

# 42. Recommended MVP Categories

Start with six:

```text
AI
Technology
World
Business
Entertainment
Beauty
```

Target:

```text
10–15 current articles/category
```

Maximum active content:

```text
~60–90 recent articles
```

This is enough for launch.

---

# 43. MVP Page Structure

```text
/
├── /category/ai
├── /category/technology
├── /category/world
├── /category/business
├── /category/entertainment
├── /category/beauty
├── /article/[slug]
├── /saved
├── /vocabulary
└── /admin
```

Saved/vocabulary can remain disabled until authentication is added.

---

# 44. Development Phases

## Phase 1 — Project foundation

Build:

- Next.js app
- TypeScript
- Tailwind
- PostgreSQL
- Prisma
- base layout
- category models
- article models

Success condition:

A manually inserted bilingual article can render correctly.

---

## Phase 2 — Reader experience

Build:

- article page
- paragraph-by-paragraph translation
- show/hide Turkish
- difficulty badge
- source attribution
- responsive typography

Success condition:

Reading experience works beautifully on desktop and mobile.

---

## Phase 3 — Word & Real English lookup

Build:

- English tokenizer
- clickable individual words
- multi-word expression detection
- contextual vocabulary API
- Real English expression cards
- popup / bottom sheet
- vocabulary cache
- category-level expression library
- article-level "Real English from this article" section

Success condition:

Clicking a word gives a contextual English definition + Turkish meaning, while recognized idioms, phrasal verbs, collocations, slang, and common expressions can be opened as complete phrases.

---

## Phase 4 — News ingestion

Build:

- RSS/API fetcher
- normalizer
- duplicate detection
- category assignment
- scheduled job

Success condition:

Raw candidate news enters database automatically.

---

## Phase 5 — AI article generation

Build:

- learner rewrite prompt
- level assignment
- paragraph translation
- JSON validation
- publishing workflow

Success condition:

A fetched story automatically becomes a valid bilingual article.

---

## Phase 6 — Admin

Build:

- article list
- preview
- approve
- reject
- regenerate
- delete
- job status

Success condition:

Bad AI output can be corrected without touching the database manually.

---

## Phase 7 — Polish

Add:

- loading states
- skeleton UI
- error handling
- SEO
- analytics
- mobile improvements
- caching

---

# 45. Suggested API Routes

```text
GET  /api/articles
GET  /api/articles/[slug]
GET  /api/categories
GET  /api/dictionary
POST /api/admin/ingest
POST /api/admin/article/[id]/publish
POST /api/admin/article/[id]/regenerate
```

Internal jobs:

```text
POST /api/cron/news-ingestion
```

Protect cron endpoint with secret authentication.

---

# 46. Example Article API Response

```json
{
  "id": "abc123",
  "slug": "openai-announces-new-model",
  "title": "OpenAI Announces a New AI Model",
  "category": {
    "slug": "ai",
    "name": "AI"
  },
  "difficulty": "B2",
  "source": {
    "name": "Reuters",
    "url": "https://example.com/article"
  },
  "publishedAt": "2026-08-30T08:00:00Z",
  "paragraphs": [
    {
      "order": 1,
      "english": "OpenAI announced...",
      "turkish": "OpenAI..."
    }
  ]
}
```

---

# 47. Environment Variables

Example:

```env
DATABASE_URL=
OPENAI_API_KEY=

NEWS_API_KEY=

CRON_SECRET=

NEXT_PUBLIC_SITE_URL=
```

Do not expose secret variables with `NEXT_PUBLIC_`.

---

# 48. Logging

Log every processing step.

Example:

```text
[FETCH] 72 articles received
[DEDUP] 41 unique
[FILTER] 19 selected
[GENERATE] Article abc123 complete
[PUBLISH] Article abc123 published
```

For failures:

```text
[GENERATE_FAILED]
articleId
sourceUrl
error
retryCount
```

---

# 49. Analytics to Track

Later measure:

- article opens
- completion rate
- words clicked per article
- translations toggled
- difficulty levels selected
- saved words
- categories read
- returning users

The most important learning metric may be:

```text
average words looked up per 1,000 English words read
```

This can help estimate whether the article difficulty matches the learner.

---

# 50. Future Personalized Difficulty

Eventually infer user's level from behavior.

Example:

If a user:

- clicks 25 words in every B2 article
- rarely clicks words in B1

recommend:

```text
B1–B2
```

If a user clicks almost nothing in B2:

recommend C1 articles.

---

# 51. Future AI Tutor

Possible feature:

```text
Ask about this article
```

Examples:

- "Explain paragraph 3 more simply."
- "Why is 'would have been' used here?"
- "Give me 3 examples with this word."
- "Quiz me on this article."
- "Explain this sentence in Turkish."

The AI should only use the article context when answering article-specific questions.

---

# 52. Future Daily Learning Flow

Possible user experience:

```text
Today's English News
↓
Choose one article
↓
Read EN/TR
↓
Save unfamiliar words
↓
5-question quiz
↓
Review saved vocabulary
```

This could later become the core retention loop.

---

# 53. Codex Implementation Priorities

When implementing, prioritize in this order:

```text
1. Correct data model
2. Excellent article reading UI
3. Clickable contextual vocabulary
4. Reliable article ingestion
5. Reliable AI generation
6. Admin moderation
7. User accounts
8. Gamification
```

Do not overengineer Version 1.

---

# 54. Initial Build Task for Codex

Start by implementing only the foundation and reader.

## Required first milestone

Create:

- Next.js application using TypeScript
- Tailwind CSS
- PostgreSQL + Prisma
- Category model
- Article model
- ArticleParagraph model
- Homepage
- Category page
- Article page
- Seed script containing at least 6 sample bilingual articles
- Responsive UI

Use sample/mock data first.

Do **not** implement live news ingestion until the reading experience works.

---

# 55. Second Build Task for Codex

After the base reader works:

Implement interactive word lookup.

Requirements:

- tokenize English paragraph text
- make English words clickable
- preserve punctuation and spacing
- open contextual word popup
- send word + current sentence to `/api/dictionary`
- return English definition + Turkish meaning
- cache lookup results
- show loading/error states
- desktop popover
- mobile bottom sheet

---

# 56. Third Build Task for Codex

Implement automated news ingestion.

Requirements:

- provider interface so news sources are replaceable
- one initial RSS/API provider
- normalize fetched results
- duplicate filtering
- category mapping
- store raw candidate
- scheduled job
- logging
- failure handling

Do not couple the database directly to a single news provider.

Create an interface similar to:

```ts
interface NewsProvider {
  fetchLatest(options?: {
    category?: string
    limit?: number
  }): Promise<RawNewsArticle[]>
}
```

---

# 57. Fourth Build Task for Codex

Implement AI transformation.

Input:

```text
RawNewsArticle
target level
category
```

Output:

```text
educational bilingual article
```

Use schema-validated structured JSON.

Reject generated output when required fields are invalid.

---

# 58. Important Engineering Rules for Codex

Follow these rules throughout development:

1. Use strict TypeScript.
2. Avoid `any` unless absolutely necessary.
3. Keep components small.
4. Keep external-provider integrations behind interfaces.
5. Do not expose secrets client-side.
6. Use server components where appropriate.
7. Use client components only for interactive behavior.
8. Add error handling to all external API calls.
9. Validate all AI structured output.
10. Use database transactions where publishing requires multiple writes.
11. Make ingestion idempotent.
12. Never publish duplicate source URLs.
13. Keep source attribution on every article.
14. Make mobile experience a first-class requirement.
15. Prefer simple architecture until scale requires otherwise.

---

# 59. Definition of MVP Complete

The MVP is considered complete when:

- the website contains multiple categories
- each category contains recent bilingual news articles
- articles show English then Turkish paragraph by paragraph
- every English word can be clicked
- contextual English definition appears
- Turkish meaning appears
- important multi-word expressions are recognized and clickable
- articles can surface idioms, phrasal verbs, collocations, slang and common expressions
- each category has a Real English expression section
- articles have difficulty levels
- content is fetched automatically
- generated content is stored in the database
- users can reach the original source
- admin can remove or regenerate problematic articles
- layout works well on mobile and desktop

---

# 60. Product Principle

The application should never feel like a school textbook.

The ideal experience is:

> "I came here because I wanted to know what happened today, and I learned English while reading about it."

News is the content.

English learning is built into the reading experience.


# 61. Project Naming

Recommended working name:

```text
Newslingo
```

Recommended local folder name:

```text
newslingo
```

Recommended GitHub repository name:

```text
newslingo
```

If the plain name is unavailable on GitHub, use:

```text
newslingo-app
```

or:

```text
newslingo-web
```

Recommended initial clone/project path:

```text
~/CodeWorkspace/newslingo
```

Possible future product tagline:

```text
Learn English from what happened today.
```

Alternative project names worth keeping in reserve:

```text
NewsLingo
DailyLingo
LinguaNews
Newswise English
Contextly
FluentFeed
```

For the codebase, keep the repository name simple even if the public-facing brand changes later.
