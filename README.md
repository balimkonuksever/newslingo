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

## Local development

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Create an optional local environment file. M1 has no secrets and defaults to the same local URL when this file is absent:

```bash
cp .env.example .env.local
```

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

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

Environment values are parsed in `src/lib/env.ts`. M1 intentionally requires no database credentials; `NEXT_PUBLIC_SITE_URL` defaults to `http://localhost:3000`. Privileged integrations belong under `src/server/` and must remain inaccessible to Client Components.

## Project documents

- `IMPLEMENTATION_PLAN.md` — executable engineering roadmap and release gates
- `bilingual_news_english_learning_plan.md` — product and technical specification
- `docs/adr/0001-prisma-workflow.md` — pinned Prisma workflow for M2
