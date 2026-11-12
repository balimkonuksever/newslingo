# Newslingo Implementation Plan

> Status: Working draft  
> Last updated: 2026-11-01  
> Product specification: `bilingual_news_english_learning_plan.md`  
> Immediate target: written articles (milestone W)  
> Launch target: articles written in Claude Code sessions, explainers and adapted GOV.UK news, reviewed by the user and published as a static site on GitHub Pages

## 1. Purpose

This document converts the product specification into an executable engineering plan. The product specification remains the source of truth for product intent; this file defines implementation order, technical boundaries, dependencies, quality gates, and completion criteria.

The plan intentionally separates two outcomes:

1. **Reader Release** — a polished bilingual reading experience backed by deterministic seed data.
2. **Launch MVP** — contextual vocabulary, Real English expressions, moderation, and articles written in Claude Code sessions: explainers written from general knowledge and adaptations of hand-picked GOV.UK news.

This separation prevents the content pipeline from hiding usability or data-model problems in the core reader.

Until 2026-10-27 the Launch MVP also included licensed news ingestion, automated AI adaptation and scheduled operation (M6–M8). They are on hold: Newslingo is a small, non-commercial project with no budget for a lawyer, a paid news API or paid model calls, so articles are written by hand instead (decision log, 2026-10-27).

Since 2026-10-31 the public site is planned as a static site on GitHub Pages, rebuilt from the repository on every merge to `main`, with no server or database in production. The admin runs only on the user's computer (decision log, 2026-10-31).

### How to use this plan

- Implementation milestones follow their dependency order unless the dependency map explicitly permits parallel work. Milestone W, written articles, follows M5; M6–M8 are on hold, and M9 follows W.
- M0 is a rolling decision track: an open decision blocks only the milestone that names it as a dependency, and all M0 items must close before launch.
- A milestone is complete only when its exit gate passes.
- Deferred features should not appear as non-functional controls in the UI.
- New scope requires an explicit update to the scope matrix and decision log.
- Applied database migrations are never edited; changes are introduced through new migrations.

---

## 2. Product outcome

Newslingo helps Turkish speakers improve their English by reading news and short explainers in a modern editorial experience.

The essential learning loop is:

```text
Discover a current story
        ↓
Read an English paragraph
        ↓
Read or hide its Turkish translation
        ↓
Open unfamiliar words and natural expressions in context
        ↓
Continue reading without leaving the article
```

The experience should feel like a high-quality news reader with learning built into it—not like a textbook or a collection of exercises.

### Launch categories

The user chose to keep these six on 2026-10-27 (§19).

1. AI
2. Technology
3. World
4. Business
5. Entertainment
6. Beauty

### Launch content target

- Approximately 10–15 active articles per category.
- One CEFR adaptation per article in Version 1.
- Supported levels: A2, B1, B2, and C1.
- Human approval before publication at launch.
- Clear source attribution and a link to the original source on every news article; every explainer lists its references.
- At least 10 reviewed Real English expressions per category at launch, growing toward the product target of 10–30.
- A documented CEFR distribution target so the inventory does not collapse into one level.

---

## 3. Current repository baseline

M1–M3, which make up the Reader Release, were complete on 2026-09-25, M4 on 2026-10-24, and M5 on 2026-10-26. The repository contains:

- the Next.js/TypeScript/Tailwind scaffold with pinned Node and pnpm, one lockfile, and lint, format, typecheck, Vitest, and build commands
- Docker Compose PostgreSQL 18 with isolated `newslingo` and `newslingo_test` databases
- Prisma ORM 7.10.0 (ADR-001), the reader-core migrations, and a server-only client
- idempotent reference provisioning for the six categories and a local-only demo seed of six bilingual articles
- server-only queries for the homepage, filters, categories, and articles
- the editorial homepage with URL-backed filters, category pages, and the bilingual article reader
- contextual word lookups from editorial dictionary entries, reviewed Real English cards, and each article's key vocabulary and Real English lists (M4)
- admin sign-in with a password and an authenticator code, and the moderation pages: an article list filtered by status and category, a preview through the public reader with the source details and history, and audited publish, archive, restore and edit actions (M5)
- unit, component, database integration, and Playwright browser and accessibility tests, all run by GitHub Actions
- no deployment configuration

Locally available tooling:

- Node.js 24.7.0
- pnpm 11.19.0
- npm 11.5.1
- Docker and Docker Compose

Known setup constraints:

- Docker Desktop must be running before local PostgreSQL can start.
- No local PostgreSQL client/server is installed; Prisma and the containerized database provide the development workflow.
- Dependency installation may require network permission.

---

## 4. Architecture decisions

These are the working defaults. Items marked **Open** must be resolved before their blocking milestone.

| Area | Decision | Status | Reason |
|---|---|---:|---|
| Application | Next.js App Router with `src/` | Accepted | Matches the product plan and supports a simple full-stack MVP. |
| Language | Strict TypeScript | Accepted | Required by the engineering rules. |
| Styling | Tailwind CSS plus small local primitives | Accepted | Fast, consistent UI without committing to a large component layer. |
| Package manager | pnpm with one committed lockfile | Accepted | Already installed and avoids mixed lockfiles. |
| Unit/component tests | Vitest and React Testing Library | Accepted | Fast tests for pure modules and Client Components. |
| Browser tests | Playwright plus axe integration | Accepted | Covers server-rendered routes, responsive journeys, and baseline accessibility. |
| Rendering | Server Components by default | Accepted | Public content is read-heavy and SEO-sensitive. |
| Client code | Only reader controls and interactive learning surfaces | Accepted | Keeps bundles and state management small. |
| Runtime | Node runtime for Prisma-backed pages and handlers | Accepted | Prisma/database access should not depend on Edge constraints. Since 2026-10-31 it runs during the site build and on the user's computer; production serves static files. |
| Database | PostgreSQL with Prisma | Accepted | Matches the product plan and future search/transaction needs. |
| Local database | Docker Compose | Accepted | Reproducible without a locally installed PostgreSQL server. |
| Public article route | `/article/[slug]` | Accepted | Resolves the specification's `/article` versus `/news` inconsistency. |
| Article difficulty | One CEFR level per article in V1 | Accepted | Lower generation cost and simpler storage. |
| Publication | Imported and generated content enters `DRAFT` | Accepted | Prevents unsafe automatic publishing. |
| Article writing | Claude writes articles in Claude Code sessions, and the user reviews them (milestone W) | Accepted | No paid API, licence or legal review; the same method as the editorial dictionary. Decided on 2026-10-27. |
| Article kinds | News, adapted from one source, and explainers, written from general knowledge with references | Accepted | Explainers cover what free news sources cannot. Decided on 2026-10-27. |
| Launch moderation | Human approval required | Accepted | Reduces factual, translation, and copyright risk. Since 2026-10-31 the approval is a publication mark in the article's file, merged to `main`. |
| Seed data | PostgreSQL seed data, not a parallel mock-data path | Accepted | Ensures the first release exercises real queries and relationships. |
| Images | Local owned placeholders or no image by default | Accepted | Avoids unclear external image rights. |
| Deduplication | URL and normalized-title rules first | Accepted | Embeddings are deferred until evidence shows they are necessary. |
| Processing | Sequential jobs are acceptable initially | Accepted | A dedicated queue is premature for MVP volume. |
| Search | Not a Reader Release requirement | Accepted | It does not block validation of the core reader. |
| Search at launch | In the browser, over an index built with the site | Accepted | Search is in the product MVP. Since 2026-10-31 the static site has no database to search; PostgreSQL full-text search waits until the site has a server. |
| Prisma workflow | Prisma ORM 7.10.0 with `prisma-client`, `prisma.config.ts`, and the PostgreSQL driver adapter | Accepted | ADR-001 pins the stable M2 generator, runtime, migration, and seeding workflow. |
| News source | GOV.UK news under the Open Government Licence v3.0, picked by hand (ADR-004) | Accepted | Explicit commercial and adaptation rights with no key, contract or fee. Decided on 2026-10-27. |
| AI provider/model | Anthropic Claude through the official SDK, `claude-opus-5` by default | Provider accepted | Structured outputs are supported. The model for each task is chosen by measured comparison (ML roadmap item 3) before M7, which is on hold. |
| Dictionary fallback | Contextual Claude lookup, cache-first | Accepted; off on the static site | Word plus sentence gives the contextual Turkish sense; results are cached in `VocabularyEntry`. Since 2026-10-31 the static site has no server to call it from, and every word of a written article has an editorial entry. |
| Admin authentication | Better Auth: an email, a password and an authenticator-app code (ADR-003) | Accepted | Decided on 2026-10-14; no third-party service or host dependency. Since 2026-10-31 the admin runs only on the user's computer. |
| Hosting | GitHub Pages: a static site built by a GitHub Actions workflow on every push to `main`, at `https://balimkonuksever.github.io/newslingo/`. No server or database in production | Accepted | Chosen by the user on 2026-10-31. Free, nothing online to secure or back up, and the articles already live in the repository. GitHub Free offers Pages only for public repositories. |
| Scheduler | Vercel Cron or Trigger.dev | On hold | Waits with M8. |
| CEFR inventory mix | Each category rotates A2, B1, B2 and C1, so every level appears | Accepted | Decided on 2026-10-27. Levels are assigned when an article is written; an independent level check waits for the CEFR classifier. |
| Article length | English words per level: A2 150–250, B1 250–350, B2 300–450, C1 450–650, never more than 900 | Accepted | Decided on 2026-10-27, close to the demo articles. The 900-word ceiling is the one the page budget is set for (§17). |

Version numbers for framework and database dependencies will be verified for compatibility during bootstrap and then pinned in the lockfile. This plan does not assume floating dependency versions.

---

## 5. Scope matrix

| Capability | Reader Release | Launch MVP | Deferred |
|---|:---:|:---:|:---:|
| Editorial homepage | ✓ | ✓ | |
| Category, difficulty, reading-time, and date filters | ✓ | ✓ | |
| Six category pages | ✓ | ✓ | |
| Database-backed article pages | ✓ | ✓ | |
| Alternating English/Turkish paragraphs | ✓ | ✓ | |
| Translation visibility controls | ✓ | ✓ | |
| Reader font-size control | ✓ | ✓ | |
| CEFR badges and reading time | ✓ | ✓ | |
| Source attribution | ✓ | ✓ | |
| Contextual single-word lookup | | ✓ | |
| Multi-word expression matching | | ✓ | |
| Article-level Real English section | | ✓ | |
| Category expression libraries | | ✓ | |
| Admin moderation, on the user's computer | | ✓ | |
| Articles written in Claude Code sessions (W) | | ✓ | |
| Explainers with references | | ✓ | |
| Adapted GOV.UK news, picked by hand | | ✓ | |
| Idempotent article import | | ✓ | |
| Static site on GitHub Pages | | ✓ | |
| Licensed news ingestion (M6, on hold) | | | ✓ |
| Automated AI rewrite and translation (M7, on hold) | | | ✓ |
| Scheduled processing (M8, on hold) | | | ✓ |
| SEO, accessibility, security hardening | Baseline | ✓ | |
| Search in the browser | | ✓ | |
| Online admin, PostgreSQL full-text search and the contextual Claude lookup, which need a server | | | ✓ |
| General user accounts | | | ✓ |
| Saved articles and saved words | | | ✓ |
| Vocabulary notebook/review | | | ✓ |
| Reading history and streaks | | | ✓ |
| Quizzes | | | ✓ |
| Text-to-speech/audio | | | ✓ |
| Same story at multiple CEFR levels | | | ✓ |
| Personalized levels and AI tutor | | | ✓ |
| Teacher/social/subscription features | | | ✓ |
| Additional language pairs | | | ✓ |
| Multiple news providers | | | ✓ |
| Dedicated queue/backend service | | | ✓ |

---

## 6. System architecture

### 6.1 Reader Release architecture

```text
Browser
  │
  ├── Server-rendered public routes
  │       │
  │       ├── article queries
  │       ├── category queries
  │       └── metadata generation
  │
  └── Small client-side reader controls
          │
          ├── translation visibility
          └── font size

Next.js application
  │
  └── Prisma data-access boundary
          │
          └── PostgreSQL
```

### 6.2 Launch MVP architecture

Since 2026-10-31, when the site became static (§19):

```text
Claude Code session: Claude writes, the user reviews
      │
      ├── explainer: general knowledge, with references
      └── news: one GOV.UK story picked by hand (Open Government Licence v3.0)
      │
      ▼
Article file in the repository
(paragraphs, Turkish, dictionary senses, key vocabulary, Real English marks)
      │
      ▼
Import command → validation → DRAFT in the local database
      │
      ▼
Local admin preview (M5) → the user approves → the file is marked published
      │
      ▼
Pull request merged to main
      │
      ▼
GitHub Actions: temporary PostgreSQL → migrations → reference data
→ import, publishing the marked articles → static export
      │
      ▼
GitHub Pages: the public reader routes as static files

Reader word/expression click
      │
      ▼
The article's static file of editorial entries, fetched on the first click → UI
```

The automated pipeline that M6–M8 would build, on hold since 2026-10-27:

```text
Licensed provider
      │
      ▼
Provider adapter → Normalizer → Raw candidate store
                               │
                               ▼
                   Deduplicate / filter / rank
                               │
                               ▼
                    AI educational adaptation
                               │
                               ▼
                     Schema and policy validation
                               │
                               ▼
                            DRAFT
                               │
                               ▼
                     Admin review and publish
                               │
                               ▼
                       Public reader routes

Reader word/expression click
      │
      ▼
Local contextual cache → External fallback → Validate → Cache → UI
```

### 6.3 Runtime boundaries

- `src/app`: routes, layouts, route-level metadata, loading/error boundaries.
- `src/components`: presentation and tightly scoped interaction components.
- `src/server`: server-only database and external-service integrations. Since 2026-10-31 this code runs during the site build and on the user's computer, never on GitHub Pages.
- `src/domain`: shared schemas and domain contracts where a real boundary exists.
- `src/jobs`: scheduled orchestration added only when ingestion begins (on hold with M8).
- `prisma`: schema, migrations, deterministic fixtures, seed entry point, and the written articles with their editorial dictionary (W).

### 6.4 Engineering rules

- Do not import Prisma, API keys, or provider SDKs into Client Components.
- Do not create a separate static-data implementation for the reader.
- Validate environment variables and all external/API inputs at boundaries.
- Avoid `any`; prefer inferred types from validation schemas and Prisma.
- Use transactions for multi-record publication changes.
- Keep provider and AI integrations behind interfaces.
- Keep ingestion idempotent and browsing independent of job latency.
- Do not render raw source HTML.
- Do not add state libraries until local React state is demonstrably insufficient.
- Do not add a generic repository/service abstraction without concrete duplication.

---

## 7. Route and interface plan

### 7.1 Public routes

| Route | Release | Responsibility |
|---|---|---|
| `/` | Reader Release | Featured story, latest articles, category sections, basic discovery. |
| `/category/[slug]` | Reader Release | Category description and recent published articles. |
| `/article/[slug]` | Reader Release | Bilingual reader, metadata, attribution, learning interactions. |
| `/category/[slug]/expressions` | Launch MVP | Category-specific Real English library. Built in M4: the category's cards in display order, linked from the category page and from each article's Real English section; unknown or inactive categories return 404. |

Since 2026-10-31 every public route is generated at build time for GitHub Pages, under the `/newslingo` base path. The homepage filters keep their shareable URLs but are applied in the browser, since a static page cannot read its query string on a server.

Reserved but disabled until their product phases:

- `/saved`
- `/vocabulary`

These routes should return 404 or remain absent; they should not present fake functionality.

### 7.2 Admin routes

Added during the moderation milestone:

| Route | Responsibility |
|---|---|
| `/admin` | Operational summary and failure counts. Built in M5: article counts by status, failed included, each linking to the filtered list. |
| `/admin/articles` | Filtered article list; raw-candidate views wait with M6. Built in M5: every article in any status, newest story first, filtered by status and category in the URL, with counts that match the filters, at most 50 at a time. |
| `/admin/articles/[id]` | Preview, source lineage, generation attempts, moderation actions. Built in M5: the preview through the public reader, the source details, the moderation history and the actions the article's status allows; generation attempts wait with M7. W adds the article's kind and its references or licence. |
| `/admin/jobs` | Ingestion/generation runs and failures. On hold with M6–M8. |

Authentication and authorization must protect both the pages and their server actions/handlers.

Since 2026-10-31 the admin runs only on the user's computer and is left out of the static site.

### 7.3 API and internal interfaces

Interfaces are added only in their owning milestone:

```text
POST /api/dictionary
POST /api/admin/ingest
POST /api/admin/articles/[id]/publish
POST /api/admin/articles/[id]/archive
POST /api/admin/articles/[id]/regenerate
POST /api/cron/news-ingestion
```

`POST /api/dictionary` is preferred over a query-string GET because sentence context may be long. Its input and output must be schema validated, rate limited, and bounded in size.

Publishing and archiving were built in M5 as server actions on the admin article page instead of the two `/api/admin/articles/[id]/…` handlers above (decision 2026-10-25). Ingestion, regeneration and cron handlers are decided in their own milestones, which are on hold; written articles reach the database through a command, not an HTTP interface (W).

