# Server boundary

Code in this directory is privileged application code. Database clients, provider SDKs, secrets, ingestion jobs, and server-side data access belong here.

Conventions:

- Add `import "server-only"` to modules that access credentials, the database, the filesystem, or private provider APIs.
- Read environment variables through `src/lib/env.ts`; do not scatter `process.env` access through features.
- Keep Server Components as the default. Add `"use client"` only to the smallest interactive component that needs browser APIs, state, or event handlers.
- Never import a `src/server` module from a Client Component. The `server-only` marker must make accidental imports fail during development and builds.
- Return deliberately shaped data-transfer objects from this boundary. Do not pass database records, secrets, or provider payloads wholesale into Client Components.
- Validate untrusted route, form, provider, and AI inputs before they enter domain or persistence code.

M1 validates only the safe public site URL. M2 will add a required database URL at the Prisma boundary so the scaffold can still build without database credentials.
