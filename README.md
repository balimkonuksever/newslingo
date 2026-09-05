# Newslingo

Newslingo is a bilingual news-reading application for Turkish speakers learning English. It combines current-news discovery with aligned English/Turkish paragraphs, contextual vocabulary, and natural multi-word expressions.

The project is currently in **Reader Release Slice 1**. The Next.js foundation and reader-core PostgreSQL/Prisma migrations are in place; deterministic seed content and reader features come next.

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
pnpm db:studio
pnpm db:logs
pnpm db:down
```

The committed reader-core migrations create the `Category`, `Article`, and `ArticleParagraph` tables plus their enums, relationships, indexes, and safety constraints. These tables are intentionally empty at this stage. The next M2 slice adds deterministic categories and demo article/paragraph pairs; live news fetching is a later ingestion step.

`pnpm db:migrate:test` applies committed migrations only to the isolated test database. Its guard refuses a URL that does not clearly name a separate test database.

Database data persists in the Docker volume named `newslingo_postgres_data`. `docker compose down -v` permanently deletes that local data and should only be used for an intentional reset. Initialization scripts run only when the volume is empty.

## Verification

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Useful fix/watch commands:

```bash
pnpm format:write
pnpm lint:fix
pnpm test:watch
```

GitHub Actions runs the same formatting, linting, typechecking, test, and production-build gates for pull requests and pushes to `main`.

## Environment boundary

The public site URL and database URLs are validated through the environment boundary under `src/lib/`. Database values are read lazily, so static builds do not require a live database; importing the server-only Prisma client does. The committed `.env.example` contains safe development defaults, while real secrets belong only in ignored local environment files. Privileged integrations belong under `src/server/` and must remain inaccessible to Client Components.

## Project documents

- `IMPLEMENTATION_PLAN.md` — executable engineering roadmap and release gates
- `bilingual_news_english_learning_plan.md` — product and technical specification
- `docs/adr/0001-prisma-workflow.md` — pinned Prisma workflow for M2
