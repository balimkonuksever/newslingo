# Newslingo

Newslingo is a bilingual news-reading application for Turkish speakers learning English. It combines current-news discovery with aligned English/Turkish paragraphs, contextual vocabulary, and natural multi-word expressions.

The project is working towards the **Reader Release**. The data foundation (milestone M2) is in place: PostgreSQL with the reader-core schema, production-safe category provisioning, a deterministic demo dataset, typed server-side queries, and database integration tests. The editorial homepage, category pages, and bilingual article reader (M3) come next.

## Stack

- Next.js App Router
- React
- TypeScript in strict mode
- Tailwind CSS
- PostgreSQL 18 and Prisma ORM 7
- ESLint
- Prettier
- Vitest and React Testing Library
- pnpm

## Prerequisites

- Node.js 24.7.0 (see `.node-version`)
- pnpm 11.19.0 (enforced by `packageManager`)
- Docker Desktop with Docker Compose

## Local development

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Copy the safe local-development configuration. These credentials are only for the Docker database on your Mac:

```bash
cp .env.example .env.local
```

Start PostgreSQL and wait for it to become healthy:

```bash
pnpm db:up
```

Apply the committed database migrations:

```bash
pnpm db:migrate
```

Load the six categories and the demo articles:

```bash
pnpm db:seed
```

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Local PostgreSQL

Docker Compose runs PostgreSQL 18 on `127.0.0.1:5432` with development-only credentials. It provisions two isolated databases on the first start:

- `newslingo` for local application development
- `newslingo_test` for integration tests

Useful commands:

```bash
pnpm db:up
pnpm db:validate
pnpm db:generate
pnpm db:migrate
pnpm db:migrate:test
pnpm db:seed
pnpm db:seed:test
pnpm db:studio
pnpm db:logs
pnpm db:down
```

The committed reader-core migrations create the `Category`, `Article`, and `ArticleParagraph` tables plus their enums, relationships, indexes, and safety constraints.

Database data persists in the Docker volume named `newslingo_postgres_data`. `docker compose down -v` permanently deletes that local data and should only be used for an intentional reset. Initialization scripts run only when the volume is empty.

## Seed data

Seeding is split by what is safe where:

| Command                  | Writes                                                                          | Where it may run                                                         |
| ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm db:seed:reference` | The six launch categories from `prisma/reference/categories.ts`                 | Anywhere, including production. Idempotent upsert by slug.               |
| `pnpm db:seed:demo`      | Six demo articles with EN/TR paragraph pairs from `prisma/fixtures/articles.ts` | Local databases only. Refuses `NODE_ENV=production` and non-local hosts. |
| `pnpm db:seed`           | Both, via `prisma db seed`                                                      | Local development.                                                       |
| `pnpm db:seed:test`      | Both, into the isolated test database                                           | Local and CI.                                                            |

Every command is idempotent: rerunning it updates rows in place and never duplicates them. The demo articles are original, invented educational fixtures attributed to "Newslingo demo fixture" with URLs on the reserved `demo.newslingo.example` domain, so they cannot be mistaken for real or ingested news. Their CEFR levels are the author's intent, not verified labels, so they must not be used as evaluation data. Live news fetching is a later milestone.

Commands whose names end in `:test`, and `pnpm test:integration`, run through `scripts/with-test-database.ts`. It points `DATABASE_URL` at `TEST_DATABASE_URL` only after checking that the two are different databases and that the test database's name contains a distinct `test` token.

## Verification

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm test` runs the unit and component tests, which need no database. Database integration tests run against the isolated test database, which they empty before each test:

```bash
pnpm db:up
pnpm db:migrate:test
pnpm test:integration
```

Useful fix/watch commands:

```bash
pnpm format:write
pnpm lint:fix
pnpm test:watch
```

GitHub Actions runs the same gates for pull requests and pushes to `main`: formatting, linting, schema checks, typechecking, unit tests, database integration tests, seeding of the test database, and a production build.

## Environment boundary

The public site URL and database URLs are validated through the environment boundary under `src/lib/`. Database values are read lazily, so static builds do not require a live database; importing the server-only Prisma client does. The committed `.env.example` contains safe development defaults, while real secrets belong only in ignored local environment files. Privileged integrations belong under `src/server/` and must remain inaccessible to Client Components.

## Project documents

- `IMPLEMENTATION_PLAN.md` — executable engineering roadmap and release gates
- `bilingual_news_english_learning_plan.md` — product and technical specification
- `docs/adr/0001-prisma-workflow.md` — pinned Prisma workflow for M2
