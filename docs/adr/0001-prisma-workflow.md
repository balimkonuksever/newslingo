# ADR-001: Prisma ORM 7 workflow for M2

- Status: Accepted
- Date: 2026-08-30
- Last amended: 2026-09-03
- Owners: Newslingo engineering

## Context

M2 introduces PostgreSQL, Prisma, deterministic seeds, and database integration tests. The implementation plan needs a versioned workflow before those packages are installed because Prisma's generator, configuration, runtime connection, migration, and seeding contracts differ across majors.

On 2026-08-28, the unqualified `prisma@latest` tag moved to the Prisma 8 line while Prisma 8 was still published as a release candidate. Prisma 7.10.0 is the current stable v7 release. Newslingo needs the stable migration model now and will not cross a major version through an unqualified dependency update.

## Decision

M2 will use Prisma ORM 7.10.0 with PostgreSQL and the Node.js driver-adapter runtime.

All first-party Prisma packages will use the same exact version:

- `prisma@7.10.0` as a development dependency
- `@prisma/client@7.10.0` as a runtime dependency
- `@prisma/adapter-pg@7.10.0` as a runtime dependency

M2 will also add `pg` at runtime, plus `tsx` and `@types/pg` for development. The existing `@next/env` dependency loads the same `.env*` precedence for Prisma tooling that Next.js uses; a separate `dotenv` dependency is unnecessary. The default import is deliberate because `@next/env` 16.3.3 ships CommonJS and native ESM tooling cannot use its named export directly. The explicit development-mode argument makes local CLI commands select development files when `NODE_ENV` is unset, while `NODE_ENV=test` and `NODE_ENV=production` keep their own precedence. M2 enables package ESM as required by the selected Prisma workflow. The frozen pnpm lockfile remains the reproducibility boundary.

Do not install `prisma@latest`. A Prisma 8 upgrade requires a separate ADR or an explicit amendment to this one after a final, non-prerelease v8 release and a migration spike.

## Generator and schema

M2 will place the schema at `prisma/schema.prisma` and use the current `prisma-client` generator with an explicit ignored output directory:

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  runtime      = "nodejs"
  moduleFormat = "esm"
}

datasource db {
  provider = "postgresql"
}
```

The legacy `prisma-client-js` generator will not be used. Generation will be explicit in local and CI workflows because Prisma 7 no longer generates automatically after `migrate dev`.

## CLI configuration

M2 will add `prisma.config.ts`:

```ts
import nextEnv from "@next/env";
import { defineConfig } from "prisma/config";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
```

The seed command is added to `migrations.seed` alongside the guarded reference and demo seed implementations, rather than pointing Prisma at a nonexistent or no-op seed entry point.

The database URL belongs in Prisma config, not the schema datasource block. An adapter does not belong in Prisma config. If a future hosted database requires a pooler, the CLI will receive a separate direct connection URL while the application runtime keeps its pooled URL.

Credential-free commands such as formatting and generation must remain usable before a database exists. Commands that connect to PostgreSQL must fail clearly when the required URL is absent.

## Runtime client boundary

M2 will create one server-only singleton, following the directory conventions in `src/server/README.md`. It will:

- import the generated client from `@/generated/prisma/client`;
- create `PrismaPg` with the validated `DATABASE_URL`;
- pass that adapter to `new PrismaClient({ adapter })`;
- cache the client on `globalThis` outside production to survive Next.js development hot reloads;
- run only in Node.js Server Components, server functions, or route handlers;
- never be imported by Client Components or Edge-runtime modules.

## Migration workflow

Local schema development uses:

```text
prisma migrate dev --name <descriptive-name>
```

For PostgreSQL-specific SQL, full-text search, GIN indexes, triggers, or data-sensitive changes, create the migration without applying it, review the SQL, then apply it:

```text
prisma migrate dev --create-only --name <descriptive-name>
prisma migrate dev
```

Rules:

- Commit `schema.prisma`, `prisma.config.ts`, seed source, and the entire `prisma/migrations/` directory, including `migration_lock.toml`.
- Never edit or delete an already-applied migration.
- Run `prisma generate` explicitly after schema changes.
- Run `prisma db seed` explicitly; migration commands do not seed automatically.
- Use `prisma migrate deploy` for isolated tests, staging, and production.
- Never run `migrate dev` or `db push` in CI, staging, or production.
- Remap `DATABASE_URL` to the isolated `TEST_DATABASE_URL` only after the planned test-database safety guard passes.

The CI static gate will format, validate, and generate the client. The database integration gate will start real PostgreSQL, apply committed migrations with `migrate deploy`, load deterministic test fixtures, and then run integration tests. Production migrations will run in a controlled release job before the application rollout.

## Consequences

This decision keeps M2 on a stable Prisma line, supports editable PostgreSQL migration SQL, and preserves the planned generated-client and server-only boundaries. It requires explicit generation and seeding steps. A future Prisma 8 move will be deliberate rather than an incidental package update.

## References

- [Prisma changelog: `latest` tag change](https://www.prisma.io/changelog/2026-08-28)
- [Prisma ORM releases](https://github.com/prisma/orm/releases)
- [Prisma 7 with Next.js](https://www.prisma.io/docs/guides/v7/frameworks/nextjs)
- [Prisma 7 generators](https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators)
- [Prisma configuration reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference)
- [`migrate dev`](https://www.prisma.io/docs/cli/v7/migrate/dev)
- [`migrate deploy`](https://www.prisma.io/docs/cli/v7/migrate/deploy)
- [Prisma seeding workflow](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/seeding)
- [Prisma system requirements](https://www.prisma.io/docs/orm/reference/system-requirements)
