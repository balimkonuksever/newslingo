# Newslingo

Newslingo is a bilingual news-reading application for Turkish speakers learning English. It combines current-news discovery with aligned English/Turkish paragraphs, contextual vocabulary, and natural multi-word expressions.

The project is currently in **Reader Release Slice 1**: establishing the Next.js application foundation before database and reader-feature development begins.

## Stack

- Next.js App Router
- React
- TypeScript in strict mode
- Tailwind CSS
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
pnpm db:logs
pnpm db:down
```

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

The public site URL is parsed in `src/lib/env.ts`; the Prisma setup step will extend that boundary to the database URLs. The committed `.env.example` contains safe development defaults, while real secrets belong only in ignored local environment files. Privileged integrations belong under `src/server/` and must remain inaccessible to Client Components.

## Project documents

- `IMPLEMENTATION_PLAN.md` — executable engineering roadmap and release gates
- `bilingual_news_english_learning_plan.md` — product and technical specification
- `docs/adr/0001-prisma-workflow.md` — pinned Prisma workflow for M2
