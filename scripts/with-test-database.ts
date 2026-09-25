// Runs one command against the isolated test database:
//
//   tsx scripts/with-test-database.ts <command> [args...]
//
// DATABASE_URL is replaced with TEST_DATABASE_URL only after the guard confirms
// that it is a separate database whose name carries a `test` token.
import { spawn } from "node:child_process";

import nextEnv from "@next/env";

import { validateTestDatabaseUrls } from "../src/lib/database-env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const [command, ...args] = process.argv.slice(2);

if (!command) {
  throw new Error(
    "Usage: tsx scripts/with-test-database.ts <command> [args...]",
  );
}

const { TEST_DATABASE_URL } = validateTestDatabaseUrls({
  databaseUrl: process.env.DATABASE_URL,
  testDatabaseUrl: process.env.TEST_DATABASE_URL,
});

const exitCode = await new Promise<number>((resolve, reject) => {
  const child = spawn("pnpm", ["exec", command, ...args], {
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
    },
    stdio: "inherit",
  });

  child.once("error", reject);
  child.once("exit", (code) => resolve(code ?? 1));
});

process.exitCode = exitCode;
