import { z } from "zod";

type DatabaseVariableName = "DATABASE_URL" | "TEST_DATABASE_URL";

const postgresUrlSchema = z.string().min(1).url();

const testDatabaseNamePattern = /(^|[-_])test(?:[-_]|$)/i;

const localDatabaseHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

function databaseIdentity(connectionString: string) {
  const url = new URL(connectionString);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));

  if (!databaseName) {
    throw new Error("PostgreSQL connection URLs must include a database name.");
  }

  return {
    databaseName,
    identity: `${url.hostname.toLowerCase()}:${url.port || "5432"}/${databaseName.toLowerCase()}`,
  };
}

export function parsePostgresUrl(
  name: DatabaseVariableName,
  value: string | undefined,
) {
  const parsed = postgresUrlSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error(
      `${name} is missing or invalid. Copy .env.example to .env.local and use a PostgreSQL connection URL.`,
    );
  }

  const protocol = new URL(parsed.data).protocol;

  if (protocol !== "postgresql:" && protocol !== "postgres:") {
    throw new Error(
      `${name} must use the postgresql:// or postgres:// protocol.`,
    );
  }

  databaseIdentity(parsed.data);

  return parsed.data;
}

/**
 * Returns the URL only when its database name carries a distinct `test` token,
 * such as `newslingo_test`. Anything that deletes data calls this first.
 */
export function requireTestDatabaseUrl(
  name: DatabaseVariableName,
  value: string | undefined,
) {
  const url = parsePostgresUrl(name, value);

  if (!testDatabaseNamePattern.test(databaseIdentity(url).databaseName)) {
    throw new Error(
      `${name} must identify a database with a distinct \`test\` name token.`,
    );
  }

  return url;
}

export function validateTestDatabaseUrls({
  databaseUrl,
  testDatabaseUrl,
}: {
  databaseUrl: string | undefined;
  testDatabaseUrl: string | undefined;
}) {
  const applicationUrl = parsePostgresUrl("DATABASE_URL", databaseUrl);
  const isolatedTestUrl = parsePostgresUrl(
    "TEST_DATABASE_URL",
    testDatabaseUrl,
  );

  if (
    databaseIdentity(applicationUrl).identity ===
    databaseIdentity(isolatedTestUrl).identity
  ) {
    throw new Error(
      "TEST_DATABASE_URL must not point to the application database.",
    );
  }

  return Object.freeze({
    TEST_DATABASE_URL: requireTestDatabaseUrl(
      "TEST_DATABASE_URL",
      isolatedTestUrl,
    ),
  });
}

/**
 * Demo articles are invented development/test fixtures. They may only be
 * written to a database on this machine, and never when NODE_ENV=production,
 * so they cannot end up on the public site.
 */
export function assertDemoSeedAllowed({
  nodeEnv,
  databaseUrl,
}: {
  nodeEnv: string | undefined;
  databaseUrl: string;
}) {
  if (nodeEnv === "production") {
    throw new Error(
      "Refusing to seed demo articles: NODE_ENV is production. Demo articles are development/test fixtures only.",
    );
  }

  const { hostname } = new URL(databaseUrl);

  if (!localDatabaseHosts.has(hostname.toLowerCase())) {
    throw new Error(
      `Refusing to seed demo articles into a non-local database (host "${hostname}"). Demo articles are development/test fixtures only.`,
    );
  }
}
