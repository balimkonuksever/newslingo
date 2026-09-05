import "server-only";

import { z } from "zod";

import { parsePostgresUrl, validateTestDatabaseUrls } from "@/lib/database-env";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

const result = environmentSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!result.success) {
  const details = result.error.issues
    .map(
      (issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`,
    )
    .join("; ");

  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = Object.freeze(result.data);

export function getDatabaseEnv() {
  const databaseUrl = parsePostgresUrl(
    "DATABASE_URL",
    process.env.DATABASE_URL,
  );

  return Object.freeze({ DATABASE_URL: databaseUrl });
}

export function getTestDatabaseEnv() {
  return validateTestDatabaseUrls({
    databaseUrl: process.env.DATABASE_URL,
    testDatabaseUrl: process.env.TEST_DATABASE_URL,
  });
}
