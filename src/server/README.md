# Server boundary

Code in this directory is privileged application code. Database clients, provider SDKs, secrets, ingestion jobs, and server-side data access belong here.

Conventions:

- Add `import "server-only"` to modules that access credentials, the database, the filesystem, or private provider APIs.
- Read application environment variables through `src/lib/env.ts`; do not scatter `process.env` access through features. Root tooling configuration such as `prisma.config.ts` is the documented exception.
- Keep Server Components as the default. Add `"use client"` only to the smallest interactive component that needs browser APIs, state, or event handlers.
- Never import a `src/server` module from a Client Component. The `server-only` marker must make accidental imports fail during development and builds.
- Return deliberately shaped data-transfer objects from this boundary. Do not pass database records, secrets, or provider payloads wholesale into Client Components.
- Validate untrusted route, form, provider, and AI inputs before they enter domain or persistence code.
- Filter every public article query through `publicArticleWhere` in `articles/queries.ts`, so drafts, archived articles, and inactive categories cannot leak. Validate route slugs with `slugSchema` before querying.
- Every admin page, server action and route handler calls `getAdminAccess` in `auth/access.ts` itself and proceeds only for the `admin` status. A layout or `proxy.ts` is never the only check (ADR-003).

Database URLs are validated lazily: static builds can run without database credentials, while importing the Prisma client requires `DATABASE_URL`. Integration-test tooling must call the guarded test accessor before using `TEST_DATABASE_URL`.
