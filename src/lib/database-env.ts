import { z } from "zod";

type DatabaseVariableName = "DATABASE_URL" | "TEST_DATABASE_URL";

const postgresUrlSchema = z.string().min(1).url();

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
  const applicationDatabase = databaseIdentity(applicationUrl);
  const testDatabase = databaseIdentity(isolatedTestUrl);

  if (applicationDatabase.identity === testDatabase.identity) {
    throw new Error(
      "TEST_DATABASE_URL must not point to the application database.",
    );
  }

  if (!/(^|[-_])test(?:[-_]|$)/i.test(testDatabase.databaseName)) {
    throw new Error(
      "TEST_DATABASE_URL must identify a database with a distinct `test` name token.",
    );
  }

  return Object.freeze({ TEST_DATABASE_URL: isolatedTestUrl });
}
