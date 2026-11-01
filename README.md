# Newslingo

Newslingo is a bilingual news-reading application for Turkish speakers learning English. It combines current-news discovery with aligned English/Turkish paragraphs, contextual vocabulary, and natural multi-word expressions.

The **Reader Release** (milestones M1–M3) is in place. It runs entirely on PostgreSQL seed data and includes:

- an editorial homepage with shareable filters for category, level, reading time, and date
- category pages
- a bilingual reader that alternates English paragraphs with their Turkish translations, with controls to hide the translation and change the text size

M4, contextual vocabulary and Real English expressions, is complete: every English word in the reader can be looked up, and marked expressions open their Real English cards. M5, moderation, is complete: admins sign in at `/admin/sign-in`, review every article in any status, and publish, reject, archive or restore it, with each change recorded. Next is milestone W: articles written in Claude Code sessions, both explainers and adapted GOV.UK news, imported as drafts and published through the admin. Licensed news ingestion, automated AI adaptation and scheduled operation (M6–M8) are on hold.

## Stack

- Next.js App Router
- React
- TypeScript in strict mode
- Tailwind CSS
- PostgreSQL 18 and Prisma ORM 7
- Better Auth, for admin sign-in
- ESLint
- Prettier
- Vitest and React Testing Library
- Playwright and axe for browser and accessibility tests
- pnpm

## Prerequisites

- Node.js 24.7.0 (see `.node-version`)
- pnpm 11.19.0 (enforced by `packageManager`)
- Docker Desktop with Docker Compose
- Google Chrome, for the browser tests

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
pnpm db:reset:test
pnpm db:studio
pnpm db:logs
pnpm db:down
```

The committed migrations create the reader tables (`Category`, `Article`, `ArticleParagraph`), the vocabulary and Real English tables, and Better Auth's admin sign-in tables, plus their enums, relationships, indexes, and safety constraints.

Database data persists in the Docker volume named `newslingo_postgres_data`. `docker compose down -v` permanently deletes that local data and should only be used for an intentional reset. Initialization scripts run only when the volume is empty.

## Seed data

Seeding is split by what is safe where:

| Command                  | Writes                                                                                                                                                                                                                                                                                                                    | Where it may run                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:seed:reference` | The six launch categories from `prisma/reference/categories.ts` and the Real English expression cards from `prisma/reference/expressions/`                                                                                                                                                                                | Anywhere, including production. Idempotent upsert by slug. Refuses to write anything if a card is invalid or its Turkish is unreviewed. |
| `pnpm db:seed:demo`      | Six demo articles with EN/TR paragraph pairs from `prisma/fixtures/articles.ts`, a dictionary entry for each of their words, their key vocabulary, and where Real English expressions occur in them, plus one unpublished draft from `prisma/fixtures/drafts.ts` for the admin pages, which reseeding makes a draft again | Local databases only. Refuses `NODE_ENV=production` and non-local hosts.                                                                |
| `pnpm db:seed`           | Both, via `prisma db seed`                                                                                                                                                                                                                                                                                                | Local development.                                                                                                                      |
| `pnpm db:reset:test`     | Empties the isolated test database, then loads both                                                                                                                                                                                                                                                                       | Local and CI. The browser tests run it automatically.                                                                                   |

Every seed command is idempotent: rerunning it updates rows in place and never duplicates them. The demo articles are original, invented educational fixtures attributed to "Newslingo demo fixture" with URLs on the reserved `demo.newslingo.example` domain, so they cannot be mistaken for real or ingested news. Their CEFR levels are the author's intent, not verified labels, so they must not be used as evaluation data. Live news fetching is a later milestone.

The editorial dictionary in `prisma/editorial/dictionary/` is production content, shared by the demo articles and the written articles; its Turkish is reviewed by sample. `pnpm exec tsx scripts/sample-dictionary-review.ts [size] [seed]` prints a review sheet with every key vocabulary word and a seeded random sample of the other entries, each in a sentence that uses it. Add `--written` to cover only the written articles and the entries no demo article uses, or `--written=<slug>` for one written article and the entries that no demo article and no written article listed before it in `index.ts` uses. Completed reviews are kept in `docs/reviews/`.

Commands whose names end in `:test`, `pnpm test:integration`, and `pnpm test:e2e` run through `scripts/with-test-database.ts`. It points `DATABASE_URL` at `TEST_DATABASE_URL` only after checking that the two are different databases and that the test database's name contains a distinct `test` token.

## Written articles

Articles are written in Claude Code sessions (milestone W), one file per article in `prisma/editorial/articles/`, listed in its `index.ts`. The format is `WrittenArticle` in `prisma/written-articles.ts`: news adapted from one source, such as a GOV.UK story, or an explainer with its references, plus each article's Turkish, sense choices, key vocabulary and Real English marks. Every word needs an entry in the editorial dictionary.

```bash
pnpm articles:import --check
```

checks every file without a database: the fields, the length for the article's level, the credit, a dictionary sense for every word, six to eight key words and the marks. Any problem refuses the whole batch.

```bash
pnpm articles:import
```

checks the files again, shows each article as new, changed or unchanged with the dictionary entries to add or correct, and writes new and changed articles, with their entries, in one transaction. A second run changes nothing. It never changes an article that is no longer a draft, and never takes one off the site: to correct a published one in this database, archive it, restore it to draft, then import again. It writes to a database on this machine at once, and waits for the host to be typed for any other. Demo articles are never imported. Review the drafts at `/admin/articles?status=draft`.