`POST /api/dictionary` is not part of the static site (2026-10-31): each article page fetches a static file of its words' and expressions' entries on the first click instead. The endpoint stays for local use, and for the contextual lookup if the site gains a server.

---

## 8. Data model and migration roadmap

### 8.1 Migration policy

- Migration 001 contains only the reader-core schema.
- Each later feature adds its models in the milestone that owns them.
- Never edit a migration that has been applied outside an isolated local reset.
- Production-safe reference provisioning uses stable identifiers/slugs, is idempotent, and contains categories plus approved expression-library content only.
- There is no production database since 2026-10-31. Each site build creates a temporary database, applies the migrations, provisions reference data, and imports the written articles, publishing the ones their files mark published. It never includes demo articles.
- Development/test demo seeding is a separate command containing sample articles and test fixtures.
- Production is never reset or seeded with demo articles.
- Production schema changes use forward migrations and an expand/contract approach where needed.

### 8.2 Migration 001 — reader core

#### `Difficulty`

```text
A2
B1
B2
C1
```

#### `ArticleStatus`

```text
FETCHED
PROCESSING
DRAFT
PUBLISHED
FAILED
ARCHIVED
```

The initial seed articles use `PUBLISHED`. The complete enum is defined early so later workflow code does not require a disruptive status redesign.

#### `Category`

Planned fields:

- `id`
- `slug` — unique
- `name`
- `description` — optional
- `displayOrder`
- `isActive`
- `createdAt`
- `updatedAt`

Constraints and indexes:

- unique `slug`
- index on `(isActive, displayOrder)`

#### `Article`

Planned fields:

- `id`
- `slug` — unique
- `title`
- `shortSummary` — optional
- `categoryId`
- `difficulty`
- `status`
- `sourceName`
- `sourceUrl` — unique after canonicalization for generated/public content
- `sourceImageUrl` — optional
- `imageAttribution` — optional
- `sourcePublishedAt` — publication time at the original source
- `publishedOnSiteAt` — optional Newslingo publication time
- `wordCount`
- `readingTimeMinutes`
- `createdAt`
- `updatedAt`

Constraints and indexes:

- unique `slug`
- unique `sourceUrl` for V1's single adaptation per source story
- index on `(categoryId, status, sourcePublishedAt)`
- index on `(status, publishedOnSiteAt)`
- index on `(difficulty, status)`
- positive word count and reading time enforced in application validation; a database check may be added in the migration SQL

If multiple CEFR adaptations are introduced later, source uniqueness moves to the raw-candidate relation plus `(rawArticleId, difficulty)`.

#### `ArticleParagraph`

Planned fields:

- `id`
- `articleId`
- `order` — starts at 1
- `english` — text
- `turkish` — text
- `createdAt`
- `updatedAt`

Constraints:

- unique `(articleId, order)`
- cascade delete with the parent article
- non-empty English and Turkish content enforced before persistence
- paragraphs always queried with explicit ascending order

### 8.3 Vocabulary and Real English migration

#### `VocabularyEntry`

Acts as a contextual lookup cache.

Key fields:

- surface word and normalized word
- lemma
- part of speech
- English definition
- Turkish meaning
- example sentence
- IPA
- context sentence
- context hash or sense key
- provider/schema version
- timestamps

Primary cache key for MVP:

```text
normalized word + normalized sentence hash + provider version + schema version
```

#### `Expression`

Key fields:

- expression and normalized expression
- slug
- type: idiom, phrasal verb, collocation, common expression, slang, or news English
- optional CEFR level
- English and Turkish meanings
- English and Turkish examples
- usage note
- literal-translation warning
- optional pronunciation metadata

An expression is not owned by one category because it may be useful in several categories.

#### `CategoryExpression`

Many-to-many relation containing:

- `categoryId`
- `expressionId`
- `displayOrder`
- `isFeatured`

#### `ArticleExpression`

Represents an occurrence, not merely membership.

Key fields:

- article and expression IDs
- optional paragraph ID
- matched surface text
- containing sentence
- start/end offsets where reliable
- display order
- optional confidence/source metadata

An occurrence identity or equivalent constraint prevents the same match from being inserted twice.

#### `ArticleVocabulary`

Curated key vocabulary is distinct from arbitrary on-demand word lookups. This join stores:

- `articleId`
- `vocabularyEntryId`
- source sentence
- display order
- optional generation/source metadata

The article reader uses it for a database-backed “Key vocabulary from this article” section. A unique article/entry/context identity prevents duplicate generated items.

### 8.4 Ingestion migration

On hold with M6 since 2026-10-27.

#### `RawNewsArticle`

Key fields:

- provider key and optional provider article ID
- title and normalized title
- canonical URL and URL hash
- source/outlet name
- description and permitted source content
- source image URL plus rights metadata where available
- source publication time
- category hint and classification confidence
- raw provider payload
- content/title hashes
- ingestion status
- first-seen and last-seen timestamps

Uniqueness:

- `(providerKey, providerArticleId)` where the provider supplies a stable ID
- canonical URL hash as the primary cross-run idempotency guard

#### `IngestionRun`

Stores:

- provider
- start/end times
- status
- fetched, duplicate, filtered, selected, generated, and failed counts
- error summary
- configuration snapshot or version

#### `IngestionRunItem`

This record is required for reconciliation, restartability, and source lineage. It stores:

- ingestion run ID
- optional persisted raw-candidate ID
- provider item ID, URL/fingerprint, and safe title summary
- outcome such as accepted, duplicate, filtered, malformed, or failed
- reason/error classification
- timestamps

It must be capable of recording duplicates and malformed provider items that never become `RawNewsArticle` records. Aggregate `IngestionRun` counts are derived from or reconciled against these item outcomes.

Lineage relations:

- `RawNewsArticle` has zero or more ingestion-run items.
- `Article` receives an optional `rawNewsArticleId`; V1 permits one adaptation per raw story.
- A future multi-level migration changes this to unique `(rawNewsArticleId, difficulty)`.

### 8.5 AI-generation migration

On hold with M7 since 2026-10-27.

#### `GenerationAttempt`

Stores:

- raw source article
- optional resulting article
- target difficulty
- independently validated/classified difficulty
- difficulty-assignment reason or inventory deficit
- model/provider
- prompt and schema versions
- attempt number and status
- structured output JSON
- validation errors
- token/cost metadata where available
- latency, timestamps, and failure details

Invalid attempts never directly transition an article to `PUBLISHED`.

#### `ArticleRevision`

Preserves the prior approved version when a published article is regenerated. It stores:

- article ID and monotonically increasing version
- complete approved content snapshot, including article fields, paragraph pairs, curated vocabulary, and expressions
- optional originating/replacing generation-attempt IDs
- publication/replacement timestamps
- moderation reason/actor reference where appropriate

Published-regeneration policy:

1. Regeneration output remains pending inside a validated `GenerationAttempt`; the existing `PUBLISHED` article is unchanged.
2. Admin preview renders the pending attempt separately from the live article.
3. Approval transaction writes the current live content to `ArticleRevision`, replaces the Article's direct fields and related paragraph/vocabulary/expression records, keeps the stable Article ID/source URL, and records a moderation event.
4. Rejection leaves the live article untouched.
5. A revision snapshot can support an audited restore operation.

Initial generation may create a normal `DRAFT` Article. Regenerating an unpublished draft may replace that draft transactionally because no public content is affected.

### 8.6 Moderation and post-MVP models

- `ModerationEvent`: actor, action, reason, before/after snapshot, timestamp. Added in M5 by the `moderation_events` migration; a trigger refuses any update or delete, so the table is append-only.
- `User`, `Session`, `Account`, `Verification` and `TwoFactor`: Better Auth's tables for admin sign-in, added in M5 by the `admin_auth` migration (ADR-003). They hold admins only.
- `SavedArticle`, `SavedWord`, and `ReadingProgress`: user learning state.
- `Quiz`, `QuizQuestion`, `QuizAttempt`: quiz feature.
- `AudioAsset`: article/paragraph/word TTS metadata.
- PostgreSQL search vector and GIN index: waits until the site has a server. Since 2026-10-31 launch search runs in the browser (M9).

### 8.7 Written-articles migration

Added by milestone W in the `written_articles` migration (2026-10-27):

- `ArticleKind`: `NEWS` or `EXPLAINER`. `Article.kind` defaults to `NEWS`, so existing articles keep their meaning.
- `Article.sourceName`, `sourceUrl` and `sourcePublishedAt` become optional for explainers only. CHECK constraints keep all three required when the kind is `NEWS` (`Article_news_has_source`) and forbid them, with the licence, on an explainer (`Article_explainer_has_no_source`).
- `Article.datedAt`, required: the date readers see, and the one lists sort and filter by. News is dated by its source, which `Article_news_has_source` enforces; an explainer by the day it was written. It replaces `sourcePublishedAt` in the `(categoryId, status, …)` index, and existing articles were backfilled from their source date.
- `Article.sourceLicence`: a `SourceLicence` enum whose one value, `OGL_3_0`, is the Open Government Licence v3.0. Optional on news, and required by the publication check when the source is GOV.UK, so the "About this article" box can show the licence statement and link.
- `ArticleReference`: an explainer's references, with `articleId`, `order` starting at 1, `title`, `publisher`, `url` and `checkedAt`, a date without a time. Unique `(articleId, order)`, deleted with its article, and CHECK constraints refuse blank text.

---

## 9. Proposed directory structure

```text
newslingo/
├── .github/
│   └── workflows/
│       └── ci.yml
├── prisma/
│   ├── migrations/
│   ├── editorial/                # production content written in sessions (W)
│   │   ├── articles/             # one file per written article, listed in index.ts
│   │   └── dictionary/           # the reviewed editorial dictionary, shared with the demo
│   ├── fixtures/                 # development/test data only
│   │   ├── articles.ts           # demo articles: five news stories and an explainer
│   │   ├── drafts.ts             # an unpublished draft for the admin pages (M5)
│   │   ├── expression-occurrences.ts  # where cards occur in them (M4)
│   │   ├── key-vocabulary.ts     # each article's key words (M4)
│   │   └── sense-choices.ts      # the sense of each ambiguous word in them (M4)
│   ├── reference/                # production reference data
│   │   ├── categories.ts
│   │   └── expressions/          # Real English cards, one file per category (M4)
│   ├── article-import.ts         # plans and writes the import of written articles (W)
│   ├── editorial-dictionary.ts   # checks and rows for the dictionary entries
│   ├── expression-library.ts     # checks and rows for cards and occurrences
│   ├── key-vocabulary.ts         # checks key words and keys them to entries
│   ├── schema.prisma
│   ├── seed.ts                   # CLI: reference | demo | all
│   ├── seeders.ts                # seeding logic shared with tests
│   └── written-articles.ts       # the written-article format and its checks (W)
├── public/
│   └── images/
│       └── seed/                 # owned/licensed local assets only
├── scripts/
│   ├── admin-account.ts          # create an admin, or reset one's sign-in
│   ├── import-articles.ts        # validate written articles, write them as drafts (W)
│   ├── reset-test-database.ts    # empty the test database, reload demo data
│   └── with-test-database.ts     # guarded runner for test-database commands
├── src/
│   ├── app/
│   │   ├── (home)/               # route group: the loading state covers only /
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── article/[slug]/       # no loading.tsx, so unknown slugs return 404
│   │   │   └── page.tsx
│   │   ├── category/[slug]/
│   │   │   ├── page.tsx
│   │   │   └── expressions/page.tsx  # the category's Real English (M4)
│   │   ├── admin/                # moderation milestone; each page checks access itself
│   │   │   ├── actions.ts        # sign-in, code check and sign-out (M5)
│   │   │   ├── articles/         # moderation pages (M5)
│   │   │   │   ├── actions.ts    # server actions: publish, archive, restore, edits
│   │   │   │   ├── page.tsx      # the list, filtered by status and category
│   │   │   │   └── [id]/page.tsx # preview, source details, history and actions
│   │   │   ├── page.tsx          # admin home: article counts by status
│   │   │   └── sign-in/          # password page, then code/page.tsx
│   │   ├── api/                  # added by owning feature phases
│   │   │   └── dictionary/route.ts   # POST: one word lookup (M4)
│   │   ├── error.tsx
│   │   ├── global-error.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── admin/                # M5
│   │   │   ├── admin-nav.tsx         # the admin pages' links and sign-out
│   │   │   ├── moderation-forms.tsx  # client: one form per moderation action
│   │   │   ├── moderation-history.tsx  # audit rows, newest first
│   │   │   ├── sign-in-forms.tsx     # client: the password and code forms
│   │   │   └── status-badge.tsx
│   │   ├── article/
│   │   │   ├── about-this-article.tsx  # the credit: a source, its licence, or references (W)
│   │   │   ├── article-reader.tsx    # client: controls + reading position
│   │   │   ├── article-view.tsx      # the article as readers see it, also the admin preview
│   │   │   ├── paragraph-pair.tsx
│   │   │   └── reading-anchor.ts
│   │   ├── learning/             # contextual lookup (M4)
│   │   │   ├── english-text.tsx      # words and expressions as spans, one tab stop
│   │   │   ├── expression-details.tsx  # a Real English card
│   │   │   ├── disclosure-list.tsx     # rows that open to more detail
│   │   │   ├── key-vocabulary-list.tsx # an article's key words
│   │   │   ├── real-english-list.tsx   # cards as rows that open to the rest
│   │   │   ├── lookup-client.ts
│   │   │   ├── word-lookup.tsx       # client: popover / bottom sheet
│   │   │   └── word-navigation.ts    # roving tab index between words
│   │   ├── news/
│   │   │   ├── article-card.tsx
│   │   │   ├── article-filters-form.tsx
│   │   │   ├── category-accent.ts
│   │   │   └── category-card.tsx
│   │   ├── shared/
│   │   │   ├── category-nav.tsx
│   │   │   ├── difficulty-badge.tsx
│   │   │   ├── empty-state.tsx
│   │   │   ├── explainer-badge.tsx   # marks explainers on cards and pages (W)
│   │   │   ├── site-footer.tsx
│   │   │   └── site-header.tsx
│   │   └── ui/                   # shared class lists only
│   ├── domain/                   # boundary schemas/types as needed
│   │   ├── dictionary.ts
│   │   ├── expressions.ts        # Real English cards and marks for the reader
│   │   ├── moderation.ts         # admin action rules, publication checks (M5)
│   │   └── sources.ts            # source licences, which GOV.UK requires (W)
│   ├── generated/prisma/         # generated and ignored
│   ├── jobs/                     # scheduled orchestration, on hold with M8
│   ├── lib/
│   │   ├── admin-article-filters.ts  # the admin list's URL filters (M5)
│   │   ├── article-filters.ts
│   │   ├── database-env.ts
│   │   ├── dates.ts
│   │   ├── difficulty.ts
│   │   ├── env.ts
│   │   ├── format.ts
│   │   ├── reading-time.ts
│   │   ├── slug.ts
│   │   └── text/                 # tokenizer, phrases, segments, lookup context
│   └── server/
│       ├── articles/queries.ts
│       ├── auth/                 # admin sign-in with Better Auth (M5)
│       │   ├── access.ts         # the check every admin page and action calls
│       │   ├── admin-accounts.ts # what the admin command does
│       │   ├── config.ts
│       │   ├── index.ts          # the site's instance, from the environment
│       │   ├── responses.ts      # reading Better Auth's responses
│       │   ├── session.ts        # requireAdmin() for pages and actions
│       │   └── sign-in.ts        # the sign-in steps, with their limits
│       ├── categories/queries.ts
│       ├── db/client.ts
│       ├── dictionary/           # contextual lookup (M4)
│       │   ├── anthropic-provider.ts
│       │   ├── config.ts         # provider and limits from the environment
│       │   ├── fixture-provider.ts
│       │   ├── log.ts            # outcome, latency and cost lines
│       │   ├── lookup.ts         # cache-first lookup service
│       │   └── provider.ts
│       ├── moderation/           # M5
│       │   ├── queries.ts        # admin reads: every status, counts, history
│       │   └── workflow.ts       # publish, archive, restore, edits
│       ├── rate-limit.ts         # in-memory limits for lookups and sign-in
│       ├── ingestion/            # ingestion milestone, on hold
│       │   └── providers/
│       └── ai/                   # generation milestone, on hold
├── tests/
│   ├── e2e/                      # Playwright journeys and axe scans
│   ├── integration/              # Vitest against the test database
│   └── support/                  # helpers shared by both suites
├── .env.example
├── .gitignore
├── .node-version
├── compose.yaml
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── playwright.config.ts
├── pnpm-lock.yaml
├── prettier.config.mjs
├── prisma.config.ts
├── tsconfig.json
└── vitest.config.mts
```

Small unit tests should be colocated with pure modules/components. Database integration tests and browser journeys remain under `tests/`.

---

## 10. Configuration and developer workflow

### 10.1 Environment variables

M1 bootstrap requires no secret and may use a safe local site-URL default:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

M2 introduces the required application and isolated test database URLs:

```env
DATABASE_URL=
TEST_DATABASE_URL=
NEXT_PUBLIC_SITE_URL=
```

M4 adds the dictionary settings. The API key goes only in `.env.local` or the host's secret store:

