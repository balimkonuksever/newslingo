import "server-only";

import { z } from "zod";

import { parsePostgresUrl, validateTestDatabaseUrls } from "@/lib/database-env";

function describeIssues(error: z.ZodError) {
  return error.issues
    .map(
      (issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`,
    )
    .join("; ");
}

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
  throw new Error(
    `Invalid environment configuration: ${describeIssues(result.error)}`,
  );
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

// A blank value in an env file means "not set".
const unsetIfBlank = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const dictionaryEnvironmentSchema = z
  .object({
    /**
     * Who answers words without an editorial entry. `none`, the default,
     * asks nobody: the reader sees that the word has no entry yet.
     */
    DICTIONARY_PROVIDER: z.preprocess(
      unsetIfBlank,
      z.enum(["none", "anthropic", "fixture"]).default("none"),
    ),
    DICTIONARY_MODEL: z.preprocess(
      unsetIfBlank,
      z.string().trim().default("claude-opus-5"),
    ),
    /** The kill switch: serve cached entries and look up nothing new. */
    DICTIONARY_CACHE_ONLY: z.preprocess(
      unsetIfBlank,
      z.enum(["true", "false"]).default("false"),
    ),
    ANTHROPIC_API_KEY: z.preprocess(unsetIfBlank, z.string().optional()),
  })
  .superRefine((settings, context) => {
    if (
      settings.DICTIONARY_PROVIDER === "anthropic" &&
      env.NODE_ENV === "test"
    ) {
      context.addIssue({
        code: "custom",
        path: ["DICTIONARY_PROVIDER"],
        message:
          "must not be anthropic in tests, which never call a live model",
      });
    }

    if (
      settings.DICTIONARY_PROVIDER === "anthropic" &&
      !settings.ANTHROPIC_API_KEY
    ) {
      context.addIssue({
        code: "custom",
        path: ["ANTHROPIC_API_KEY"],
        message: "is required when DICTIONARY_PROVIDER is anthropic",
      });
    }
  })
  .transform((settings) => ({
    provider: settings.DICTIONARY_PROVIDER,
    model: settings.DICTIONARY_MODEL,
    cacheOnly: settings.DICTIONARY_CACHE_ONLY === "true",
    anthropicApiKey: settings.ANTHROPIC_API_KEY,
  }));

/**
 * Dictionary settings, validated when first needed so that builds and pages
 * without word lookups run without an API key.
 */
export function getDictionaryEnv() {
  const settings = dictionaryEnvironmentSchema.safeParse({
    DICTIONARY_PROVIDER: process.env.DICTIONARY_PROVIDER,
    DICTIONARY_MODEL: process.env.DICTIONARY_MODEL,
    DICTIONARY_CACHE_ONLY: process.env.DICTIONARY_CACHE_ONLY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  });

  if (!settings.success) {
    throw new Error(
      `Invalid dictionary configuration: ${describeIssues(settings.error)}`,
    );
  }

  return Object.freeze(settings.data);
}
