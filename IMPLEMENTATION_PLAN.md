# Newslingo Implementation Plan

> Status: Working draft  
> Last updated: 2026-09-25  
> Product specification: `bilingual_news_english_learning_plan.md`  
> Immediate target: seeded bilingual Reader Release  
> Launch target: automated ingestion and draft generation with moderated publication

## 1. Purpose

This document converts the product specification into an executable engineering plan. The product specification remains the source of truth for product intent; this file defines implementation order, technical boundaries, dependencies, quality gates, and completion criteria.

The plan intentionally separates two outcomes:

1. **Reader Release** — a polished bilingual reading experience backed by deterministic seed data.
2. **Launch MVP** — contextual vocabulary, Real English expressions, moderation, licensed news ingestion, validated AI adaptation, and scheduled operation.

This separation prevents the ingestion and AI pipeline from hiding usability or data-model problems in the core reader.

### How to use this plan

- Implementation milestones M1–M9 follow their dependency order unless the dependency map explicitly permits parallel work.
- M0 is a rolling decision track: an open decision blocks only the milestone that names it as a dependency, and all M0 items must close before launch.
- A milestone is complete only when its exit gate passes.
- Deferred features should not appear as non-functional controls in the UI.
- New scope requires an explicit update to the scope matrix and decision log.
- Applied database migrations are never edited; changes are introduced through new migrations.

---

## 2. Product outcome

Newslingo helps Turkish speakers improve their English by reading current news in a modern editorial experience.

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
- Clear source attribution and a link to the original source on every article.
- At least 10 reviewed Real English expressions per category at launch, growing toward the product target of 10–30.
- A documented CEFR distribution target so the inventory does not collapse into one level.

---

## 3. Current repository baseline

As of 2026-09-25, M1–M3 are complete, which makes up the Reader Release. The repository contains:

- the Next.js/TypeScript/Tailwind scaffold with pinned Node and pnpm, one lockfile, and lint, format, typecheck, Vitest, and build commands
- Docker Compose PostgreSQL 18 with isolated `newslingo` and `newslingo_test` databases
- Prisma ORM 7.10.0 (ADR-001), the reader-core migrations, and a server-only client
- idempotent reference provisioning for the six categories and a local-only demo seed of six bilingual articles
- server-only queries for the homepage, filters, categories, and articles
- the editorial homepage with URL-backed filters, category pages, and the bilingual article reader
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
| Runtime | Node runtime for Prisma-backed pages and handlers | Accepted | Prisma/database access should not depend on Edge constraints. |
| Database | PostgreSQL with Prisma | Accepted | Matches the product plan and future search/transaction needs. |
| Local database | Docker Compose | Accepted | Reproducible without a locally installed PostgreSQL server. |
| Public article route | `/article/[slug]` | Accepted | Resolves the specification's `/article` versus `/news` inconsistency. |
| Article difficulty | One CEFR level per article in V1 | Accepted | Lower generation cost and simpler storage. |
| Publication | Generated content enters `DRAFT` | Accepted | Prevents unsafe automatic publishing. |
| Launch moderation | Human approval required | Accepted | Reduces factual, translation, and copyright risk. |
| Seed data | PostgreSQL seed data, not a parallel mock-data path | Accepted | Ensures the first release exercises real queries and relationships. |
| Images | Local owned placeholders or no image by default | Accepted | Avoids unclear external image rights. |
| Deduplication | URL and normalized-title rules first | Accepted | Embeddings are deferred until evidence shows they are necessary. |
| Processing | Sequential jobs are acceptable initially | Accepted | A dedicated queue is premature for MVP volume. |
| Search | Not a Reader Release requirement | Accepted | It does not block validation of the core reader. |
| Search at launch | PostgreSQL full-text search | Accepted | Search is in the product MVP; a separate search service is unnecessary initially. |
| Prisma workflow | Prisma ORM 7.10.0 with `prisma-client`, `prisma.config.ts`, and the PostgreSQL driver adapter | Accepted | ADR-001 pins the stable M2 generator, runtime, migration, and seeding workflow. |
| News provider | One licensed RSS/API provider | Open | Licensing must be confirmed before ingestion work. |
| AI provider/model | Anthropic Claude through the official SDK, `claude-opus-5` by default | Provider accepted | Structured outputs are supported. The model for each task is chosen by measured comparison (ML roadmap item 3) before M7. |
| Dictionary fallback | Contextual Claude lookup, cache-first | Accepted | Word plus sentence gives the contextual Turkish sense; results are cached in `VocabularyEntry`. |
| Admin authentication | Provider/mechanism to be selected | Open | Must be resolved before the admin milestone. |
| Hosting/database | Provider-neutral until deployment planning | Open | Does not block local Reader Release work. |
| Scheduler | Vercel Cron or Trigger.dev | Open | Depends on hosting and operational needs. |
| CEFR inventory mix | Assignment and verification policy to be defined | Open | Production generation needs an explicit level target and balance rule. |

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
| Protected admin moderation | | ✓ | |
| One licensed news provider | | ✓ | |
| Idempotent ingestion | | ✓ | |
| AI educational rewrite and translation | | ✓ | |
| Scheduled processing | | ✓ | |
| SEO, accessibility, security hardening | Baseline | ✓ | |
| PostgreSQL full-text search | | ✓ | |
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
- `src/server`: server-only database and external-service integrations.
- `src/domain`: shared schemas and domain contracts where a real boundary exists.
- `src/jobs`: scheduled orchestration added only when ingestion begins.
- `prisma`: schema, migrations, deterministic fixtures, and seed entry point.

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