```env
DICTIONARY_PROVIDER=none      # none (default), fixture or anthropic
DICTIONARY_MODEL=claude-opus-5
DICTIONARY_CACHE_ONLY=false   # the kill switch: serve cached entries only
ANTHROPIC_API_KEY=
```

M5 adds admin sign-in. The production secret goes only in the host's secret store:

```env
BETTER_AUTH_SECRET=   # signs sessions and encrypts authenticator secrets
BETTER_AUTH_URL=      # the site's origin; defaults to NEXT_PUBLIC_SITE_URL
```

Since 2026-10-31 production has no host secret store. The site build sets `NEXT_PUBLIC_SITE_URL` to the GitHub Pages address and the `/newslingo` base path, and needs no secret: the static site has no admin, sign-in or dictionary provider.

Later milestones add variables only when required:

```env
NEWS_API_KEY=
CRON_SECRET=
```

Both wait with M6 and M8. Written articles need no new variable: GOV.UK's API needs no key, and Claude reads it during the writing session, not at run time.

Rules:

- `.env.example` contains names and safe documentation, never secrets.
- `.env*` files are ignored except `.env.example`.
- Only browser-safe values use the `NEXT_PUBLIC_` prefix.
- Server startup/build should fail clearly when a required environment variable is missing.
- Environment validation is phase-aware: M1 must build without a database URL; database-backed routes introduced in M2 require `DATABASE_URL`.
- Integration/E2E setup uses `TEST_DATABASE_URL` and must refuse destructive operations unless the database name or connection metadata explicitly identifies a test database.
- CI sets database variables before any Prisma configuration, generation, migration, or test command evaluates them.
- Dictionary settings are validated on the first lookup, so builds and pages need no API key.
- Tests never call a live model: `scripts/with-test-database.ts` sets `DICTIONARY_PROVIDER=none` and removes `ANTHROPIC_API_KEY`, and `NODE_ENV=test` refuses the live provider.
- Sign-in settings are validated when first needed. Outside production, a blank `BETTER_AUTH_SECRET` falls back to a development-only secret, so local work needs no setup; production refuses a missing secret and that one.

### 10.2 Planned package scripts

```text
dev
build
start
lint
lint:fix
format:check
format:write
typecheck
test
test:watch
test:integration
test:e2e
test:e2e:ui
db:up
db:down
db:logs
db:format
db:validate
db:generate
db:migrate
db:migrate:deploy
db:migrate:test
db:seed
db:seed:reference
db:seed:demo
db:reset:test
db:reset
db:studio
admin:create
admin:reset
articles:import
site:build
site:serve
```

`articles:import` (W) validates the written articles in `prisma/editorial/` and writes new or changed ones as drafts, or as published articles when their files have the publication mark. It refuses the whole batch if any file is invalid, never changes an article that is not a draft, and, like the admin commands, waits for a typed confirmation before writing to a database that is not on this machine.

`site:build` (M9) builds the static site the way the GitHub Pages workflow does: against a database holding only reference data and the written articles, with the admin and the dictionary endpoint left out. `site:serve` serves the result under `/newslingo` as GitHub Pages does.

`admin:create` creates an admin and `admin:reset` gives one a new password and authenticator app; no page can do either (ADR-003). Both show the target database and wait for a typed confirmation, which is the database host when it is not on this machine. They take passwords at a hidden prompt, never as arguments. Both set up the authenticator app before finishing: a creation whose setup does not finish is removed, and an admin whose reset stops half-way opens no admin page until it is run again.

`postinstall` may generate the Prisma client. CI still calls generation explicitly so the dependency is visible.

`db:seed:reference` provisions only production-safe categories and approved expression libraries. `db:seed:demo` adds development/test articles and must refuse production; it runs only when `NODE_ENV` is not `production` and the database host is local. The convenience `db:seed` command may run both locally but is never used by production deployment. `db:migrate:test`, `db:reset:test`, `test:integration`, and `test:e2e` reach the isolated test database only through the guard in `scripts/with-test-database.ts`. `db:reset:test` empties the test database and reloads the reference and demo data; the browser tests run it before every run. `db:reset` for the development database is not added yet.

### 10.3 Local setup target

A new developer should be able to run a short, documented sequence equivalent to:

```text
install dependencies
start PostgreSQL
apply migrations
seed development data
start the application
```

The exact commands will be added to the repository README during bootstrap. The setup must not require news, AI, dictionary, auth, or cron credentials for the Reader Release.

Before M2 installs Prisma, record a short ADR that selects a currently supported, compatible Prisma generator/configuration and Migrate workflow. The ADR names exact versions; M2 adds those versions to `package.json` and the lockfile when it implements the database layer. If the chosen workflow differs from the proposed `schema.prisma`/`prisma.config.ts` layout, update this plan and the script names before implementing the schema.

---

## 11. Milestone roadmap

### Dependency summary

```text
M0 rolling decisions/policy ───────────────┐
       │                                   │
       ▼                                   │
M1 Repository                              │
       ▼                                   │
M2 Data foundation                         │
       ▼                                   │
M3 Reader                                  │
       ├───────────────┐                   │
       ▼               ▼                   │
M4 Learning layer   M5 Article moderation  │
       │               │                   │
       └───────┬───────┘                   │
               ▼                           │
       W Written articles ◄────────────────┘
               ▼
       M9 Search and hardening
               ▼
             Launch

On hold since 2026-10-27:
M6 Ingestion + candidate admin → M7 AI generation → M8 Scheduled operation
```

The Reader Release consists of M1–M3. M0 is not a sequential implementation milestone: decisions about providers, authentication, or hosting may remain open while unrelated work proceeds, but each must close before the milestone that names it as a dependency.

Milestone W has a letter rather than a number so that M6–M8 keep their names and the decision log's references to them stay correct.

---

## M0 — Product, legal, and architecture lock

### Goal

Turn the remaining launch-sensitive choices into explicit decisions before they cause schema or integration rework.

### Work items

- [x] Define the Reader Release and Launch MVP boundaries.
- [x] Select the six initial categories.
- [x] Choose one difficulty version per article for V1.
- [x] Choose `/article/[slug]` as the canonical public route.
- [x] Require moderation before generated content is published.
- [x] Select a news provider and document:
  - commercial/derivative-content rights
  - permitted source content depth
  - attribution requirements
  - image-use rights
  - request limits
  - content retention restrictions

  Done on 2026-10-27: GOV.UK news under the Open Government Licence v3.0, with stories picked by hand (ADR-004, `docs/sources/gov-uk.md`).
- [x] Define the editorial adaptation policy:
  - no extensive source wording
  - no invented facts or quotations
  - accurate names, dates, quantities, and claims
  - natural Turkish translation
  - required attribution
  - unsuitable/sensitive-news handling

  Done on 2026-10-27 for written articles. The sensitive-news part, drafted on 2026-10-26 in `docs/editorial/sensitive-news.md`, was approved with held subjects skipped for now; milestone W's editorial rules cover the rest. Automated generation would need its own prompt rules if M7 resumes.
- [ ] Select the AI provider/model and confirm structured-output support. Provider selected on 2026-09-25: Anthropic Claude, with structured outputs. The model for each task is still to be chosen by measured comparison. On hold with M7 since 2026-10-27.
- [x] Select the contextual dictionary fallback: a contextual Claude lookup, cache-first (2026-09-25).
- [x] Select admin authentication: Better Auth with an email, a password and an authenticator-app code, for admins only (2026-10-14, ADR-003).
- [x] Select hosting: GitHub Pages, a static site with no production database (2026-10-31). The scheduler waits with M8.
- [ ] Set operational limits:
  - candidates fetched per run
  - articles generated per run/day
  - retry count
  - AI budget ceiling
  - job frequency
  - active-content and archive policy

  On hold with M6–M8 since 2026-10-27.
- [x] Confirm PostgreSQL full-text search as Launch MVP scope. Since 2026-10-31 launch search runs in the browser instead, since the static site has no database.
- [x] Select and document the compatible Prisma workflow before M2.
- [x] Define the production CEFR assignment mix and shortage-filling rule.

  Done on 2026-10-27: each category rotates A2, B1, B2 and C1, and the next article in a category takes the level after the last one's, so no level falls short. A shortage rule for generation runs waits with M8.
- [ ] Define mandatory finished-article difficulty verification.
- [ ] Define the moderation cadence, maximum draft backlog, and public-freshness SLA. On hold with M8.
- [ ] Define launch-blocking quality metrics.

### Dependencies

None. Provider licensing blocked M6 until 2026-10-27; other unresolved decisions block their named milestones rather than the Reader Release.

### Deliverables

- Updated decision log in this document.
- Approved provider-rights record.
- Content adaptation policy.
- Service and hosting selections.
- Documented cost and operational limits.

### Exit gate

M0 is complete only when every launch-critical decision has an accepted result. Before any dependent milestone starts, its named M0 choices must be closed; the sensitive-content policy must be approved before W's first batch of articles. Decisions that only M6–M8 need wait while those milestones are on hold.

---

## M1 — Repository bootstrap

### Goal

Create a reproducible, strict, minimal application foundation while preserving the product documentation.

### Work items

- [x] Initialize Git in the project root.
- [x] Create a root `.gitignore` covering:
  - `.idea/`
  - `.next/`
  - `node_modules/`
  - generated Prisma client
  - environment files except `.env.example`
  - coverage and browser-test output
  - editor/OS artifacts
- [x] Scaffold Next.js without overwriting the existing Markdown files.
- [x] Enable:
  - App Router
  - `src/` layout
  - strict TypeScript
  - Tailwind CSS
  - ESLint
  - `@/*` import alias
- [x] Pin the compatible Node and pnpm toolchain.
- [x] Commit exactly one dependency lockfile.
- [x] Add formatting and typecheck commands.
- [x] Configure Vitest for pure unit tests and add one smoke test.
- [x] Add server/client boundary conventions.
- [x] Add phase-aware environment configuration that builds without database credentials in M1.
- [x] Record the Prisma workflow ADR that M2 will implement and pin.
- [x] Add a minimal GitHub Actions quality workflow.
- [x] Add a minimal health-check or render smoke path through the homepage.
- [x] Add a short README with local bootstrap commands.

### Implementation notes

- Because the root is nonempty, scaffold in a temporary directory and merge the generated files, or initialize the files manually.
- Do not delete or rewrite `bilingual_news_english_learning_plan.md`.
- Do not add Prisma, UI kits, state libraries, provider SDKs, or auth until their milestone requires them.
- Verify framework/database library compatibility before pinning versions; the M1 Prisma ADR selects the workflow, while M2 installs it.

### Verification

- Dependency installation succeeds with the frozen pnpm lockfile.
- `pnpm dev` starts the app.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.
- No server-only module is imported by the browser bundle.
- The product and implementation-plan documents remain intact.

### Exit gate

A clean checkout can install and build the empty application deterministically, with documented commands and no secrets.

---

## M2 — PostgreSQL, Prisma, and deterministic content

### Goal

Make the real data path operational before building page layouts.

### Dependencies

M1 complete. Docker Desktop must be running locally, or a development PostgreSQL URL must be supplied.

### Work items

- [x] Install and pin the Prisma workflow selected by the M1 ADR.
- [x] Add Docker Compose PostgreSQL with:
  - pinned PostgreSQL major version
  - named data volume
  - health check
  - development-only credentials
- [x] Provision and document an isolated `newslingo_test` database and `TEST_DATABASE_URL`.
- [x] Add `.env.example` and local database documentation.
- [x] Configure Prisma and a server-only client singleton.
- [x] Implement Migration 001:
  - `Difficulty`
  - `ArticleStatus`
  - `Category`
  - `Article`
  - `ArticleParagraph`
- [x] Add uniqueness, foreign-key, ordering, and lifecycle constraints.
- [x] Add pure helpers for:
  - reading-time calculation
  - slug handling
  - date formatting
- [x] Create idempotent production-safe reference provisioning for the six categories.
- [x] Create a separate development/test demo seed for:
  - at least six articles, one per category
  - multiple EN/TR paragraph pairs per article
  - all four CEFR levels across the dataset
  - Turkish diacritics, long titles, and varied paragraph lengths
- [x] Mark all demo articles clearly as development/test fixtures and make the demo command refuse production environments.
- [x] Use safe, local placeholder art or omit images. Demo articles omit images.
- [x] Add server-only queries for:
  - featured/latest articles
  - categories and article counts
  - articles by category slug
  - article by slug with ordered paragraphs
- [x] Add database integration tests.

### Seed-content quality rules

- English and Turkish paragraph counts align because each pair is one record.
- English and Turkish fields are non-empty.
- Adaptations are original educational fixtures, not copied articles.
- Source attribution fields are always populated.
- Development fixture URLs cannot be confused with production ingestion.
- Reading time is derived consistently from English word count.

### Verification

- A fresh database can migrate and seed from zero.
- Rerunning reference provisioning or demo seeding creates no duplicates.
- Reference provisioning contains no demo article and is safe to run against an empty production database.
- Unique category/article slugs are enforced.
- Duplicate paragraph order is rejected.
- Category queries return only their own published articles.
- Paragraph queries always return ascending order.
- Cascade behavior is tested deliberately.
- Database validation, generation, integration tests, and build pass.

### Exit gate

A clean environment can start PostgreSQL, apply migrations, seed the complete sample dataset, and retrieve it through typed server-side queries.

---

## M3 — Editorial shell and bilingual reader

### Goal

Ship a complete, polished Reader Release using the seeded database.

### Dependencies

M2 complete.

### Work items — design foundation

- [x] Establish design tokens for:
  - editorial text and muted text
  - background and surfaces
  - borders and focus rings
  - category accents
  - difficulty badges
  - spacing and content widths
- [x] Establish responsive typography:
  - headline scale
  - article body scale
  - Turkish translation style
  - metadata and labels
  - comfortable line height and line length
- [x] Build reusable primitives only as needed.
- [x] Build the site header, category navigation, and footer.
- [x] Avoid a childish or gamified visual language.

### Work items — homepage

- [x] Build a featured-article section.
- [x] Build latest-news cards.
- [x] Build category sections/cards for all six categories.
- [x] Show difficulty, source, source publication time, and reading time.
- [x] Add URL-backed filters for:
  - category
  - difficulty
  - reading-time band
  - source-publication date range
- [x] Validate filter query parameters and provide a clear reset action.
- [x] Do not show the saved-articles filter until accounts/saving exist.
- [x] Add useful empty and database-error states.
- [x] Ensure cards have one clear semantic link target.

### Work items — category page

- [x] Resolve category by slug and return 404 for an unknown slug.
- [x] Show category name and description.
- [x] Query recent published articles only.
- [x] Render difficulty, source, date, and reading time consistently.
- [x] Add a meaningful empty-category state.
- [x] Generate category metadata.

### Work items — article page

- [x] Resolve article by slug and return 404 for unknown/unpublished content.
- [x] Render headline, category, level, reading time, and source date.
- [x] Display permanent source attribution and an external source link.
- [x] Render paragraph pairs in explicit order:
  - English paragraph
  - Turkish translation
- [x] Add subtle `EN` and `TR` labels.
- [x] Add reader controls:
  - show both languages
  - hide/show Turkish
  - font-size selection
- [x] Keep reader controls in a small Client Component.
- [x] Preserve the user's reading position when controls change. `reading-anchor.ts` keeps the text being read in place; native scroll anchoring is disabled in the reader so every browser behaves the same.
- [x] Add lawful image fallback behavior. Articles render without images until an image policy is approved; source image fields are not queried.
- [x] Generate article title, description, canonical, and OpenGraph fallback metadata.
- [x] Add Article structured data after the public metadata shape stabilizes.

### Work items — responsive and accessibility quality

- [x] Test narrow phones, larger phones, tablets, and desktop widths.
- [x] Keep line length readable on wide screens.
- [x] Prevent horizontal overflow for long English words and Turkish text.
- [x] Use semantic landmarks and heading order.
- [x] Provide visible keyboard focus.
- [x] Ensure controls have names, states, and sufficient target size.
- [x] Respect browser zoom and increased text size.
- [x] Confirm color contrast.
- [x] Add route loading, error, empty, and not-found behavior. Only the homepage has a loading state: a loading boundary on the category or article route would stream the response before `notFound()` runs and turn 404s into 200s.

### Automated verification

- Component tests:
  - article card metadata
  - difficulty badge
  - paragraph pair
  - reader-control states
- Database-backed E2E:
  - home → category → article
  - each category is discoverable
  - each seeded article is reachable
  - EN is immediately followed by its TR partner
  - translation visibility works
  - source attribution is present
  - unknown category/article returns 404
- Desktop and representative mobile E2E viewports.
- Accessibility scan for serious/critical issues.

### Reader Release exit gate

- Homepage, category, and article routes render entirely from PostgreSQL.
- Six categories and at least six seeded articles are discoverable.
- Paragraph order and EN/TR alignment are correct.
- Reader controls work without page reload or reading-position loss.
- Source attribution is visible on every article.
- Keyboard and mobile usage are practical.
- No deferred control is presented as functional.
- Lint, formatting check, typecheck, unit/component/integration/E2E tests, and production build pass.

---

## M4 — Contextual vocabulary and Real English

### Goal

Make individual words and natural multi-word expressions explorable without damaging the reading experience.

### Dependencies