An article is written as a draft unless its file has the publication mark, the day the user approved it for the site:

```ts
publishedOnSite: new Date("2026-10-31"),
```

The import publishes a marked article with that day, after the checks an admin's publish runs, and records no moderation event: the merged pull request that added the mark is the record. The mark must be a whole day, no earlier than the article's date. To publish a draft after reviewing it in the admin preview, add the mark to its file and import again.

## Static site

The live site is a static site on GitHub Pages, at `https://<owner>.github.io/newslingo/`, rebuilt from the repository on every push to `main` (`IMPLEMENTATION_PLAN.md` M9). It has the public pages only: the homepage, whose filters run in the browser, the category and expression pages, every published article and a word file for each, `/words/<slug>.json`, which word lookups read. The admin, sign-in and `POST /api/dictionary` stay on your computer: their route files are named `*.local.tsx` or `*.local.ts`, which the site build leaves out, and `*.site.ts` files exist only in it.

```bash
pnpm site:build
```

empties the `newslingo_site` database on your local PostgreSQL (or `SITE_DATABASE_URL`, which must be on this machine and have a distinct `site` name token), applies the migrations, provisions the reference data and imports the written articles, publishing the ones with the publication mark, then builds the static site into `out/`. Demo articles never reach it. Like `pnpm build`, it writes `.next`, so run `pnpm build` again before `pnpm start`.

```bash
pnpm site:serve
```

serves `out/` at `http://localhost:4173/newslingo/` the way GitHub Pages does, to check a build before it goes live.

The `Pages` workflow in `.github/workflows/pages.yml` runs the same build against a temporary PostgreSQL and deploys it. A failed build deploys nothing, so the previous site stays live. GitHub Free offers Pages only for public repositories, so its deploy job runs once the repository is public; before that, switch Pages on in the repository's settings, with "GitHub Actions" as the source.

## Admin accounts

Admins sign in with an email, a password and a code from an authenticator app (ADR-003). There is no public sign-up: an admin is created, or given a new password and authenticator app, only from the command line:

```bash
pnpm admin:create
```

```bash
pnpm admin:reset
```

Each command shows the database it will change and waits for you to type `yes`, or the database's host when it is not on this machine. It asks for the password at a hidden prompt, then shows a setup key and backup codes for your authenticator app and waits for a code from it. A new admin whose setup does not finish is removed. A reset ends every session and removes the old authenticator app first. Run the command with the same `BETTER_AUTH_SECRET` as the site, because it encrypts the authenticator key; locally, both use the development-only secret.

Admins sign in at `/admin/sign-in`: the password first, then the six-digit code from the app or one of the backup codes. Repeated failures are refused for a while, counted per email address and per client. `pnpm start` runs in production mode, which refuses the development-only secret, so set your own `BETTER_AUTH_SECRET` in `.env.local` before signing in to a local production build, and create its admin with that secret.

## Moderation

After signing in, `/admin` shows how many articles each status holds, and `/admin/articles` lists every article, newest story first. Filter the list by status and category; the filters live in the URL, as in `/admin/articles?status=draft&category=world`, and the count beside each choice is the number of articles it would show.

An article's page shows it exactly as readers will see it, through the same reader components as the public page, beside its details, which say whether it is news or an explainer and show its source and licence or its references, and its moderation history. It offers only the actions the article's status allows:

| Status    | Actions                                                              |
| --------- | -------------------------------------------------------------------- |
| Draft     | Publish, with an optional note; reject; change the category or level |
| Published | Archive, which takes it off the site; change the category or level   |
| Archived  | Restore to draft; change the category or level                       |

Every action except publishing asks for a reason. Publishing first checks that the article is complete and lists anything to fix. Each change is recorded with the admin who made it, the reason, and the fields before and after, and nothing is ever deleted. Word lookups in the preview answer only once an article is on the site.

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

Browser tests run Playwright in your installed Google Chrome, on a desktop and a phone viewport, including axe accessibility scans and a check that every article page stays within the page budget in `IMPLEMENTATION_PLAN.md` §17. They reset the test database to the demo dataset, create one test admin per viewport with the admin command, build the app, and serve it on port 3100. The moderation tests publish and archive copies of the demo draft, one per viewport, so the two viewports never change the same article:

```bash
pnpm test:e2e
```

`pnpm test:e2e:ui` opens the same tests in Playwright's interactive UI.

Useful fix/watch commands:

```bash
pnpm format:write
pnpm lint:fix
pnpm test:watch
```

GitHub Actions runs the same gates for pull requests and pushes to `main`: formatting, linting, schema checks, typechecking, unit tests, database integration tests, a production build, the browser and accessibility tests, and a build of the static site. When the browser tests fail, their traces and screenshots are uploaded as a workflow artifact.

## Environment boundary

The public site URL and database URLs are validated through the environment boundary under `src/lib/`. Database values are read lazily. On the local server pages read PostgreSQL on every request, so `pnpm build` needs a valid `DATABASE_URL` but no running database; the static site build reads it once, at build time. The committed `.env.example` contains safe development defaults, while real secrets belong only in ignored local environment files. Privileged integrations belong under `src/server/` and must remain inaccessible to Client Components.

## Project documents

- `IMPLEMENTATION_PLAN.md` — executable engineering roadmap and release gates
- `bilingual_news_english_learning_plan.md` — product and technical specification
- `docs/adr/` — pinned decisions: the Prisma workflow (ADR-001), where ML code lives (ADR-002) and admin sign-in (ADR-003)