Reserved but disabled until their product phases:

- `/saved`
- `/vocabulary`

These routes should return 404 or remain absent; they should not present fake functionality.

### 7.2 Admin routes

Added during the moderation milestone:

| Route | Responsibility |
|---|---|
| `/admin` | Operational summary and failure counts. |
| `/admin/articles` | Filtered article list; raw-candidate views are added in M6. |
| `/admin/articles/[id]` | Preview, source lineage, generation attempts, moderation actions. |
| `/admin/jobs` | Ingestion/generation runs and failures. |

Authentication and authorization must protect both the pages and their server actions/handlers.

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

---

## 8. Data model and migration roadmap

### 8.1 Migration policy

- Migration 001 contains only the reader-core schema.
- Each later feature adds its models in the milestone that owns them.
- Never edit a migration that has been applied outside an isolated local reset.
- Production-safe reference provisioning uses stable identifiers/slugs, is idempotent, and contains categories plus approved expression-library content only.
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

- `ModerationEvent`: actor, action, reason, before/after snapshot, timestamp.
- `User`: added only after the auth solution is selected.
- `SavedArticle`, `SavedWord`, and `ReadingProgress`: user learning state.
- `Quiz`, `QuizQuestion`, `QuizAttempt`: quiz feature.
- `AudioAsset`: article/paragraph/word TTS metadata.
- PostgreSQL search vector and GIN index: explicit SQL migration in M9.

---

## 9. Proposed directory structure

```text
newslingo/
├── .github/
│   └── workflows/
│       └── ci.yml
├── prisma/
│   ├── migrations/
│   ├── fixtures/                 # development/test data only
│   │   ├── articles.ts           # demo articles
│   │   ├── dictionary/           # editorial entries for their words (M4)
│   │   ├── expression-occurrences.ts  # where cards occur in them (M4)
│   │   └── key-vocabulary.ts     # each article's key words (M4)
│   ├── reference/                # production reference data
│   │   ├── categories.ts
│   │   └── expressions/          # Real English cards, one file per category (M4)
│   ├── editorial-dictionary.ts   # checks and rows for the dictionary entries
│   ├── expression-library.ts     # checks and rows for cards and occurrences
│   ├── key-vocabulary.ts         # checks key words and keys them to entries
│   ├── schema.prisma
│   ├── seed.ts                   # CLI: reference | demo | all
│   └── seeders.ts                # seeding logic shared with tests
├── public/
│   └── images/
│       └── seed/                 # owned/licensed local assets only
├── scripts/
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
│   │   ├── admin/                # moderation milestone
│   │   ├── api/                  # added by owning feature phases
│   │   │   └── dictionary/route.ts   # POST: one word lookup (M4)
│   │   ├── error.tsx
│   │   ├── global-error.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── article/
│   │   │   ├── article-reader.tsx    # client: controls + reading position
│   │   │   ├── paragraph-pair.tsx
│   │   │   ├── reading-anchor.ts
│   │   │   └── source-attribution.tsx
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
│   │   │   ├── site-footer.tsx
│   │   │   └── site-header.tsx
│   │   └── ui/                   # shared class lists only
│   ├── domain/                   # boundary schemas/types as needed
│   │   ├── dictionary.ts
│   │   └── expressions.ts        # Real English cards and marks for the reader
│   ├── generated/prisma/         # generated and ignored
│   ├── jobs/                     # scheduled orchestration later
│   ├── lib/
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
│       ├── categories/queries.ts
│       ├── db/client.ts
│       ├── dictionary/           # contextual lookup (M4)
│       │   ├── anthropic-provider.ts
│       │   ├── config.ts         # provider and limits from the environment
│       │   ├── fixture-provider.ts
│       │   ├── log.ts            # outcome, latency and cost lines
│       │   ├── lookup.ts         # cache-first lookup service
│       │   ├── provider.ts
│       │   └── rate-limit.ts
│       ├── ingestion/            # ingestion milestone
│       │   └── providers/
│       └── ai/                   # generation milestone
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

Later milestones add variables only when required:

```env
NEWS_API_KEY=
CRON_SECRET=
ADMIN_AUTH_SECRET=
```

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
```

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
       │               ▼                   │
       │            M6 Ingestion +         │
       │            candidate admin        │
       └───────────────┼───────────────────┘
                       ▼
                 M7 AI generation
                       ▼
                 M8 Scheduled operation
                       ▼
                 M9 Search and hardening
                       ▼
                     Launch