M3 complete. Dictionary provider selection is needed only for the external fallback; local fixtures can support early UI development.

### Work items — data and contracts

- [x] Add `VocabularyEntry`, `ArticleVocabulary`, `Expression`, `CategoryExpression`, and `ArticleExpression` migrations. An occurrence references its paragraph through a composite `(paragraphId, articleId)` key, so it cannot point at another article's paragraph.
- [x] Extend production-safe reference provisioning with at least 10 reviewed expressions for each launch category. The cards live in `prisma/reference/expressions/`, one file per category plus `general.ts` for phrases without a topic, and `pnpm db:seed:reference` refuses the whole library if any card lacks the user's review date. Each launch category has 12 or 13 cards, and 20 general phrases come from the demo articles, all reviewed by the user between 2026-09-30 and 2026-10-03; a unit test requires at least ten per category.
- [x] Keep representative article occurrences in development/test fixtures or generated article data, not global production reference content. Demo occurrences live in `prisma/fixtures/expression-occurrences.ts` and load only with the demo seed.
- [x] Define validated dictionary request/response contracts. A request names a word by article slug, paragraph order and UTF-16 offsets; the server reads the word and its sentence from the published article (`src/domain/dictionary.ts`).
- [x] Bound word and sentence-context lengths: words up to 64 characters, context up to 400 characters around the word, request bodies up to 1 KB.
- [x] Define cache normalization and schema/provider versioning. The key is the normalized word, the SHA-256 of the sentence with the word marked, the provider, the provider version (model and prompt version) and the schema version.

### Work items — text analysis

- [x] Build a tokenizer that preserves exact:
  - spaces
  - punctuation
  - contractions/apostrophes
  - capitalization
  - hyphenated words
  - sentence boundaries
- [x] Match known multi-word expressions before individual words.
- [x] Prefer the longest valid expression when matches overlap.
- [x] Prevent a phrase occurrence from producing nested word targets.
- [x] Preserve surface text while looking up normalized values.
- [x] Extract the complete sentence for contextual lookup. `Intl.Segmenter` splits after titles such as "Mr.", so `sentenceAt` rejoins those.
- [x] Add fixtures for punctuation, quotations, Unicode, repeated words, and overlapping phrases.

### Work items — interaction

- [x] Render no lookup requests during initial article rendering.
- [x] Build one accessible interactive unit per matched expression. A marked expression is one role-less span over all its words, underlined with dots, in the same roving tab order as the words; a click, tap, Enter or Space opens its card in the word card's popover or bottom sheet. The card's content comes with the page, so opening it sends no request.
- [x] Build word interaction for the remaining English tokens. Words are server-rendered spans without a role, handled by one delegated listener, so screen readers read plain prose and no per-word client component hydrates.
- [x] Use a desktop popover.
- [x] Use a mobile bottom sheet. It scrolls the page when it would cover the word.
- [x] Handle loading, success, missing entry, rate limit, provider failure, and retry.
- [x] Preserve keyboard focus when the surface opens and closes.
- [x] Avoid an unusably long tab order; choose and document a keyboard-navigation strategy for tokenized paragraphs. Each English paragraph is one tab stop (a roving tab index on its words). The arrow keys move between words, Home and End jump to the first and last word, and Enter or Space opens the card, which takes focus and gives it back to the word when it closes.

### Work items — lookup service

- [x] Lookup local/contextual cache first.
- [x] On miss, send the word and its sentence context to the selected fallback. The provider sees the surface word and the sentence with that occurrence marked; the cache key uses the normalized word. Simultaneous misses for the same key share one provider call.
- [x] Validate external output before returning or caching it.
- [x] Cache by normalized word, context hash, provider version, and schema version.
- [x] Rate limit per client/session/IP as appropriate to the deployment: 30 lookups a minute per client address and 60 provider calls a minute per server process, held in memory until hosting is chosen.
- [x] Log outcome classes without recording unnecessary personal data. Each lookup logs one JSON line with outcome, provider, latency, token usage and estimated cost, and no address, word or sentence.

### Work items — expression surfaces

- [x] Build expression detail content:
  - type and CEFR
  - English/Turkish meanings
  - examples
  - usage note
  - literal-translation warning

  The card also names the article's wording when it differs from the card's ("here: “sold out”" for *sell out*) and says that the card was written with AI and checked by a native Turkish speaker (`src/components/learning/expression-details.tsx`).
- [x] Build “Real English from this article.” A section after the article lists its expressions in display order, each a row with the expression, type, level and Turkish meaning that opens to the rest of the card, and links to the category's Real English page.
- [x] Build “Key vocabulary from this article” from `ArticleVocabulary` records. Each demo article has 6 to 8 key words (`prisma/fixtures/key-vocabulary.ts`), each pointing at its editorial dictionary entry for that sentence, so the list adds no new Turkish. A section before the Real English one lists them as rows with the dictionary form, part of speech, pronunciation and Turkish meaning, opening to the definition, the article's sentence and an example.
- [x] Build `/category/[slug]/expressions`. The category page links to it with the expression count.
- [x] Verify article expressions actually occur in the article text. Each occurrence is recorded by its exact wording, and the seed finds it in its paragraph, refusing wording that is missing, repeated in the paragraph or overlapping another occurrence (`prisma/expression-library.ts`). Generated articles (M7) can reuse the same check.

### Verification

- Known phrase clicks produce one phrase lookup, not multiple word requests.
- Remaining word clicks include sentence context.
- Repeated lookups use the cache.
- Spacing and punctuation are visually identical before/after tokenization.
- Provider failures are recoverable and never break the article.
- Desktop/mobile interaction surfaces behave appropriately.
- Keyboard navigation and focus management pass manual and automated checks.
- Long C1 articles stay within the agreed DOM/performance budget (§17). `tests/e2e/page-budget.spec.ts` checks its size limits on every demo article.
- Every launch category has at least 10 reviewed, database-backed expressions.
- Curated article vocabulary renders from persisted `ArticleVocabulary` records.

### Exit gate

Readers can explore every eligible English word and all recognized expressions contextually, with correct phrase precedence, stable layout, accessible interaction, caching, and resilient error handling.

---

## M5 — Moderation and workflow foundation

### Goal

Create a secure article lifecycle before connecting live candidates and AI generation.

### Dependencies

M3 reader components and workflow schema. Admin authentication was decided on 2026-10-14 (ADR-003).

### Work items

- [x] Add admin authentication and role authorization. Done on 2026-10-24 with Better Auth 1.7.12, whose Prisma adapter `tests/integration/admin-auth.test.ts` confirms with Prisma 7.10.0 (ADR-003): the `admin` role, the server-only access check (`src/server/auth/access.ts`), the admin command (`pnpm admin:create`, `pnpm admin:reset`), and sign-in at `/admin/sign-in` with a password and then an authenticator code or a backup code, run as server actions.
- [x] Protect both admin pages and server actions/handlers. Done on 2026-10-25: `/admin`, `/admin/articles` and `/admin/articles/[id]` call `requireAdmin()` from `src/server/auth/session.ts` before anything else, and so does every moderation server action in `src/app/admin/articles/actions.ts`. A browser test ends the session on an open article page and confirms that publishing is refused and changes nothing. There are no admin route handlers.
- [x] Add `ModerationEvent` or an equivalent audit record. An append-only table, written in the same transaction as each change (2026-10-25).
- [x] Define allowed state transitions server-side. `MODERATION_RULES` in `src/domain/moderation.ts`; publishing starts only from `DRAFT`, archiving from `DRAFT` (a rejection) or `PUBLISHED`, restoring from `ARCHIVED` to `DRAFT`, and no admin action starts from a pipeline status.
- [x] Add a deterministic non-public draft fixture for admin workflow tests. `prisma/fixtures/drafts.ts`, written by the demo seed as a `DRAFT` that reseeding resets.
- [x] Build an admin article list with status and category filters. Done on 2026-10-25: `/admin/articles` lists every article in any status, newest story first, filtered through validated URL parameters (`?status=draft&category=world`), at most 50 at a time with the total shown. Each filter's choices show their counts within the other filter, read from one database snapshot together with the rows (`src/server/moderation/queries.ts`).
- [x] Build an article preview using the public reader components. Done on 2026-10-25: the public article page's body became `ArticleView` (`src/components/article/article-view.tsx`), which the admin preview renders too, from a server-only admin query that loads any status through the reader's own select (`getArticleForAdmin`). Word lookups answer only for public articles, and the preview says so.
- [x] Show article source metadata. Done on 2026-10-25: the source's name, the original article as a link only when its address is http or https, the source's publication time, when the article was added and last changed, its length and its address on the site.
- [x] Implement safe actions:
  - publish a valid draft
  - archive/unpublish
  - adjust category/difficulty under policy

  The server side is built (`src/server/moderation/workflow.ts`): each action checks its input, the article's status and, for publishing, `publicationProblems`, then changes the article and writes its audit row in one transaction that refuses to run if the article changed meanwhile. Since 2026-10-25 the article page offers only the forms `canModerate` allows: publish with an optional note, reject a draft or archive a published article, restore an archived one to draft, and change the category (to an active one) or the level, each asking for a reason where `MODERATION_RULES` requires one.
- [x] Prefer archive over destructive deletion for published content. No action deletes an article, and an article or admin named by an audit row cannot be deleted.
- [x] Do not show ingestion/regeneration controls until those actions exist. The admin pages have none (2026-10-25).
- [x] Record actor, action, reason, and timestamp for material changes. Each `ModerationEvent` also keeps the changed fields before and after; a reason is required for everything except publishing.
- [x] Add failure-safe user feedback without leaking secrets or stack traces. Done on 2026-10-25: a refusal stays on its form through `useActionState`, with the list of problems for a draft that can't be published yet; an unexpected error is logged on the server, and the form says only that something went wrong and to reload. A success reloads the article with a notice.

### Verification

- Unauthenticated users cannot access pages or invoke actions directly.
- Invalid workflow transitions fail atomically.
- Draft preview matches the public article view.
- Publish/archive actions are persisted and auditable.
- Published articles cannot be edited into invalid EN/TR alignment.

Checked on 2026-10-25:

- Signed-out visitors to `/admin`, `/admin/articles` and an article's page go to sign-in, and an action sent after the session ends is refused without a change (`tests/e2e/admin-sign-in.spec.ts`, `tests/e2e/admin-moderation.spec.ts`).
- Refused and concurrent changes leave the article and its history untouched, and a failed audit row undoes its change (`tests/integration/moderation.test.ts`).
- The preview is the public page's own `ArticleView`, and `tests/integration/admin-queries.test.ts` compares the admin query with the public one field for field.
- The browser tests publish and archive an article, then check the public page, the newest history row and the audit rows in the database.
- No M5 action edits an article's text; publishing checks the paragraph pairs with `publicationProblems`. A text editor added later must keep that check.

### Exit gate

Only authorized admins can move content through the lifecycle, and no article can reach `PUBLISHED` without server-side validation and an auditable action.

Met on 2026-10-26: the user created their own admin with the admin command, tried the admin pages in the development database, and confirmed the gate.

---

## W — Written articles

### Goal

Publish articles that Claude writes in Claude Code sessions and the user reviews, explainers and adapted GOV.UK news, through the M5 admin, with no ingestion pipeline, paid API or licence fee.

### Dependencies

- M4 editorial dictionary, key vocabulary and Real English cards.
- M5 admin preview, publication checks and audited publishing.
- ADR-004: GOV.UK news under the Open Government Licence v3.0.
- Before the first batch: the categories, the sensitive-news policy, the CEFR mix and the target length per level. All four were settled on 2026-10-27 (§19).

### How an article is made

1. Claude proposes a batch in a Claude Code session, about one article per category, and gives a time estimate before writing it.
2. An explainer takes a topic the user has agreed to and is written from general knowledge; every fact must be checkable in one of the references it lists. A news article takes a recent GOV.UK story that the sensitive-news policy allows, read through GOV.UK's Content API and retold in Newslingo's own words, keeping its facts and numbers and attributing the government's claims.
3. Claude writes the English at the assigned level and the Turkish, adds dictionary senses for new words and the sense of every ambiguous word, chooses the key vocabulary and marks Real English occurrences, all in the article's file.
4. The import command validates the batch and writes it as drafts.
5. The user reviews each draft in the local admin preview, above all its facts and Turkish, and approves or rejects it. Since 2026-10-31 an approved article's file is marked published, and the article goes live when that change is merged to `main` and the site rebuilds. As in M4, the new dictionary entries are reviewed from a sheet in `docs/reviews/`: `scripts/sample-dictionary-review.ts --written=<slug>` lists the article's key words and every entry that no demo article and no written article listed before it uses.

### Work items — data

- [x] Add an article kind: `NEWS`, adapted from one source as today, or `EXPLAINER`, written from general knowledge. Existing articles become `NEWS`.
- [x] Make the source fields optional for explainers only, with a database check that keeps them required for news.
- [x] Add `ArticleReference` for an explainer's references: order, title, publisher, web address and the date it was checked.
- [x] Record the source's licence on news articles, so a GOV.UK adaptation carries the Open Government Licence statement and link. The licence is recorded; showing it is a reader item below.
- [x] Decide how lists that sort by the source's publication time order explainers, which have none. Decided on 2026-10-27: every article has a `datedAt`, its source's publication time for news and the day it was written for an explainer, and lists sort and filter by it (§8.7, §19).

The data items and the publication check were built on 2026-10-27 (§8.7), and the reader and admin items the same day.

### Work items — reader and admin

- [x] Show the kind on article cards and pages, so an explainer is never mistaken for news. An "Explainer" badge sits beside the category, and an explainer's date reads "Written"; news has no badge.
- [x] Give the "About this article" box a version for each kind: news credits its source, links to it and shows the licence; an explainer says Newslingo wrote it and lists its references. A GOV.UK story also names GOV.UK beside the department and shows the licence statement with a link to the licence (`src/components/article/about-this-article.tsx`, `src/domain/sources.ts`). The site footer no longer says every article names an original source.
- [x] Show the kind and the references or licence in the admin preview's source details. The section is now called "Details".
- [x] Extend `publicationProblems`: news needs complete attribution, and GOV.UK news its licence; an explainer needs at least one reference with a web address.

### Work items — content files and import

- [x] Keep each written article in its own file in the repository, holding its paragraphs, its source or references, its sense choices, key vocabulary and Real English marks. Built in `prisma/editorial/articles/`: one file per article, named after its slug and listed in `index.ts`, which a unit test checks; the format is `WrittenArticle` in `prisma/written-articles.ts`.
- [x] Move the reviewed editorial dictionary into production content shared by the demo and written articles. Moved to `prisma/editorial/dictionary/` (`EDITORIAL_DICTIONARY`); the demo articles' sense choices stay with the fixtures in `prisma/fixtures/sense-choices.ts`. Entries are now added and corrected but never removed by the demo seed or the import, since both kinds of article share them.
- [x] Add `pnpm articles:import`. It validates every file and refuses the whole batch, listing the problems, if any file is invalid. It writes new or changed articles as `DRAFT`, each with its dictionary entries, key vocabulary and marks in one transaction, and rerunning it changes nothing. Built in `scripts/import-articles.ts` and `prisma/article-import.ts`. The whole batch is one transaction; `--check` validates without a database. Before writing, it lists each article as new, changed (naming the parts) or unchanged, with the dictionary entries to add or correct. Dictionary corrections reach every imported article, published ones included, as reference data does.
- [x] Never let the import change an article that is not a draft. Correcting a published article in a local database goes archive, restore to draft, import, each step audited by M5; the import publishes it again if its file has the publication mark. A changed file for a published or archived article refuses the whole batch, and the draft update is guarded by its status in case an admin publishes meanwhile.
- [x] Like the admin command, show the target database and wait for a typed confirmation before writing to a database that is not on this machine.
- [x] Mark publication in the article file (2026-10-31). An approved article's file records the day it was published, and the import publishes it, through the same publication checks as the admin, instead of writing it as a draft. A file without the mark stays a draft. A correction to a published article is a reviewed change to its file, which the next site build shows. The merged pull request is the record of a publication on the live site. Done on 2026-10-31: the mark is `publishedOnSite`, a whole day no earlier than the article's date, which becomes the article's `publishedOnSiteAt`. The import also refuses a marked article whose category is switched off, the one publication check that needs the database. It records no moderation event, which needs an admin, so the local database's history shows only what an admin did. It never takes an article off the site: removing the mark from a published article is refused, and the admin archives it in the local database. The pilot's two articles were marked the same day.

### Work items — editorial rules

- [ ] Set the target length per level and the CEFR mix before the first batch, and check every article against them. Both were set on 2026-10-27 (§4). The import refuses an article whose length is outside its level's range (`TARGET_WORDS`); the mix is checked when each batch is proposed, since it depends on the articles already published.
- [ ] Explainers use well-established facts only, give date-sensitive figures with their year, offer no advice, and name living people only in their public roles.
- [ ] GOV.UK adaptations follow ADR-004 and `docs/sources/gov-uk.md`: original wording, no long passages from the page, the department and GOV.UK credited, and the licence statement shown.
- [ ] Both kinds follow the sensitive-news policy (`docs/editorial/sensitive-news.md`), approved on 2026-10-27. Until the user decides otherwise, subjects it holds for review are skipped, not proposed.
- [ ] A new category needs at least 10 reviewed Real English cards before it is added, as the card library's unit test requires.

