# Pre-launch security review — 2026-11-01

The review `IMPLEMENTATION_PLAN.md` §15 asks for before the repository becomes public and the site goes live on GitHub Pages (M9). Done by Claude in a Claude Code session on 2026-11-01, at `main` commit `e70c89a`.

## 1. Secrets and personal data in the history

**Method.** A one-off script read every blob reachable from every local branch and from the heads of all 27 pull requests, fetched from GitHub (76 commits, 631 distinct versions of text files, 1 binary file), all 76 commit messages, and the title and body of every pull request. The repository has no issues, issue or review comments, or releases. Its two Actions artifacts are built static sites, uploaded by the Pages workflow. Patterns searched for:

- secrets: Anthropic, OpenAI-style, GitHub, AWS, Google, Slack, Stripe and npm keys and tokens; private key blocks; JWTs; URLs with a password; secret-like assignments (`secret`, `password`, `token`, `api_key`); `BETTER_AUTH_SECRET=` and API key settings with a value;
- personal data: email addresses, IPv4 addresses, home-directory paths, phone numbers, family words, the owner's name;
- file names: `.env*`, `*.pem`, `*.key`, SSH keys, `.npmrc`, `settings.local.json`, credentials files, and the agent loaders `AGENTS.md` and `CLAUDE.md`.

**Findings.**

- No secret. The only matches are test values (for example `integration-tests-only-secret-…`), the development-only auth secret in `src/lib/env.ts`, which production refuses, and development or build-only database passwords for local and throwaway containers (`compose.yaml`, `.env.example`, the workflows).
- No `.env` file was ever committed. `.env.example` holds no secret, and `.npmrc` only `engine-strict=true`.
- `AGENTS.md` and `CLAUDE.md` were committed once, in the scaffold commit of 2026-08-30, as create-next-app's boilerplate, and removed on 2026-09-25 when the loaders moved to the agent-config repository. They never held a local path or anything personal.
- No personal data in any file, commit message or pull request, beyond the GitHub account name, which the repository's address shows anyway. Emails in files are test addresses on `example.test` and `db.example.com`, plus Anthropic's no-reply address in commit trailers. IP addresses are loopback, documentation ranges (RFC 5737) or test values. The one binary file is Next.js's default favicon.
- **Open, for the owner:** every commit records the author's personal email address, including GitHub's merge commits. Making the repository public publishes it. The choices are to accept it, or to use GitHub's no-reply address for future commits, with "Keep my email addresses private" and "Block command line pushes that expose my email" in GitHub's email settings. Changing past commits would break their signatures and need a force-push, so it is not proposed.

## 2. What the static build contains

`scripts/site-security.ts` now checks the built site at the end of every `pnpm site:build`, so CI checks every pull request and the Pages workflow checks every deployment. A failed check fails the build, and nothing is deployed. It refuses:

- any article but the written ones marked published that has a page, a word file or a search entry, and any marked article that lacks one;
- the admin, sign-in or the dictionary endpoint, source maps and environment files;
- any file that mentions a demo article or a draft (by slug, the demo source's name or the demo domain), a database setting or address, a secret's setting or a private key;
- any page that does not start its `<head>` with its content security policy.

The site build sets no secret: only the site's address and a throwaway database. The first checked build, on 2026-11-01, had 23 pages and nothing to report.

## 3. Content security policy and referrer policy

GitHub Pages cannot send response headers, so each page carries its policy in a `<meta>` tag, first in its `<head>`:

```text
default-src 'none'; script-src 'self' 'sha256-…' …; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'
```

Next.js writes each page's React payload into inline scripts. A nonce needs a server to make a new one per request, so the policy lists the page's own inline scripts by their SHA-256 hashes, computed after the build. A script injected into a page has another hash and does not run. The site has no inline styles, frames, plugins or workers, and loads nothing from other origins. A `<meta>` tag cannot carry `frame-ancestors` or reporting, so clickjacking protection waits for a host that sends headers; the reader has no action worth clickjacking. The local server, which only the owner uses, has no policy.

The referrer policy is `same-origin`, so other sites never learn which article a reader came from; links to sources also carry `noreferrer`. `no-referrer` would blank the Origin header of the local admin's form posts, which Next.js checks before running a server action.

Checked in Chrome on 2026-11-01 against the static build served by `pnpm site:serve`: the homepage, a client-side move to an article, a word card on desktop and the bottom sheet at phone width, the translation switch, a search with its index, a direct article load and the not-found page all ran with no policy violation. An inline script, an inline style and an image from another origin, injected by hand, were all blocked.

## 4. Input validation and raw HTML

- Routes: the static site holds only the parameters listed at build time, and GitHub Pages answers anything else with the not-found page. The local server looks slugs up as query parameters and answers not found.
- Homepage filters keep only known categories, levels and lengths and real calendar days; the search query is its first `q`, with spaces collapsed, cut at 100 characters and 10 words.
- All article text is plain text rendered through React, which escapes it. No source HTML enters the site while ingestion (M6) is on hold. The only raw HTML a page writes is its JSON-LD, with `<` escaped.
- External links open with `noopener noreferrer`.

## 5. Error pages and logs

The route error page shows only the error's reference, and production server errors reach the browser without their message. The global error page shows nothing about the error. The static site has no server, so it writes no logs.

## 6. Dependencies

`pnpm audit` on 2026-11-01 found 57 advisories (3 critical, 20 high). Next.js went from 16.3.3 to 16.3.8 and zod from 4.5.2 to 4.6.7, which left 48 (2 critical, 18 high). None of them reaches the static site, whose only third-party code in the browser is React and Next.js's client runtime:

- Next.js 16.3.8: two critical advisories and one high one, fixed only in 16.4.1. They concern the image optimization API and `use cache`, which the project does not use (the site build is a static export, and `sharp` is not even built), and Server Actions, which only the local admin runs.
- Prisma's command-line tooling (`deepmerge-ts`, `mysql2`, `fast-uri`), pinned with Prisma by ADR-001. It runs only during builds and on the owner's computer, and `mysql2` is never used.
- Test, lint and build tooling: `undici`, `vite` and `@vitest/mocker` through Vitest and jsdom, `brace-expansion` and `minimatch` through ESLint, and `source-map-js` through the CSS and React tooling.

Follow-ups: Next.js 16.4 in its own change, re-checking Next's agent-file writer as the loader rules require, and routine updates of the test and lint tooling.

## 7. GitHub, once the repository is public

- The workflows use no secrets. Their token is read-only except in the deploy job, which can only write to Pages.
- Pull requests from forks run CI with a read-only token, and by default GitHub holds runs from first-time contributors until the owner approves them.
- Actions are pinned to major versions, from GitHub and from pnpm. Pinning them to commit hashes would guard against a moved tag, at the cost of updating them by hand.
- Confirm in the repository's settings that secret scanning, push protection and Dependabot alerts are on; GitHub offers them free for public repositories.