```

The Reader Release consists of M1–M3. M0 is not a sequential implementation milestone: decisions about providers, authentication, or hosting may remain open while unrelated work proceeds, but each must close before the milestone that names it as a dependency.

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
- [ ] Select a news provider and document:
  - commercial/derivative-content rights
  - permitted source content depth
  - attribution requirements
  - image-use rights
  - request limits
  - content retention restrictions
- [ ] Define the editorial adaptation policy:
  - no extensive source wording
  - no invented facts or quotations
  - accurate names, dates, quantities, and claims
  - natural Turkish translation
  - required attribution
  - unsuitable/sensitive-news handling
- [ ] Select the AI provider/model and confirm structured-output support. Provider selected on 2026-09-25: Anthropic Claude, with structured outputs. The model for each task is still to be chosen by measured comparison.
- [x] Select the contextual dictionary fallback: a contextual Claude lookup, cache-first (2026-09-25).
- [x] Select admin authentication: Better Auth with an email, a password and an authenticator-app code, for admins only (2026-10-14, ADR-003).
- [ ] Select hosting, managed PostgreSQL, and scheduler.
- [ ] Set operational limits:
  - candidates fetched per run
  - articles generated per run/day
  - retry count
  - AI budget ceiling
  - job frequency
  - active-content and archive policy
- [x] Confirm PostgreSQL full-text search as Launch MVP scope.
- [x] Select and document the compatible Prisma workflow before M2.
- [ ] Define the production CEFR assignment mix and shortage-filling rule.
- [ ] Define mandatory finished-article difficulty verification.
- [ ] Define the moderation cadence, maximum draft backlog, and public-freshness SLA.
- [ ] Define launch-blocking quality metrics.

### Dependencies

None. Provider licensing blocks M6; other unresolved decisions block their named milestones rather than the Reader Release.

### Deliverables

- Updated decision log in this document.
- Approved provider-rights record.
- Content adaptation policy.
- Service and hosting selections.
- Documented cost and operational limits.

### Exit gate

M0 is complete only when every launch-critical decision has an accepted result. Before any dependent milestone starts, its named M0 choices must be closed; provider usage rights and the sensitive-content policy must be approved before M6.

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

- [ ] Add admin authentication and role authorization.
- [ ] Protect both admin pages and server actions/handlers.
- [ ] Add `ModerationEvent` or an equivalent audit record.
- [ ] Define allowed state transitions server-side.
- [ ] Add a deterministic non-public draft fixture for admin workflow tests.
- [ ] Build an admin article list with status and category filters.
- [ ] Build an article preview using the public reader components.
- [ ] Show article source metadata.
- [ ] Implement safe actions:
  - publish a valid draft
  - archive/unpublish
  - adjust category/difficulty under policy
- [ ] Prefer archive over destructive deletion for published content.
- [ ] Do not show ingestion/regeneration controls until those actions exist.
- [ ] Record actor, action, reason, and timestamp for material changes.
- [ ] Add failure-safe user feedback without leaking secrets or stack traces.

### Verification

- Unauthenticated users cannot access pages or invoke actions directly.
- Invalid workflow transitions fail atomically.
- Draft preview matches the public article view.
- Publish/archive actions are persisted and auditable.
- Published articles cannot be edited into invalid EN/TR alignment.

### Exit gate

Only authorized admins can move content through the lifecycle, and no article can reach `PUBLISHED` without server-side validation and an auditable action.

---

## M6 — Licensed news ingestion

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

## M9 — Search, release hardening, and launch

### Goal

Turn the staging system into a secure, accessible, observable, and reversible production release.

### Work items — MVP search

- [ ] Add an explicit PostgreSQL migration for a search document/vector and GIN index.
- [ ] Index title, summary, category, article body, and source with sensible weights.
- [ ] Build a validated, URL-backed search query and results surface.
- [ ] Return published articles only.
- [ ] Handle empty queries, no results, Turkish/English text, and pagination/limits.
- [ ] Add ranking/latency integration tests at launch volume and separate index-eligibility tests with a sufficiently large synthetic corpus.
- [ ] Keep external search services deferred until PostgreSQL search is proven insufficient.

### Work items — security

- [ ] Review admin and cron authorization.
- [ ] Confirm all secrets are server-only.
- [ ] Rate limit dictionary and sensitive admin actions.
- [ ] Restrict provider URLs and redirects.
- [ ] Sanitize or discard source HTML.
- [ ] Validate all route parameters and external payloads.
- [ ] Apply CSRF/session protections appropriate to the selected auth solution.
- [ ] Confirm error messages expose no secrets or raw stack traces.

### Work items — accessibility

- [ ] Test keyboard navigation and focus recovery.
- [ ] Test popover and bottom-sheet screen-reader behavior.
- [ ] Validate heading order and landmark structure.
- [ ] Validate contrast, zoom, and text resizing.
- [ ] Validate interactive word/expression semantics.
- [ ] Test the longest supported article at mobile and desktop sizes.

### Work items — performance and SEO

- [ ] Confirm no dictionary calls occur on initial render.
- [ ] Profile the DOM and hydration cost of long tokenized articles.
- [ ] Cache safe public queries appropriately.
- [ ] Optimize fonts and mobile loading.
- [ ] Add canonical URLs, metadata, OpenGraph fallback, and Article structured data.
- [ ] Add sitemap and robots behavior.
- [ ] Verify PostgreSQL full-text search performance against the launch inventory.

### Work items — release operations

- [ ] Provision production database, auth, secrets, monitoring, and scheduler.
- [ ] Configure database backups and restoration documentation.
- [ ] Rehearse migration and forward-fix/rollback procedures.
- [ ] Deploy with scheduled execution disabled and run the controlled production migration step.
- [ ] After migrations, run idempotent production-safe reference provisioning for six categories and approved expression libraries; never run the demo seed.
- [ ] Run one controlled ingestion/generation cycle.
- [ ] Admin-review the initial inventory.
- [ ] Verify public, admin, cron, logging, alert, and cost controls.
- [ ] Enable scheduling gradually.
- [ ] Publish an operations runbook covering:
  - provider outage
  - AI failure
  - bad article removal
  - duplicate handling
  - stale categories
  - kill switches
  - deployment rollback

### Launch gate

- All six categories are represented.
- Target inventory exists, or a reduced inventory has explicit approval.
- No critical/high security issue remains.
- Core keyboard, mobile, and desktop flows pass.
- PostgreSQL search returns relevant published results across the required fields.
- Admin removal/archive/regeneration paths work.
- Monitoring, backup, and rollback paths are operational.
- Scheduled ingestion creates moderated valid drafts without duplicates.
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
- Published-article regeneration does not mutate live content before approval.
- Approving a replacement creates a prior revision; rejecting it leaves live content unchanged.
- Repeated provider input creates no duplicate raw candidate.
- One malformed item does not abort the batch.
- Filter and count reconciliation is exact.
- Provider timeouts/rate limits map to retryable operational states.

#### AI transformation

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
- A sufficiently large synthetic corpus verifies that the query is eligible to use the intended PostgreSQL search index.

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
- **Preview:** provider-specific decision; no live ingestion or AI by default.
- **Staging:** production-like services, controlled scheduler, non-public validation.
- **Production:** manual release approval initially, scheduled processing enabled after smoke tests.

### 13.3 Database deployment policy

- Back up production before material schema changes.
- Run `migrate deploy` exactly once as a controlled release step.
- Run the idempotent reference-provisioning command after migrations when its version changes.
- Do not run development migrations, reset, or demo seed in production.
- Prefer backwards-compatible expand/contract changes.
- Treat application rollback and database rollback as separate concerns.
- Prefer forward fixes over attempting to reverse destructive migrations.

### 13.4 Deployment smoke tests

After every deployment:

- load `/`
- load one category page
- load one published article
- verify source link and EN/TR content
- verify database connectivity
- verify admin protection
- verify health of configured integrations without creating paid work

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

### 14.3 Publication policy

At launch:

1. Candidate is ingested.
2. Adaptation is generated and validated.
3. Article remains `DRAFT`.
4. Admin reviews factuality, language, level, and originality.
5. Admin publishes or rejects.

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

- Enforce authentication and authorization server-side.
- Protect actions independently of page middleware.
- Use secure session and CSRF protections appropriate to the auth solution.
- Require an authenticated cron secret or signed scheduler request.
- Rotate compromised secrets.
- Log material admin actions.
- Never fetch arbitrary user-controlled URLs.
- Use timeouts, redirect limits, and approved hosts in source integrations.

### Pre-launch review

- dependency/security scan
- secret scan
- authorization tests
- rate-limit tests
- input-validation review
- source-fetch/redirect review
- session/cookie review
- error/log redaction review
- database permission and backup review

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

- Public list/article content is server rendered.
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

`tests/e2e/page-budget.spec.ts` enforces the three size limits on every demo article. The timings were measured once. The phone profile is Google Chrome driven by Playwright at a Pixel 7 viewport with the CPU slowed four times, taking the median of seven loads; the Event Timing API timed the word card, the translation toggle and the text-size buttons, and the word card was the slowest. The 900-word article was a temporary copy of the C1 demo article with its paragraphs repeated. Repeated text compresses better than new text, so a real 900-word article's HTML download would be nearer 39 KB. Headless Chrome added 100 ms or more of waiting for the next frame to every word-card tap, which a real browser window did not show, so the phone budget counts script time and the 200 ms response target is checked in a real browser. Measure again when M7 sets article lengths, and before launch.

### Cache plan

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
| Provider/content use is not licensed for the intended transformation | Medium | Critical | Written provider review; approved-source record; no ingestion before approval. | Blocks M6. |
| Source images have unclear rights | High | High | Omit images or use owned/local placeholders until rights are explicit. | Blocks use of affected image, not text release. |
| AI invents facts or quotations | Medium | Critical | Strict prompt/schema, factual checks, audit records, human approval. | Blocks publication of affected article. |
| Turkish translation changes meaning | Medium | High | Paragraph alignment, validation, editorial sampling, regeneration/rejection. | Blocks publication of affected article. |
| CEFR level is inconsistent or inventory becomes one-sided | Medium | Medium | Explicit assignment mix, finished-article classification, readability indicators, and editorial sampling. | Blocks article if materially unsuitable; blocks launch if inventory tolerance fails. |
| Extensive source wording creates copyright risk | Medium | Critical | Originality prompt, overlap checks, human review, source policy. | Blocks publication. |
| Scope expands before core reader is validated | High | High | Reader Release gate; scope matrix; explicit change decisions. | Blocks added work unless traded against scope. |
| Duplicate candidates/articles occur across runs | Medium | High | Canonical URL hash, unique constraints, idempotency, cron lock. | Blocks scheduled launch if unresolved. |
| Provider or AI outage breaks browsing | Medium | High | Async separation, timeouts, failure states, existing-content continuity. | Does not block browsing; alerts operations. |
| AI costs grow unexpectedly | Medium | High | Pre-filtering, quotas, caps, caching, usage logs, kill switch. | Stops generation at limit. |
| Context cache returns the wrong word sense | Medium | Medium | Sentence hash, provider/schema version, contextual validation. | Requires cache invalidation/fix. |
| Expression matching corrupts text or overlaps words | Medium | High | Longest-match algorithm, exact reconstruction fixtures, occurrence offsets. | Blocks M4 exit. |
| Hundreds of interactive tokens harm accessibility/performance | Medium | High | Keyboard strategy, DOM profiling, mobile/assistive QA. | Blocks M4/launch. |
| Admin or cron access is compromised | Low | Critical | Strong auth, server checks, secret rotation, audit logs, rate limits. | Blocks launch. |
| Pipeline fails silently | Medium | High | Persist run items/generation attempts, reconciled counts, source lineage, alerts, and runbook. | Blocks M8 exit. |
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

### Open decisions

| Decision | Needed by | Default recommendation |
|---|---|---|
| Licensed news provider and exact usage rights | Before M6 | One provider with explicit derivative-content rights. |
| Image policy/provider | Before using production images | Omit unless rights are explicit. |
| AI provider/model | Before M7 | Provider decided on 2026-09-25 (Claude). Still open: the model for each task, chosen by the ML roadmap's comparison. |
| Dictionary fallback | Before live M4 integration | Resolved on 2026-09-25: contextual Claude lookup, cache-first (see Accepted). |
| Admin authentication | Before M5 | Resolved on 2026-10-14: Better Auth with an email, a password and an authenticator-app code (ADR-003). |
| Hosting and managed PostgreSQL | Before M8/M9 | Choose based on operational simplicity and regional needs. |
| Scheduler | Before M8 | Vercel Cron for simple hosting alignment or Trigger.dev for richer runs. |
| CEFR assignment mix and verification rule | Before M7 | Fill inventory deficits, then classify every finished article independently. |
| Moderation cadence and freshness SLA | Before M8 | Define review windows, backlog ceiling, and public freshness target. |
| Active-content archival duration | Before M8 | Preserve source lineage; archive rather than delete. |
| AI daily budget and batch limits | Before M7/M8 | Conservative cap with a hard kill switch. |
| Editorial policy for sensitive news | Before M6/M7 | Written include/exclude/review rules. |

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

- Six categories hold the approved recent-content inventory.
- Every eligible English word supports contextual lookup.
- Known multi-word expressions take precedence over word tokenization.
- Article and category Real English sections work.
- Every launch category contains at least 10 reviewed expressions.
- Curated article vocabulary is persisted and displayed.
- Lookup cache, fallback, loading, rate-limit, and error behavior work.
- Admin authentication and audited moderation work.
- One licensed provider imports candidates idempotently.
- AI produces schema-valid original bilingual drafts.
- Finished articles are independently checked against their assigned CEFR level, and the inventory meets the approved level mix.
- Invalid generation output cannot publish.
- Human review controls publish/archive/reject/regenerate content.
- Scheduled runs are locked, restartable, bounded, observable, and cost controlled.
- PostgreSQL full-text search covers title, summary, category, body, and source.
- Moderation backlog and public category freshness meet the approved SLA.
- Source attribution and provenance are complete.
- Security, accessibility, SEO, mobile, backup, and rollback gates pass.
- Operations can disable generation/publication and remove a bad article quickly.

---

## 22. Immediate next actions

Slices 1–5 are complete, and with them the Reader Release (M1–M3). On 2026-09-25 a native Turkish speaker reviewed the demo translations in `prisma/fixtures/articles.ts` and found them correct. The reader also passed a manual check on a real phone, covering filters, the translation and text-size controls, landscape, and larger text.

M4 and M5 may run in parallel per the dependency map.

**M4, contextual vocabulary and Real English: every work item is built.** Done: the text-analysis layer, the vocabulary and expression schema, `POST /api/dictionary` with editorial entries for every word of the six demo articles (`prisma/fixtures/dictionary/`, validated by `prisma/editorial-dictionary.ts`) and an optional Claude provider, clickable words and expressions with a desktop popover, a mobile bottom sheet and keyboard access, 97 reviewed Real English cards with 30 occurrences marked in the demo articles, the article's "Key vocabulary" and "Real English" sections, and the category expression pages. The page budget was set and met on 2026-10-14 (§17). On 2026-10-24 the user reviewed the editorial dictionary's Turkish from the sheet in `docs/reviews/2026-10-14-editorial-dictionary.md`, all 42 key vocabulary words plus 40 entries drawn at random: 81 were correct, and “atmosphere” gained “atmosfer”. Before the exit gate:

- a manual check on a real phone of words, expressions and both lists.

**M5, moderation,** can start: admin authentication was decided on 2026-10-14 (ADR-003).

Do not begin live news or AI integration before their milestones.