### Verification

- The import is idempotent, refuses invalid files without writing anything, and never changes a published or archived article.
- An explainer and a GOV.UK adaptation each render with the right "About this article" box, and every word opens a dictionary entry.
- The publication check refuses an explainer without references and a GOV.UK article without its licence.
- The demo fixtures include an explainer, so the browser tests cover both kinds on desktop and phone. Since 2026-10-27 the skincare demo article is the demo explainer, with two fixture references on the reserved `.example` domain; its words, key vocabulary and reviewed Turkish are unchanged.
- The demo seed still never runs in production, and the import never writes demo articles.

### Exit gate

The first batch, at least one article for each chosen category, is written, reviewed in the admin preview, and published by its file's mark through the import, without manual database changes. It goes live with the static site (M9).

---

## M6 — Licensed news ingestion

**On hold since 2026-10-27.** Articles are written by hand instead (milestone W). GOV.UK, the source chosen for M6 (ADR-004), is used through stories picked by hand. This section stays as the plan for automated ingestion if it returns.

### Goal

Import raw candidates safely and idempotently without publishing or generating anything automatically.

### Dependencies

- M0 provider rights approved.
- M0 sensitive/prohibited-content policy approved.
- M2 data foundation complete.
- M5 protected admin shell and action authorization available.

### Work items — provider boundary

- [ ] Define a provider-neutral interface:

```ts
interface NewsProvider {
  fetchLatest(options?: {
    category?: string;
    limit?: number;
  }): Promise<RawNewsArticleInput[]>;
}
```

- [ ] Implement one licensed provider.
- [ ] Normalize timestamps, URLs, source names, descriptions, images, and permitted content.
- [ ] Keep provider-specific fields in raw payload metadata, not public models.
- [ ] Use fixtures and a fake provider in automated tests.

### Work items — persistence and selection

- [ ] Add `RawNewsArticle`, `IngestionRun`, and mandatory `IngestionRunItem` migrations.
- [ ] Add the optional Article → RawNewsArticle lineage relation for future generated content.
- [ ] Canonicalize URLs before computing the uniqueness hash.
- [ ] Store raw candidates before transformation.
- [ ] Make repeated imports idempotent.
- [ ] Implement MVP deduplication:
  - provider ID
  - canonical URL hash
  - normalized title
  - source/date heuristic
- [ ] Add category mapping and confidence handling.
- [ ] Reject or hold:
  - advertisements
  - clickbait/insufficient content
  - duplicates
  - prohibited content types
  - items without enough factual input
- [ ] Rank candidates before expensive processing.
- [ ] Apply category and per-run quotas.
- [ ] Persist fetch, duplicate, filter, select, and failure counts.
- [ ] Persist one reconciled run-item outcome for every provider item, including malformed and duplicate items that do not become candidates.
- [ ] Add timeout, rate-limit, malformed-item, and partial-failure handling.
- [ ] Never accept arbitrary user/admin URLs for server-side fetching.
- [ ] Extend admin with:
  - candidate list and source lineage
  - candidate detail/outcome
  - reject/hold action
  - protected manual ingestion trigger

### Verification

- Rerunning the same fixtures/feed creates no duplicates.
- One malformed item does not fail the complete run.
- All candidates retain source and original-publication metadata.
- Filter/category decisions are inspectable.
- Reconciled run-item outcomes explain every fetched item.
- No AI call occurs during ingestion.
- No imported candidate is publicly visible.

### Exit gate

An authorized manual run imports unique, attributable, categorized candidates with complete operational records, without generating or publishing content.

---

## M7 — AI educational transformation

**On hold since 2026-10-27.** Claude writes and translates articles in Claude Code sessions instead of through paid API calls (milestone W). This section stays as the plan for automated generation if it returns.

### Goal

Turn a selected candidate into a schema-valid, original bilingual educational draft that is ready for human review.

### Dependencies

- M0 AI/provider/content-policy, CEFR-assignment, and verification decisions.
- M4 expression data contract.
- M5 moderation workflow.
- M6 raw candidates.

### Work items — structured contract

- [ ] Define a versioned schema containing:
  - adapted title
  - short summary
  - category
  - CEFR difficulty
  - ordered EN/TR paragraph pairs
  - key vocabulary
  - zero to six natural article expressions
- [ ] Define target word ranges for A2/B1/B2/C1.
- [ ] Assign target difficulty before generation using the approved inventory-mix and shortage-filling rule; do not let the model choose the site's level distribution implicitly.
- [ ] Require strict structured output rather than free-form parsing.

### Work items — prompt and policy

- [ ] Preserve factual meaning.
- [ ] Preserve names, dates, numbers, prices, and statistics.
- [ ] Prohibit invented facts and quotations.
- [ ] Prohibit extensive source wording.
- [ ] Require original learner-focused phrasing.
- [ ] Require short, aligned paragraphs.
- [ ] Require natural Turkish rather than literal translation.
- [ ] Do not force expressions when none are natural.
- [ ] Version prompts and schemas.

### Work items — validation

- [ ] Validate required metadata and enum values.
- [ ] Require at least three complete paragraph pairs.
- [ ] Validate level-specific target length.
- [ ] Reject empty English or Turkish paragraphs.
- [ ] Confirm extracted expressions occur in the generated English.
- [ ] Compare names, dates, and numeric facts with the source input.
- [ ] Detect suspicious source-text overlap where practical.
- [ ] Run the approved mandatory finished-article difficulty verification and store the independently classified/validated level.
- [ ] Flag a target-versus-validated difficulty mismatch for review or regeneration.

### Work items — persistence and retry

- [ ] Add `GenerationAttempt` and `ArticleRevision` migrations.
- [ ] Record model, prompt, schema version, target/validated difficulty, assignment reason, latency, usage/cost, and errors.
- [ ] Retry a retryable malformed response once.
- [ ] Mark exhausted attempts `FAILED` with actionable details.
- [ ] Store the Article → RawNewsArticle lineage plus article, paragraphs, curated vocabulary, and expression relations in one transaction.
- [ ] Initial generation creates/updates a `DRAFT`, never auto-publishes.
- [ ] Regenerating a published article stores validated pending output on the generation attempt and leaves the live row/relations untouched.
- [ ] On approval of a published replacement, atomically snapshot the old approved content to `ArticleRevision`, replace content relations, retain the stable Article/source URL, and keep the article published.
- [ ] On rejection, leave the live published content untouched.
- [ ] Preserve source lineage across regeneration attempts.
- [ ] Add admin live-versus-pending preview, regenerate, approve, reject, and audited restore actions.

### Editorial QA checklist

- Factual details match the input source.
- No fabricated quotation or unsupported claim appears.
- Wording is an original educational adaptation.
- Turkish is natural and meaning-aligned.
- CEFR complexity is plausible.
- Target and validated CEFR levels agree, or the mismatch is explicitly reviewed.
- Paragraph order and alignment are correct.
- Expressions are natural, correctly typed, and present in the article.
- Attribution and source URL are correct.

### Verification

- Invalid output never becomes public.
- Transaction failure leaves no partial public article.
- Retry count is bounded and visible.
- Regeneration creates a traceable new attempt.
- Published content remains unchanged and available until a pending replacement is approved.
- Approved replacement creates a restorable prior revision atomically.
- Generated key vocabulary persists and renders through `ArticleVocabulary`.
- Generated levels follow the configured inventory mix within its documented tolerance.
- CI uses mocked structured outputs and never calls the live model.
- A representative evaluation set passes human factuality, translation, CEFR, and originality review.

### Exit gate

A raw candidate can become a valid draft and then a human-approved public article without manual database changes, while every generation attempt remains traceable.

---

## M8 — Scheduled pipeline and operations

**On hold since 2026-10-27,** with M6 and M7: there is no pipeline to schedule.

### Goal

Run the complete pipeline safely, within budget, and without duplicate work.

### Dependencies

M5–M7 complete. Hosting and scheduler selected.

### Work items

- [ ] Add authenticated scheduled execution.
- [ ] Orchestrate:
  1. fetch
  2. normalize
  3. deduplicate
  4. filter/rank
  5. select within quotas/budget
  6. generate
  7. validate
  8. leave as draft for moderation
- [ ] Add a concurrency lock for overlapping runs.
- [ ] Make each stage restartable and idempotent.
- [ ] Add bounded timeouts and retries.
- [ ] Add failed/dead states with manual retry.
- [ ] Enforce per-run and daily generation ceilings.
- [ ] Enforce category balance and active-article targets.
- [ ] Add freshness ranking and archival/replacement policy.
- [ ] Enforce the approved moderation cadence, maximum draft backlog, and public-freshness SLA; automation creates drafts, while public refresh remains a moderated operation.
- [ ] Add kill switches for generation and publication.
- [ ] Add structured logging and alerts for:
  - provider outage
  - elevated generation failure
  - stale or empty category
  - moderation backlog or review-SLA breach
  - duplicate attempts
  - budget ceiling
  - scheduler authentication failure
- [ ] Run a multi-day staging soak.
- [ ] Test recovery from provider, AI, and database failures.

### Verification

- Repeated and overlapping runs do not duplicate candidates or drafts.
- Successful items are not repeated when one item fails.
- Failed items can be retried independently.
- Generation stops predictably at configured limits.
- Draft backlog and public category freshness stay within the approved SLA during the staging soak.
- Every article traces back through its candidate, run, and generation attempt.
- Simulated critical failures produce alerts.
- Public browsing remains fast while jobs are running.

### Exit gate

The pipeline runs unattended in staging for the agreed soak period without duplicate publication, runaway cost, category starvation, or silent failure.

---

## M9 — Static site, search, release hardening, and launch

### Goal

Publish the reader as a static site on GitHub Pages that is secure, accessible, findable and reversible, rebuilt from the repository on every push to `main`, with no server or database in production.

Since 2026-10-27 M9 follows milestone W. Items that served only the ingestion and generation pipeline are marked as on hold. Since 2026-10-31 production is a static site on GitHub Pages (§19), so items that needed a production server or database are replaced or marked as not needed.

### Work items — static site

- [x] Build the public routes as a static export under the `/newslingo` base path: the homepage, the category pages and their expression pages, every published article and the not-found page. Routes with parameters list theirs at build time and refuse any other. Done on 2026-11-01: `SITE_BUILD=1` switches `next.config.ts` to a static export with trailing slashes. On the local server the root layout still renders every page per request (`renderPerRequest` in `src/server/render-mode.ts`, which replaces `force-dynamic`), and dynamic routes list their parameters only in the site build, from `layout.site.tsx` files, since on the local server `generateStaticParams` would turn their pages static. Canonical addresses and the article's structured data keep the base path.
- [x] Leave the admin, sign-in and `POST /api/dictionary` out of the static site. They keep working on the user's computer. Done on 2026-11-01: their route files are named `*.local.tsx` and `*.local.ts`, which only the local server's `pageExtensions` include, and `*.site.ts` files only the site build's. Admin pages type their props with `AdminPageProps`, since Next.js generates `PageProps` only for files named `page.tsx`.
- [x] Apply the homepage filters in the browser, keeping their shareable URLs and their validation rules. Done on 2026-11-01, on the local server too: the page sends every public article's card data, and `HomeArticles` filters it with `filterArticles`, which an integration test checks against the database query. The filters are parsed without zod, which would have put article pages over their script budget through prefetching. The static HTML holds the unfiltered homepage, so filters need JavaScript there; filtered views share the homepage's canonical address.
- [x] Give each article a static file of its words' and expressions' editorial entries, fetched on the first click, so a lookup needs no server and the page budget (§17) still holds. Done on 2026-11-01: `/words/<slug>.json` holds every word with the entry a server lookup returns, each distinct entry once; the largest, the C1 article's, is 74 KB, 21 KB compressed. Expression cards were already part of the page. The reader reads word files on the local server too, so `POST /api/dictionary` and its provider fallback are no longer called by it.
- [x] Add `pnpm site:build` and a GitHub Actions workflow that starts a temporary PostgreSQL, applies the migrations, provisions reference data, imports the written articles, publishing the marked ones, builds the static export and deploys it to GitHub Pages. It runs on every push to `main` and never includes demo articles; a failing step leaves the previous site live. Done on 2026-11-01: `scripts/build-site.ts` builds from the `newslingo_site` database, which a guard keeps local and named; `pnpm site:serve` serves `out/` as GitHub Pages does. `.github/workflows/pages.yml` deploys only once the repository is public, and CI builds the static site on every pull request.
- [ ] Run the browser tests, accessibility scans and page budget against the static build in CI.

### Work items — MVP search

- [x] Build a search index of published articles with the site, covering title, summary, category, article body and source, with sensible weights. Done on 2026-11-01: `/search-index.json` (`buildSearchIndex` in `src/server/articles/search-index.ts`, served like the word files by `route.local.ts` and `route.site.ts`) holds each public article's card, its references' publishers, and the terms of its English text and of its Turkish translation, each once. `createArticleSearch` in `src/lib/search.ts` finds the articles that contain every word of the query. Each word counts by the best field it appears in: title 8, summary 4, category and source 3, English and Turkish text 1, and half that when it only begins a word, from three letters, so "phone" finds "phones" but "ai" does not find "aid". The whole query as a phrase adds its field's weight again; equal matches stay newest first.
- [x] Build a validated, URL-backed search page that loads the index when first used and searches in the browser. Done on 2026-11-01: `/search?q=…`, linked from the header. The index is fetched once, when the field gets focus or a query is opened; a failed fetch offers to try again. The query is the first `q`, with its spaces collapsed, cut at 100 characters. The filter form and the search form use `next/form`, which adds the base path to their action, so both submit within the static site without JavaScript too; search itself needs JavaScript there.
- [x] Handle empty queries, no results, Turkish/English text, and result limits. Done on 2026-11-01: an empty query shows the form alone, and no match shows an empty state. Terms are folded to lower case without accents, with the Turkish ı and İ as i, so "guzellik" finds "güzellik" and "K-pop" is "k pop". A query keeps its first 10 words, and the page shows the best 30 results with the total.
- [ ] Test ranking on the launch inventory, and keep the index's download within the page budget. Started on 2026-11-01: ranking is tested on the demo articles, and a test scales the demo index's compressed size to 15 articles per category against the 175 KB script budget. The 13 articles on the local server made a 16 KB compressed index, about 1.3 KB each. Test the ranking again once the launch inventory exists.
- [ ] PostgreSQL full-text search and external search services wait until the site has a server.

### Work items — security

- [x] Before the repository becomes public, scan its whole history for secrets and personal data, and confirm no `.env` file was ever committed. Done on 2026-11-01 (`docs/reviews/2026-11-01-security-review.md`): every blob of every branch and pull request, every commit message and every pull request's text hold no secret and no personal data, and only `.env.example` was ever committed. Every commit records the author's personal email address, which the repository publishes once it is public; the user decides on that before making it public.
- [x] Confirm the static build needs no secret and contains no draft, demo article, admin page or server-only code. Done on 2026-11-01: `checkSite` in `scripts/site-security.ts` runs at the end of every `pnpm site:build`, so in CI and before every deployment. It refuses the build if any article but the written ones marked published has a page, a word file or a search entry, or a marked one lacks one; if the admin, the dictionary endpoint, a source map or an environment file is present; or if any file mentions a demo article, a draft, a database setting or address, a secret's setting or a private key. The site build sets no secret.
- [x] Set a content security policy and a referrer policy with `<meta>` tags, since GitHub Pages cannot set response headers. Done on 2026-11-01: `secureSite` puts each page's policy first in its `<head>`. It allows the site's own files and nothing from other origins, no inline styles, frames or plugins, and the page's inline scripts by their SHA-256 hashes, since Next.js writes each page's React payload into inline scripts and a static page cannot carry a per-request nonce. A `<meta>` tag cannot carry `frame-ancestors` or reporting. The referrer policy is `same-origin`, set in the root layout's metadata; `no-referrer` would also blank the Origin header of the local admin's form posts, which Next.js checks. Checked in Chrome against the static build: no page breaks the policy, and an injected inline script, an inline style and an image from another origin were blocked.
- [x] Sanitize or discard source HTML. Discarded by design: written articles hold plain text, which React escapes, and no source HTML enters the site while M6 is on hold. The only raw HTML a page writes is its article's JSON-LD, with `<` escaped.
- [x] Validate all route parameters, and the filter and search query strings in the browser. Reviewed on 2026-11-01: the static site holds only the parameters listed at build time, and anything else gets the not-found page; the local server looks slugs up as query parameters and answers not found. The filters keep only known categories, levels, lengths and real calendar days, and the search query is its first `q`, cut at 100 characters and 10 words.
- [x] Confirm error pages expose no secrets or raw stack traces. Reviewed on 2026-11-01: the route error page shows only the error's reference, and the global error page nothing about the error.
- [x] Keep the local admin's authentication, server-side checks and rate limits as they are, for the user's computer. Unchanged on 2026-11-01, with their tests passing.
- [ ] Not needed while production is static: online admin authorization, server rate limits, CSRF and session settings for a live admin, cron authorization (on hold with M8), and provider URL restrictions (on hold with M6).

### Work items — accessibility

- [ ] Test keyboard navigation and focus recovery.
- [ ] Test popover and bottom-sheet screen-reader behavior.
- [ ] Validate heading order and landmark structure.
- [ ] Validate contrast, zoom, and text resizing.
- [ ] Validate interactive word/expression semantics.
- [ ] Test the longest supported article at mobile and desktop sizes.

### Work items — performance and SEO

- [ ] Confirm no word file is fetched before the first click.
- [ ] Profile the DOM and hydration cost of long tokenized articles.
- [ ] Measure the page budget again on the deployed site, served by GitHub Pages.
- [ ] Optimize fonts and mobile loading.
- [ ] Check canonical URLs and metadata under the base path, and add an OpenGraph fallback and Article structured data.
- [ ] Generate the sitemap and robots file at build time.
- [ ] Check search speed and index size against the launch inventory.

### Work items — release operations

- [ ] The user makes the repository public, after the security scan, and turns on GitHub Pages with GitHub Actions as its source.
- [ ] Deploy, then check the live site: the homepage, a category page, an article with a word lookup, the not-found page, and a phone viewport.
- [ ] Add a job to the workflow that checks those pages after every deployment.
- [ ] Publish the first batch by merging its publication marks, and confirm that every article appears.
- [ ] Rehearse a rollback.
- [ ] Publish an operations runbook covering:
  - removing a bad article: remove its publication mark, or revert its merge, and the site rebuilds
  - correcting a published article: a reviewed change to its file
  - rolling back: revert `main` to an earlier commit, or rerun an earlier deployment
  - a failed build: GitHub reports it, and the previous site stays live
- [ ] Not needed while production is static: a production database with its backups and migration step, production secrets, and monitoring beyond GitHub's reports. The repository holds everything the site publishes.

### Launch gate

- Every chosen category is represented.
- Target inventory exists, or a reduced inventory has explicit approval.
- No critical/high security issue remains.
- Core keyboard, mobile, and desktop flows pass on the deployed site.
- Search returns relevant published results across the required fields.
- An article can be removed and corrected through a merge.
- The site rebuilds from `main` alone, and a rollback has been rehearsed.
- The article import creates valid drafts without duplicates and publishes only marked articles.
- No launch blocker remains unresolved in the decision log.

---

## 12. Testing strategy

### 12.1 Test layers

| Layer | Tool category | Primary responsibilities |
|---|---|---|
| Static | TypeScript, ESLint, formatter, Prisma validation | Type safety, code quality, schema/config correctness. |
| Unit | Vitest | Pure helpers, normalization, reading time, tokenization, matching, validation. |
| Component | React Testing Library + Vitest | Cards, badges, reader controls, lookup states, accessible UI behavior. |
| Database integration | Vitest + real PostgreSQL | Constraints, migrations, query filters/order, transactions, idempotency. |
| API/service integration | Vitest + fake providers | Input validation, caching, retries, workflow rules, failure mapping. |
| Browser E2E | Playwright | Real routes, responsive behavior, critical public/admin journeys. |
| Accessibility | axe integration + manual keyboard/screen-reader checks | Semantics, focus, contrast, interaction behavior. |
| Editorial evaluation | Fixtures + human rubric | Factuality, Turkish quality, CEFR fit, originality, expression quality. |

### 12.2 Core test matrix

#### Reader Release

- Fresh migration succeeds against an empty PostgreSQL database.
- Seed is idempotent and produces six categories.
- Article/category slugs are unique.
- Paragraph order is unique per article and queried ascending.
- Homepage shows featured/latest/category content.
- Homepage filters return correct results and survive reload through validated URL parameters.
- Category pages exclude drafts and other categories.
- Unknown slugs return 404.
- Article metadata and source attribution render.
- EN/TR pairs remain adjacent.
- Translation and font-size controls work.
- Mobile layouts do not overflow.
- Keyboard focus is visible.

#### Vocabulary and expressions

- Tokenizer preserves exact text reconstruction.
- Apostrophes, contractions, hyphens, quotation marks, and Unicode work.
- Longest matching expression wins.
- Overlapping expressions do not create nested targets.
- Correct sentence context is extracted.
- Cache hit bypasses the external provider.
- Provider and schema versions prevent stale incompatible cache reuse.
- Curated key vocabulary persists and renders in display order.
- Rate-limit/provider failures are recoverable.
- Popover/bottom sheet returns focus correctly.

#### Moderation and ingestion

- Unauthorized admin/API access is rejected.
- Invalid state transitions are rejected.
- Publishing is atomic and auditable.

On hold with M6 and M7:

- Published-article regeneration does not mutate live content before approval.
- Approving a replacement creates a prior revision; rejecting it leaves live content unchanged.
- Repeated provider input creates no duplicate raw candidate.
- One malformed item does not abort the batch.
- Filter and count reconciliation is exact.
- Provider timeouts/rate limits map to retryable operational states.

#### Written articles

- Importing the same files twice changes nothing.
- An invalid file refuses the whole batch and writes nothing.
- The import never changes a published or archived article.
- Every word of an imported article has a dictionary entry, and every ambiguous word has its sense.
- Explainers need at least one reference; news needs complete attribution, and GOV.UK news its licence.
- The "About this article" box and the article cards show each kind correctly.

#### AI transformation

On hold with M7.

- Malformed JSON fails validation.
- Missing/empty translation fails validation.
- Invalid CEFR/category fails validation.
- Missing source metadata fails validation.
- Expression absent from article text fails expression validation.
- Numeric/name/date inconsistencies are flagged where validation supports it.
- Target-versus-validated CEFR mismatches are flagged.
- Transaction rollback leaves no partial article.
- Retry occurs only for allowed failures and only within the limit.
- Live model calls never run in CI.

#### Scheduled operation

On hold with M8.

- Overlapping invocations respect the lock.
- Rerun is idempotent.
- Daily/per-run limits stop generation.
- Partial failures resume at the correct stage.
- Kill switches stop the intended operation.
- Alerts trigger for simulated critical conditions.

#### Search

- Only published articles appear.
- Title, summary, category, body, and source are searchable.
- Ranking favors stronger/title matches as designed.
- Empty, invalid, and no-result queries are safe.
- Launch-scale search meets relevance and latency/row-bound expectations without requiring a particular scan type on a tiny table.
- The search index's download stays within the page budget at launch volume. Since 2026-10-31 search runs in the browser, so no PostgreSQL index is checked.

### 12.3 Quality gates by change type

Every implementation change must pass the relevant subset; merging to the protected branch requires the complete Reader Release gate once those tests exist.

```text
format check
lint
typecheck
Prisma format/validate/generate
unit and component tests
database integration tests
production build
critical desktop/mobile E2E
accessibility scan
```

No arbitrary global coverage percentage is required initially. Critical domain behavior, state transitions, and failure paths must be covered explicitly.

### 12.4 Manual QA devices/viewports

At minimum:

- narrow mobile viewport
- representative modern phone viewport
- tablet portrait
- desktop laptop
- wide desktop
- keyboard-only navigation
- browser zoom/text scaling
- reduced-motion preference where motion is introduced

---

## 13. Continuous integration and deployment

### 13.1 Pull-request CI

CI is introduced incrementally:

**M1 static pipeline**

1. Check out source.
2. Set up pinned Node and pnpm with cache.
3. Install with the frozen lockfile.
4. Run formatter check, lint, typecheck, Vitest, and production build.

The M1 build order applies only while the application is database-free.

**M2 database-aware pipeline**

1. Run checkout, toolchain setup, frozen install, formatter check, lint, typecheck, and database-independent Vitest tests.
2. Start PostgreSQL with isolated application/test databases.
3. Set `DATABASE_URL` and `TEST_DATABASE_URL` before Prisma configuration is evaluated.
4. Generate the Prisma client and validate the schema.
5. Apply migrations to the empty test database.
6. Run the database integration tests, which reset the test database and create their own data, then provision reference data and load the demo fixtures.
7. Create the production build only after the seeded test database is ready.

**M3 browser pipeline additions**

1. Start the M2 production build against the seeded test database.
2. Run critical desktop/mobile Playwright and axe checks.
3. Upload traces/screenshots/videos only on failure.

As implemented, the Playwright global setup resets and seeds the test database itself, and the tests run in Google Chrome through Playwright's `chrome` channel on a desktop and a Pixel 7 viewport.

CI should cancel superseded runs on the same branch. Static checks and database/build/E2E work may be split into parallel jobs once the pipeline exists.

### 13.2 Environment strategy

- **Local:** Docker PostgreSQL and deterministic development fixtures.
- **Test:** isolated test database; destructive helpers refuse non-test URLs.
- **Preview:** none since 2026-10-31. Pull-request CI builds the static site without deploying it.
- **Staging:** none since 2026-10-31. The local `pnpm site:build` and the CI build stand in for it.
- **Production:** GitHub Pages, deployed by the site workflow on every push to `main`; merging is the release approval. Written articles arrive through the article import in the build. Scheduled processing waits with M8.

### 13.3 Database deployment policy

Since 2026-10-31 there is no production database. Each site build:

- creates an empty temporary PostgreSQL database and runs `migrate deploy`;
- provisions reference data, then imports the written articles, publishing the ones their files mark published;
- never runs development migrations, a reset, or the demo seed;
- discards the database after the static export.

A failing step stops the deployment, and the previous site stays live. Applied migrations are still never edited, because the user's local database keeps its history.

### 13.4 Deployment smoke tests

After every deployment, on the live site:

- load `/`
- load one category page
- load one published article
- verify source link or references and EN/TR content
- open one word's entry
- load a missing address and get the not-found page
- confirm that no admin page or draft is reachable

---

## 14. Copyright, provenance, and editorial safety

### 14.1 Source approval record

Before enabling a provider, record:

- provider/publisher name
- terms URL and review date
- commercial-use permission
- transformation/derivative-use permission
- allowed stored fields/content
- required attribution text
- image-use permission
- retention/deletion requirements
- rate limits
- owner of the approval decision

GOV.UK's record is `docs/sources/gov-uk.md` (ADR-004). Explainers have no source to approve: they are written from general knowledge, and each lists the references its facts were checked against.

### 14.2 Content rules

- Never simply scrape and republish a full copyrighted article.
- Generate an original educational adaptation.
- Preserve factual meaning and attribution.
- Link to the original source.
- Do not invent facts, quotations, or statistics.
- Avoid long verbatim overlap.
- Do not use source images without explicit permission.
- Keep source lineage and generation-version records.
- Provide a rapid archive/removal path.
- Write explainers in Newslingo's own words from well-established facts, never from one article's text, and list the references that confirm them.
- Never present invented events, people or organisations as real. The demo fixtures are fiction and stay on a reserved `.example` domain.

### 14.3 Publication policy

At launch, since 2026-10-27:

1. Claude writes the article in a Claude Code session: an explainer, or an adaptation of one GOV.UK story.
2. The article import validates it and stores it as `DRAFT`.
3. The user reviews factuality, language, level, and originality in the admin preview.
4. The user approves or rejects it. Since 2026-10-31 an approved article's file is marked published, and the article goes live when that change is merged to `main`.

The automated route that M6–M8 would build, on hold: a candidate is ingested, an adaptation is generated and validated, and the article stays `DRAFT` until an admin publishes or rejects it.

Auto-publication may be reconsidered only after measured evidence shows consistent quality and an emergency kill switch is operational.

---

## 15. Security plan

### Reader Release

- Validate all route slugs and environment variables.
- Keep database access server-only.
- Use safe external-link attributes.
- Do not render raw HTML from seeds or external sources.
- Keep error pages free of secrets and stack traces.
- Commit no environment secrets.

### Learning layer

- Validate and bound dictionary input/context.
- Rate limit the endpoint.
- Validate external responses before caching.
- Avoid logging full unnecessary reader context.
- Escape all displayed content through normal React rendering.

### Admin and jobs

Since 2026-10-31 the admin runs only on the user's computer, and the public site is static.

- Enforce authentication and authorization server-side.
- Protect actions independently of page middleware.
- Use secure session and CSRF protections appropriate to the auth solution.
- Require an authenticated cron secret or signed scheduler request (on hold with M8).
- Rotate compromised secrets.
- Log material admin actions.
- Never fetch arbitrary user-controlled URLs.
- Use timeouts, redirect limits, and approved hosts in source integrations (on hold with M6).
- Make the article import show its target database and wait for a typed confirmation before writing anywhere but this machine.

### Pre-launch review

- dependency/security scan
- secret and personal-data scan of the whole history, before the repository becomes public
- a check that the static build holds no draft, demo article, admin page or server-only code
- content security policy review
- input-validation review
- error/log redaction review

All six were done on 2026-11-01 and are recorded in `docs/reviews/2026-11-01-security-review.md`. The static-build check and the content security policy now run in every site build.

Until 2026-10-31 this list also covered authorization, rate-limit, source-fetch, session and cookie, and database permission and backup reviews of a production server. The local admin keeps its authorization and rate-limit tests.

---

## 16. Accessibility plan

Accessibility is a release requirement, not a polish-only task.

### Baseline

- semantic document landmarks
- one clear page heading
- logical heading hierarchy
- real buttons and links for controls
- visible focus states
- sufficient contrast
- comfortable target sizes
- support for zoom and text resizing
- screen-reader names and control state
- no information conveyed by color alone

### Reader-specific concerns

- EN/TR labels must be understandable without relying only on color.
- Translation controls must update `aria-pressed` or equivalent state.
- Font-size controls must remain operable at increased zoom.
- Clickable-word rendering must not create an unusable keyboard experience.
- The lookup surface must announce loading/errors and manage focus.
- Closing a popover/bottom sheet should return focus to the initiating word/expression.
- Mobile bottom sheets must be dismissible by keyboard and assistive technology.

Automated scans supplement—not replace—manual keyboard and screen-reader checks.

---

## 17. Performance, caching, observability, and cost

### Performance budgets

- Public list/article content is rendered on the server; since 2026-10-31, once, when the site is built.
- Client JavaScript is limited to explicit interactions.
- No dictionary request occurs until a user clicks.
- Article queries select only required fields.
- Images, if used, have known dimensions and appropriate optimization.
- Long C1 articles are profiled after tokenization.
- Public caching must never expose drafts or admin data.

The article page budget, set on 2026-10-14 for the longest article the product spec allows (C1, 900 English words, with its key vocabulary and Real English lists), on a production build:

| Limit | Budget | 900-word article | C1 demo article (488 words) |
|---|---|---|---|
| Page elements | 600 plus one per English word (1,500) | 1,372 | 907 |
| HTML download, compressed | 50 KB | 34 KB | 29 KB |
| JavaScript download on a first visit, compressed | 175 KB | 145 KB | 145 KB |
| Main-thread blocking while loading, phone profile | 200 ms | 42 ms | 67 ms |
| Script time for one tap, phone profile | 100 ms | 41 ms | 38 ms |
| Time from a tap to the next frame, real browser | 200 ms | 16 ms or less | 48 ms |

`tests/e2e/page-budget.spec.ts` enforces the three size limits on every demo article. The timings were measured once. The phone profile is Google Chrome driven by Playwright at a Pixel 7 viewport with the CPU slowed four times, taking the median of seven loads; the Event Timing API timed the word card, the translation toggle and the text-size buttons, and the word card was the slowest. The 900-word article was a temporary copy of the C1 demo article with its paragraphs repeated. Repeated text compresses better than new text, so a real 900-word article's HTML download would be nearer 39 KB. Headless Chrome added 100 ms or more of waiting for the next frame to every word-card tap, which a real browser window did not show, so the phone budget counts script time and the 200 ms response target is checked in a real browser. Measure again once W sets the target lengths, and before launch.

### Cache plan

Since 2026-10-31 production is static: GitHub Pages serves prebuilt files, and a merge to `main` rebuilds the site, which replaces invalidation after publish and archive. The items below apply to the local application.

- Framework/data cache for safe public published-content queries.
- Explicit invalidation after publish/archive/regenerate actions.
- Contextual vocabulary database cache keyed by normalized word + context hash + provider version + schema version.
- No cache of authorization decisions beyond the selected auth system's safe model.

### Structured logs

Representative fields:

```text
event
request/run ID
candidate/article ID
provider
stage
status
duration
retry count
error class
model/prompt/schema version
token/cost metadata
```

Do not log secrets, full credentials, or unnecessary personal data.

### Operational metrics

The provider, candidate, generation and scheduling metrics wait with M6–M8.

- provider fetch success/failure
- candidates fetched/deduplicated/filtered/selected
- generation success/failure/retry rate
- validation-failure categories
- draft-to-publish rate
- active articles per category
- category freshness
- dictionary cache hit rate
- dictionary provider failure/rate-limit rate
- AI usage/cost per article and per day
- scheduled-run duration and overlap prevention

Learning-product analytics such as article completion and words clicked can be added after the privacy policy and user-consent approach are defined.

### Cost controls

Since 2026-10-27 articles cost no model calls: Claude writes them in Claude Code sessions, and word lookups read editorial entries. Since 2026-10-31 hosting costs nothing: GitHub Pages and GitHub Actions are free for a public repository. The controls below apply if M7 and M8 resume.

- Filter and rank before generation.
- Use one generation call for rewrite, translation, vocabulary, and expressions when quality permits.
- Apply per-run and daily generation caps.
- Cache contextual definitions.
- Bound retries.
- Do not regenerate unchanged content.
- Record usage/cost by attempt.
- Provide a generation kill switch.

---

## 18. Risk register

| Risk | Likelihood | Impact | Mitigation | Release trigger/blocker |
|---|---:|---:|---|---|
| Provider/content use is not licensed for the intended transformation | Low | Critical | GOV.UK under the Open Government Licence v3.0, with its source record (ADR-004); explainers use no source's text. | Blocks the affected article. |
| Source images have unclear rights | High | High | Omit images or use owned/local placeholders until rights are explicit. | Blocks use of affected image, not text release. |
| AI invents facts or quotations | Medium | Critical | References for every explainer, GOV.UK facts and figures kept as published, the user's review before publishing, audit records. | Blocks publication of affected article. |
| Turkish translation changes meaning | Medium | High | Paragraph alignment, validation, editorial sampling, regeneration/rejection. | Blocks publication of affected article. |
| CEFR level is inconsistent or inventory becomes one-sided | Medium | Medium | Explicit assignment mix, finished-article classification, readability indicators, and editorial sampling. | Blocks article if materially unsuitable; blocks launch if inventory tolerance fails. |
| Extensive source wording creates copyright risk | Low | Critical | Explainers written from general knowledge; GOV.UK stories retold in Newslingo's own words under a licence that allows adaptation; human review. | Blocks publication. |
| Scope expands before core reader is validated | High | High | Reader Release gate; scope matrix; explicit change decisions. | Blocks added work unless traded against scope. |
| Duplicate candidates/articles occur across runs | Medium | High | Canonical URL hash, unique constraints, idempotency, cron lock. Written articles: an idempotent import keyed by slug. | Blocks scheduled launch if unresolved (on hold with M8). |
| Provider or AI outage breaks browsing | Medium | High | Async separation, timeouts, failure states, existing-content continuity. | Does not block browsing; alerts operations. On hold with M6–M8. |
| AI costs grow unexpectedly | Low | High | Written articles cost no model calls; for M7–M8 if resumed: pre-filtering, quotas, caps, caching, usage logs, kill switch. | Stops generation at limit. |
| Writing and reviewing articles takes longer than expected | High | Medium | Batches of about one article per category, each with a time estimate first; a smaller launch inventory with the user's approval. | Slows launch; does not block it. |
| Readers find the articles dry or narrow | Medium | Medium | Topics chosen with the site's main reader within the six categories kept on 2026-10-27; explainers mixed with news. | Prompts a change of topics or categories. |
| Context cache returns the wrong word sense | Medium | Medium | Sentence hash, provider/schema version, contextual validation. | Requires cache invalidation/fix. |
| Expression matching corrupts text or overlaps words | Medium | High | Longest-match algorithm, exact reconstruction fixtures, occurrence offsets. | Blocks M4 exit. |
| Hundreds of interactive tokens harm accessibility/performance | Medium | High | Keyboard strategy, DOM profiling, mobile/assistive QA. | Blocks M4/launch. |
| Admin or cron access is compromised | Low | Critical | Strong auth, server checks, secret rotation, audit logs, rate limits. Since 2026-10-31 the admin is not online. | Blocks launch. |
| Making the repository public exposes something private | Low | High | A secret and personal-data scan of the whole history before the switch; `.env` files are ignored. | Blocks making the repository public. |
| GitHub Pages' limits or terms stop fitting the site | Low | Medium | Non-commercial use, well inside the 1 GB site and soft 100 GB-a-month bandwidth limits; the site is plain static files any static host can serve. | Prompts a move to another static host. |
| Pipeline fails silently | Medium | High | Persist run items/generation attempts, reconciled counts, source lineage, alerts, and runbook. | Blocks M8 exit (on hold). |
| Database migration prevents rollback | Low | High | Expand/contract, backups, staging rehearsal, forward-fix plan. | Blocks production deployment. |

---

## 19. Decision log

### Accepted

| Date | Decision | Consequence |
|---|---|---|
| 2026-08-30 | Build Reader Release before live ingestion. | Core UX and schema are validated with deterministic data. |
| 2026-08-30 | Use Next.js, strict TypeScript, Tailwind, PostgreSQL, and Prisma. | One full-stack TypeScript application for MVP. |
| 2026-08-30 | Use pnpm and one lockfile. | Reproducible dependency management. |
| 2026-08-30 | Use Docker Compose PostgreSQL locally. | No local PostgreSQL installation is required. |
| 2026-08-30 | Use `/article/[slug]`. | Resolves route ambiguity. |
| 2026-08-30 | Store one CEFR version per article in V1. | Simpler generation, URLs, and storage. |
| 2026-08-30 | Require human approval before publication. | Generated content remains `DRAFT` until reviewed. |
| 2026-08-30 | Defer embeddings for deduplication. | Start with provider ID, URL, title, and date rules. |
| 2026-08-30 | Do not rely on unlicensed external images. | Use owned placeholders or omit images. |
| 2026-08-30 | Add later-phase tables in their owning migrations. | Avoid a large speculative Migration 001. |
| 2026-08-30 | Include PostgreSQL full-text search in the Launch MVP. | Search ships before launch without a separate search service. |
| 2026-08-30 | Use Vitest/React Testing Library and Playwright/axe. | Test tooling and CI phases are concrete. |
| 2026-08-30 | Use Prisma ORM 7.10.0 with the `prisma-client` generator and PostgreSQL driver adapter in M2. | The stable v7 workflow is pinned in ADR-001; an upgrade to v8 requires a deliberate review. |
| 2026-09-25 | Estimate reading time from English word count at one assumed learner pace of 150 words per minute. | Estimates are consistent across levels. The pace is an assumption to revisit once real reading data exists. |
| 2026-09-25 | Show dates as en-GB calendar dates in `Europe/Istanbul` time. | Server and browser render identical dates for the Turkish-speaking audience. |
| 2026-09-25 | An article is public only when it is `PUBLISHED` and its category is active. | Deactivating a category hides its articles from every public query, not only from navigation. |
| 2026-09-25 | Feature the most recently published article on the homepage. | No editorial featured flag exists until moderation adds one. |
| 2026-09-25 | Run database integration tests separately from unit tests, only through the guarded test-database runner. | `pnpm test` needs no database; `pnpm test:integration` empties the isolated test database before each test and refuses any other database. |
| 2026-09-25 | Render public routes dynamically on every request during the Reader Release. Add caching with explicit invalidation together with publishing in M5. | Readers always see the current database state and builds need no database, at the cost of one query per request. |
| 2026-09-25 | Give category and article routes no loading boundary. | Unknown slugs return a real 404 status instead of a streamed 200; navigating to those routes shows no skeleton. |
| 2026-09-25 | Run browser tests in Google Chrome through Playwright's `chrome` channel, on a desktop and a Pixel 7 viewport. | No Playwright browser download is needed locally; CI installs Chrome before the browser tests. |
| 2026-09-25 | Let the reader keep the reading position itself and disable native scroll anchoring inside it. | Hiding the translation or resizing text behaves the same in every browser, including Safari, which has no scroll anchoring. |
| 2026-09-25 | Use Anthropic Claude as the LLM provider through the official SDK, starting with the M4 contextual dictionary. The model defaults to `claude-opus-5` and is configurable. | The model for each task (dictionary, generation, CEFR checks) is chosen by measured quality, cost and latency (ML roadmap item 3), not assumed. |
| 2026-09-25 | Look up words contextually with Claude behind a provider interface, cache-first in `VocabularyEntry`. Tests and CI use a fixture provider. | Pull-request CI never calls the live model. Every live lookup logs usage, cost and latency. |
| 2026-09-25 | Keep ML code in an `ml/` folder in this repository (ADR-002). | Training and evaluation run locally in Python; production gets no Python service. |
| 2026-09-25 | Train the CEFR classifier on CEFR-SP's Wiki-Auto subset (CC BY-SA 3.0) with its published splits, and evaluate article-level accuracy on a set the user labels. | Commercial use is allowed. SCoRE (non-commercial) and Newsela (restricted) stay out of anything shipped. |
| 2026-09-25 | A dictionary request names a word by its position in a published article, never by free text. | The endpoint cannot serve as a general model proxy, and live lookups are bounded by the distinct words in published sentences: cost grows with content, not traffic. |
| 2026-09-25 | Cache dictionary entries by normalized word, the SHA-256 of the sentence with the word marked, provider, provider version (model plus prompt version) and schema version. | A new model or prompt starts a fresh cache namespace. A word repeated in one sentence keeps separate entries. |
| 2026-09-25 | Call Claude for lookups with low effort, the default adaptive thinking, structured outputs, `fallbacks: "default"`, a cached system prompt, a 15-second timeout and one retry. | A reader gets an answer or a clear failure within about 30 seconds. Refusals are re-run on Anthropic's recommended fallback model. |
| 2026-09-25 | Give IPA in British English and parts of speech from a fixed list of eleven. | Matches the en-GB conventions already used for dates; the card's labels stay consistent. |
| 2026-09-25 | Make each English paragraph one tab stop, with a roving tab index over role-less word spans. | Tab order grows with paragraphs, not words, and screen readers read the article as ordinary prose. |
| 2026-09-25 | Show the lookup card as a top-layer popover beside the word on wide screens and as a bottom sheet below 40rem. | Uses the browser's Popover API for light dismiss, Escape and focus return; no positioning library is needed. |
| 2026-09-26 | Serve word lookups from editorial entries written ahead of time, with no live provider for now (`DICTIONARY_PROVIDER=none` by default in every environment). Claude writes the entries in Claude Code sessions, one per meaning, and records which meaning each ambiguous word has in each sentence; the user reviews samples of the Turkish. | Lookups are instant and cost no API credits. Words without an entry show that they are not in the dictionary yet. The Claude provider stays available behind `DICTIONARY_PROVIDER=anthropic`, and `DICTIONARY_CACHE_ONLY` remains its kill switch. |
| 2026-09-25 | Rate-limit lookups in process memory: 30 a minute per client address (the last `x-forwarded-for` entry) and 60 provider calls a minute per server process. | Limits are per instance and rely on a proxy setting the header. Revisit with the hosting decision; content-bounded cost remains the hard cap. |
| 2026-09-30 | Write the Real English cards by hand as reference data in `prisma/reference/expressions/`, one file per category, drafted by Claude in Claude Code sessions. The user checks the Turkish of every card, and each card records the review date. | Provisioning refuses the whole library while any card is unreviewed, so production only gets Turkish a native speaker has checked. The cards' CEFR levels are editorial estimates, not labels, and are never evaluation data. |
| 2026-09-30 | Give phrases that belong to no topic, such as "thanks to", a card with no category. | They appear in the articles that use them but on no category page, so each category page stays about its topic. |
| 2026-09-30 | Record demo expression occurrences by their exact wording ("sold out" for "sell out"), not by the card's form. | The phrase matcher does not inflect words. Phrasal verbs split by their object, such as "cutting their routines down", are not marked, because one clickable unit would swallow the words in between. |
| 2026-10-03 | Open an expression's card from data the article page already holds, in the word card's popover or bottom sheet, and mark expressions with a dotted underline. | Opening a card sends no request and cannot fail. The article query returns each paragraph's marks and one card per expression, so the page needs no second query. |
| 2026-10-03 | Show Real English lists, at the end of an article and on a category's expression page, as native disclosure rows: the expression, type, level and Turkish meaning, opening to the rest of the card. | The lists work without JavaScript and stay short to scan; the "checked by a native Turkish speaker" note appears once under each list. |
| 2026-10-03 | Curate 6 to 8 key words per demo article from the editorial dictionary: each `ArticleVocabulary` row points at the entry for the word in its sentence, and the demo dictionary seed drops and restores those links so the entries are always rewritten from the fixtures. | Key vocabulary adds no new Turkish to review, and a corrected dictionary entry reaches the database on the next seed. Words inside marked expressions are not chosen, because the reader cannot open them on their own. |
| 2026-10-03 | When a card fits neither below nor above its word, place it below and scroll the page just enough to show it, keeping the word visible. | Expression cards are taller than word cards; on a short window they no longer open partly off-screen. |
| 2026-09-30 | Let the library own its cards' category links: provisioning replaces a card's links with the library's. | A card taken off a category page in the library leaves it in every database. Links added to library cards by other means would be replaced; revisit if M5 adds editing of category pages. |
| 2026-10-14 | Budget article pages for the longest article the product spec allows, C1 at 900 English words: at most 600 elements plus one per English word, a 50 KB HTML download and 175 KB of JavaScript, all compressed; in the phone profile, at most 200 ms of blocking while loading and 100 ms of script per tap (§17). Claude proposed the limits from measurements, and the user left the numbers to Claude. | A browser test enforces the size limits on every demo article. Timings are measured again when M7 sets article lengths and before launch. |
| 2026-10-14 | Authenticate admins with Better Auth: an email, a password and an authenticator-app code, with public sign-up disabled and sessions in PostgreSQL (ADR-003). Chosen by the user. | No third-party service or host dependency. M5 starts by confirming that Better Auth's Prisma adapter works with Prisma 7.10.0. |
| 2026-10-24 | Pin Better Auth 1.7.12 and use its minimal build, without Kysely, with the Prisma adapter running multi-row changes in transactions. Its five tables keep Better Auth's model names, and Better Auth generates their IDs. CHECK constraints keep emails in lower case and give every password login a password. | Confirmed the adapter with Prisma 7.10.0 (ADR-003). Better Auth checks the generated Prisma client against its schema at startup, so a missing column stops it instead of failing a query later. |
| 2026-10-24 | Give `User` a nullable `role` whose only value is `admin`, set only by the admin command; Better Auth never writes it (`input: false`). The access check also requires an authenticator app. | A sign-up switched on by mistake, or reader accounts later, get no admin access. |
| 2026-10-24 | Set up an admin's authenticator app in the admin command, through Better Auth's own two-factor endpoints, not on a page. Better Auth gets no HTTP route handler (next row but one). | No request can add or remove an authenticator, so a stolen password alone opens nothing. Recovery needs database access, as ADR-003 requires. |
| 2026-10-24 | Require admin passwords of at least 12 characters, above Better Auth's default of 8. Outside production, a blank `BETTER_AUTH_SECRET` falls back to a development-only secret; production refuses a missing secret and that one. | Local work and tests need no setup, as with the development-only database password, and a production start without its own secret fails clearly. |
| 2026-10-24 | Run sign-in, the code check and sign-out as server actions, with Better Auth's `nextCookies` plugin writing the cookies, and mount no `/api/auth` route handler. Failed passwords are limited to 10 per email address and 20 per client in 15 minutes, and failed codes to 20 per client, in memory; Better Auth itself locks an account for 15 minutes after ten wrong codes. | Better Auth has no HTTP endpoints, so no request reaches its other routes, such as setting up two-factor sign-in. Next.js checks every server action's origin, and the forms work without JavaScript. Better Auth's own rate limiter guards only its HTTP routes, so the project's limiter takes over; it counts failures only, so a correct sign-in never slows an admin down. |
| 2026-10-25 | Moderation rules: publishing starts only from `DRAFT`; archiving from `DRAFT`, which rejects it, or `PUBLISHED`; restoring takes `ARCHIVED` back to `DRAFT`; category and level edits work on `DRAFT`, `PUBLISHED` and `ARCHIVED`, into an active category. Every action but publishing needs a reason, and republishing keeps the first publication date. | One small table of rules that the server enforces and the admin pages read. Pipeline statuses stay with M6 and M7, and a restored story does not reappear at the top of the homepage as if new. |
| 2026-10-25 | Make `ModerationEvent` append-only with a database trigger, and refuse to delete an article or admin that an event names. | The audit trail holds even against a bug or a hand-written query; only the test-database reset, which truncates, empties it. |
| 2026-10-25 | Check publication on the server with `publicationProblems`: a title, an active category, complete attribution, paragraphs numbered from 1 with both languages, a word count and reading time that match the English, and expression marks that still match their words. | The database refuses blank text and missing columns but cannot compare fields with each other. Generated drafts (M7) will pass the same check. |
| 2026-10-25 | Keep public pages rendered on every request for now. The caching with invalidation that was to arrive with publishing (2026-09-25) waits for hosting (M8) and a measured need. | With no host or traffic yet, one query per request costs little, while a missed invalidation would leave an archived article public, which is the very error moderation exists to prevent. Admin actions will still refresh the pages they change. |
| 2026-10-25 | List admin articles newest story first, filtered by status and category in the URL, 50 at a time with the total shown. Each filter's choices are counted within the other filter, and the rows and counts come from one `REPEATABLE READ` snapshot, read in an interactive transaction. | The counts always agree with the rows, even while another admin acts. Prisma 7.10 sends a batch `$transaction` that holds a single query without a transaction, dropping its isolation level, so the list uses the interactive form, which always opens one. |
| 2026-10-25 | Preview articles through the public page's own body, moved into `ArticleView`, from an admin query that reuses the reader's select and mapping but loads any status. Word lookups stay limited to public articles. | A draft looks exactly as it will once published, and the two views cannot drift apart. Looking up a draft's words would need the dictionary route to recognise admins; the preview says lookups start once the article is on the site. |
| 2026-10-25 | Run the moderation forms as server actions instead of the `/api/admin/articles/[id]/…` handlers in §7.3. Each calls `requireAdmin()` first, then the workflow. A refusal stays on its form; a success refreshes every admin and public path that shows the article with `revalidatePath`, then reloads the article's page with a notice. | The forms work without JavaScript, and Next.js checks each action's origin, as with sign-in. While pages render on every request, `revalidatePath` changes nothing visible; it keeps the pages right once caching arrives. The workflow's success result now names the article's slug and categories for it. |
| 2026-10-25 | Give each Playwright project its own copies of the demo draft for the tests that publish and archive, reset before each test, and leave the seeded draft to the list tests. | The desktop and phone runs share one database and run at once, other specs read the demo articles, and a retry starts from the same state. Audit rows from an earlier attempt stay, so the tests check that exactly one row was added. |
| 2026-10-27 | Write articles in Claude Code sessions instead of ingesting and generating them: explainers written from general knowledge with listed references, and adaptations of GOV.UK stories picked by hand. The user reviews every article before publishing it. Chosen by the user: Newslingo is a small, non-commercial project with no budget for a lawyer, a paid news API or paid model calls. | M6–M8 are on hold, and milestone W comes between M5 and M9. Articles cost no API calls, as with the editorial dictionary, and arrive in batches as fast as they can be written and reviewed. |
| 2026-10-27 | Use GOV.UK news under the Open Government Licence v3.0 as the only news source, with stories picked by hand (ADR-004). Each adaptation credits the department and GOV.UK and shows the licence statement. | No key, contract or fee. A rough count over four weeks found GOV.UK covers AI, Technology, World and Business thinly and from the UK government's point of view, about two AI stories a week, so explainers fill the gaps and cover the other categories. |
| 2026-10-27 | Give every article a kind: news, adapted from one source, or an explainer, written from general knowledge with listed references. Readers see which kind they are reading. | Explainers have no single source, so their source fields become optional for that kind only, and the "About this article" box and the publication check change with them (W). |
| 2026-10-27 | Keep the six existing categories: AI, Technology, World, Business, Entertainment and Beauty. Chosen by the user. | Every category already has its Real English cards. GOV.UK has no Entertainment or Beauty news, so those two get explainers only. |
| 2026-10-27 | Approve the sensitive-news policy, and skip every subject it holds for review instead of holding it, until the user decides otherwise. Chosen by the user. | No war, disaster, election, crime, health, religion or migration stories, no story that mentions Turkey, Cyprus or the PKK, and no product launches. The Turkey default needs no lawyer while those stories are skipped, and the question of held subjects at A2 does not arise. |
| 2026-10-27 | Date every article with a required `datedAt`: its source's publication time for news, which a CHECK constraint enforces, and the day it was written for an explainer. Lists sort and filter by it, and the reader shows it. | Explainers sort among news by their own date with no special case in any query. `sourcePublishedAt` stays as news lineage, shown in the admin preview. |
| 2026-10-27 | Import written articles from files in one transaction per batch, comparing each stored article with its file. A new file becomes a draft, a changed draft is rewritten, and a changed file for a published or archived article refuses the batch. Dictionary entries are added and corrected, never removed, by both the import and the demo seed. | The file is the source of truth for a draft: an admin's category or level change on a draft is replaced on the next import, so it must be made in the file too. A dictionary correction reaches published articles at once, as a Real English card correction does. Entries left over from changed demo sentences stay in development databases, where nothing looks them up. |
| 2026-10-27 | Rotate A2, B1, B2 and C1 within each category, and write A2 at 150–250 English words, B1 at 250–350, B2 at 300–450 and C1 at 450–650, never more than 900. Accepted by the user as proposed. | Every level appears in every category. Lengths stay close to the demo articles and within the page budget (§17). |
| 2026-10-28 | Start the first batch with a pilot of two articles, one GOV.UK story and one explainer, and write the other four after the user has reviewed them. Chosen by the user. | The pilot tests writing, import, review and publishing on real content before the rest of the batch. It also measured the work: the editorial dictionary, written for the six demo articles, covered only 24–39% of the distinct words in five recent GOV.UK stories, and the pilot's articles needed 55 and 31 new entries, which took most of the writing time. Coverage grows with every article. |
| 2026-10-31 | Host the public site on GitHub Pages as a static site, built by a GitHub Actions workflow on every push to `main`, at `https://balimkonuksever.github.io/newslingo/`. Production has no server or database: each build creates a temporary database from the repository, and the admin runs only on the user's computer. An approved article's file is marked published, and the article goes live when that change is merged. Chosen by the user. | It costs nothing, leaves nothing online to secure or back up, and fits articles that already live in the repository. The repository must become public, since GitHub Free offers Pages only for public repositories. Word lookups read a static file per article instead of `POST /api/dictionary`; the homepage filters and search run in the browser; PostgreSQL full-text search, the contextual Claude lookup and publishing from an online admin wait until the site has a server, which M6–M8 would also need if they resume. |
| 2026-11-01 | Give every page of the static site a content security policy in a `<meta>` tag, written after the build: the site's own files only, no inline styles, and the page's inline scripts by their SHA-256 hashes. Set the referrer policy to `same-origin`. | A script injected into a page does not run, and nothing loads from another origin. Nonces would need a server. Clickjacking protection (`frame-ancestors`) needs a response header, which GitHub Pages cannot send. The local server has no policy. |
| 2026-11-01 | Check the built site at the end of every `pnpm site:build`, refusing the build if it holds anything but the written articles marked published, or the admin, the dictionary endpoint, a demo article, a draft, server settings or source maps. | CI checks every pull request, and a failed check deploys nothing. The check depends on the written-article and demo fixture lists, so a demo or draft slug can never ship by mistake. |
| 2026-11-01 | Update Next.js from 16.3.3 to 16.3.8 and zod from 4.5.2 to 4.6.7 for their security fixes. Leave Next.js 16.4 for its own change. | Three Next.js advisories remain until 16.4.1: the image optimization API and `use cache`, which the project does not use, and Server Actions, which only the local admin runs. None reaches the static site. Next's agent-file writer is unchanged in 16.3.8, so the loader layout holds. |
| 2026-11-12 | Let İznik flowers grow into every page from both sides on screens at least 86rem wide: a spray in each top corner and a vine down each margin, fading out towards the page, with tulips, carnations, hatayi and penç flowers, saz leaves, hyacinths and çintemani pearls, after the İznik tiles of the user's reference board. Tile-like bands across the top, bottom and sides, and then a garland hanging along the top, were tried first: the user found the bands looked like tape and the garland drew too much attention. Fading the vines out down the page was also tried; the user preferred them to fade towards the text. The site's name also gained an İznik plate mark, a hatayi in a beaded cobalt rim, and a larger wordmark, after the user asked for a more striking logo. `scripts/draw-motifs.ts` draws the flowers from geometry; no artwork is traced or copied. Asked for by the user. | The flowers are CSS backgrounds from two of the site's own SVG files, so pages gain no elements, markup or script (§17), and the content security policy needs no `data:` images. The site check now refuses any SVG file holding a script, an event handler, HTML or a link to another file, since an SVG opened on its own carries no policy. Print and forced-colours modes hide the flowers, and narrower screens have none. The header's and footer's rules now span the page's width rather than the window's, clear of the vines. |

### Open decisions

| Decision | Needed by | Default recommendation |
|---|---|---|
| News source and usage rights | Before M6 | Resolved on 2026-10-27: GOV.UK news under the Open Government Licence v3.0, picked by hand (ADR-004). |
| Image policy/provider | Before using production images | Omit unless rights are explicit. |
| AI provider/model | Before M7 | Provider decided on 2026-09-25 (Claude). Still open: the model for each task, chosen by the ML roadmap's comparison. M7 has been on hold since 2026-10-27, so this waits with it. |
| Dictionary fallback | Before live M4 integration | Resolved on 2026-09-25: contextual Claude lookup, cache-first (see Accepted). |
| Admin authentication | Before M5 | Resolved on 2026-10-14: Better Auth with an email, a password and an authenticator-app code (ADR-003). |
| Hosting and managed PostgreSQL | Before M9 | Resolved on 2026-10-31: GitHub Pages, a static site with no production database. |
| Scheduler | Before M8 | On hold with M8. |
| CEFR assignment mix and verification rule | Before W's first batch | Mix resolved on 2026-10-27: in each category, rotate A2, B1, B2 and C1 so every level appears. Still open: the independent level check, which waits for the CEFR classifier. |
| Target length per level | Before W's first batch | Resolved on 2026-10-27: A2 150–250 English words, B1 250–350, B2 300–450, C1 450–650, never more than 900. |
| Categories | Before W's first batch | Resolved on 2026-10-27: the six existing categories stay. |
| Moderation cadence and freshness SLA | Before M8 | On hold with M8. |
| Active-content archival duration | Before M8 | On hold with M8. Written articles stay published until an admin archives them. |
| AI daily budget and batch limits | Before M7/M8 | On hold with M7 and M8: written articles use no paid API. |
| Editorial policy for sensitive news | Before W's first batch | Resolved on 2026-10-27: `docs/editorial/sensitive-news.md` approved, with held subjects skipped for now. Its audience question stays open; proposed: adults. |
| Launch inventory | Before M9 | Proposed: 3–5 reviewed articles per category at launch, growing toward the 10–15 target. |

---

## 20. Delivery slices for the Reader Release

These slices are intended to keep changes reviewable and independently verifiable.

### Slice 1 — Scaffold and project hygiene

- Git, ignores, Next.js, strict TypeScript, Tailwind, pnpm pinning.
- Environment validation skeleton.
- Lint/typecheck/build scripts.
- Vitest smoke-test foundation.
- Prisma-workflow ADR for M2.
- Minimal CI skeleton if practical.

Gate: clean install and production build.

### Slice 2 — PostgreSQL and reader-core schema

- Docker Compose.
- Prisma configuration and Migration 001.
- Database scripts and typed client.
- Constraint integration tests.

Gate: empty database migrates and schema tests pass.

### Slice 3 — Fixtures, seed, and queries

- Six categories and six or more bilingual articles.
- Idempotent seed.
- Reading-time/date helpers.
- Server-only query modules and integration tests.

Gate: repeated seed is stable and queries return correct ordered data.

### Slice 4 — Editorial shell and discovery

- Design tokens and shared layout.
- Article cards/category sections.
- Homepage and category pages.
- URL-backed category/difficulty/reading-time/date filters.
- Loading/empty/404 behavior.

Gate: home-to-category journey passes desktop/mobile E2E.

### Slice 5 — Article reader

- Article metadata and attribution.
- EN/TR paragraph pairs.
- Translation and font-size controls.
- Article metadata/SEO baseline.
- Reader responsive/accessibility QA.

Gate: complete Reader Release definition of done passes.

---

## 21. Definitions of done

### 21.1 Reader Release complete

- A fresh checkout has documented setup.
- PostgreSQL starts through the supported local workflow.
- Migrations and seed are repeatable.
- Six categories and at least six bilingual articles exist.
- Homepage, category, and article routes use database data.
- Homepage category/difficulty/reading-time/date filters use validated shareable URLs.
- Every article displays ordered English/Turkish paragraph pairs.
- Translation visibility and font-size controls work.
- Difficulty, reading time, date, category, source, and source link render correctly.
- Loading, empty, error, and not-found states exist.
- Desktop/mobile layouts and keyboard navigation pass QA.
- No non-functional future controls are visible.
- Formatting, lint, typecheck, tests, schema validation, and production build pass.

### 21.2 Launch MVP complete

- Every chosen category holds the approved launch inventory.
- Every eligible English word supports contextual lookup.
- Known multi-word expressions take precedence over word tokenization.
- Article and category Real English sections work.
- Every launch category contains at least 10 reviewed expressions.
- Curated article vocabulary is persisted and displayed.
- Word lookups, loading and error behavior work on the static site; the cache, fallback and rate limit work locally.
- Admin authentication and audited moderation work on the user's computer.
- Written articles import idempotently as drafts: explainers with their references, GOV.UK adaptations with their source and licence.
- The user reviewed every published article, and readers can tell explainers from news.
- The inventory meets the approved level mix. An independent level check follows once the CEFR classifier exists.
- Invalid imports are refused, and the publication check stops incomplete articles.
- Human review controls publishing and rejection: an article goes live only when its reviewed file is marked published and merged, and a correction is a reviewed change to its file.
- Search covers title, summary, category, body, and source.
- Source attribution and provenance are complete.
- Security, accessibility, SEO, mobile, and rollback gates pass on the deployed site.
- A bad article can be removed within one site build, by removing its publication mark or reverting its merge.

Until 2026-10-27 this list also required provider imports, AI-generated drafts, scheduled runs, a moderation backlog and freshness SLA, and generation kill switches. They wait with M6–M8.

---

## 22. Immediate next actions

Slices 1–5 are complete, and with them the Reader Release (M1–M3). On 2026-09-25 a native Turkish speaker reviewed the demo translations in `prisma/fixtures/articles.ts` and found them correct. The reader also passed a manual check on a real phone, covering filters, the translation and text-size controls, landscape, and larger text.

**M4, contextual vocabulary and Real English, is complete.** Built: the text-analysis layer, the vocabulary and expression schema, `POST /api/dictionary` with editorial entries for every word of the six demo articles (`prisma/fixtures/dictionary/`, validated by `prisma/editorial-dictionary.ts`) and an optional Claude provider, clickable words and expressions with a desktop popover, a mobile bottom sheet and keyboard access, 97 reviewed Real English cards with 30 occurrences marked in the demo articles, the article's "Key vocabulary" and "Real English" sections, and the category expression pages. The page budget was set and met on 2026-10-14 (§17). On 2026-10-24 the user reviewed the editorial dictionary's Turkish from the sheet in `docs/reviews/2026-10-14-editorial-dictionary.md`, all 42 key vocabulary words plus 40 entries drawn at random: 81 were correct, and “atmosphere” gained “atmosfer”. The same day the reader passed a manual check on the user's phone: words, marked expressions, both lists and the category expression page, which closed the exit gate.

**M5, moderation, is complete.** On 2026-10-24 Better Auth 1.7.12 was pinned and its Prisma adapter confirmed with Prisma 7.10.0 (ADR-003), then the `admin` role, the server-only access check and the admin command were built, followed by sign-in at `/admin/sign-in` (a password, then an authenticator code or a backup code) and an admin home at `/admin`. On 2026-10-25 the server side of the moderation workflow followed: the append-only audit record, the status rules, the publication checks, the demo draft, and the publish, archive, restore and edit functions. The admin pages were built the same day and merged on 2026-10-26: the admin home's counts by status, the article list filtered by status and category, and each article's preview through the public reader with its source details, history and the actions its status allows, all with browser tests on desktop and phone. On 2026-10-26 the user tried the admin pages with their own admin and confirmed the exit gate.

**On 2026-10-27 the plan changed course.** Research for M6 found no free news source that covers all six categories and allows adaptation without a licence or a lawyer's opinion. GOV.UK news allows it (ADR-004), but covers only AI, Technology, World and Business, and thinly. Articles are now written in Claude Code sessions, explainers plus GOV.UK stories picked by hand, and M6–M8 are on hold (§19, 2026-10-27).

**Milestone W, written articles, is under way.** The four decisions its first batch needed were settled the same day (§19): the six categories stay, the sensitive-news policy is approved with held subjects skipped for now, each category rotates A2 to C1, and each level has a target length. W's code, the article kind, the reader and admin changes and `pnpm articles:import`, was merged by 2026-10-28. The first batch began that day with a pilot of two articles, imported as drafts for the user's review: the Competition and Markets Authority's decision on Aldi and Lidl (Business, B1, a GOV.UK story) and “How Subtitles Work” (Entertainment, A2, an explainer). The user reviewed both on 2026-10-30, the facts, the Turkish and every new dictionary entry, and found nothing to change (`docs/reviews/2026-10-28-*.md`). The other four were written on 2026-10-31 and imported as drafts for the user's review, each with a dictionary review sheet: “How Perfume Is Made” (Beauty, A2, an explainer from Britannica), the UK's space clean-up mission (Technology, B1), the Chancellor's plan for AI (AI, B2) and the UK's call for a reset of the global financial system (World, C1), the last three GOV.UK stories. The user reviewed and approved the four the same day, with nothing to change, so all six articles of the first batch now carry the publication mark and are published by the import; they go live with the static site (M9).

**On 2026-10-31 the user chose GitHub Pages for the live site** (§19): a static site rebuilt from the repository on every merge to `main`, with no server or database in production. Publishing therefore moves into the article files: an approved article is published by a mark in its file (W) and goes live with the static site (M9). The mark was built the same day, and the pilot's two articles carry it; publishing in the local admin only previews what the site will show. On 2026-11-01 the static site itself was built: `pnpm site:build` and the Pages workflow, which deploys once the repository is public. Search in the browser followed the same day, and then the pre-launch security review (`docs/reviews/2026-11-01-security-review.md`): every page now carries a content security policy, every site build checks that it holds nothing that must not be published, and Next.js and zod were updated. Before the repository becomes public, the user decides whether to keep the personal email address its commits record. The rest of the release hardening in M9 comes next.

Do not build live news ingestion or automated AI generation while M6–M8 are on hold.
