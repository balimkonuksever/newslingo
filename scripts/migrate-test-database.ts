import { spawn } from "node:child_process";

import nextEnv from "@next/env";

import { validateTestDatabaseUrls } from "../src/lib/database-env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const { TEST_DATABASE_URL } = validateTestDatabaseUrls({
  databaseUrl: process.env.DATABASE_URL,
  testDatabaseUrl: process.env.TEST_DATABASE_URL,
});

const exitCode = await new Promise<number>((resolve, reject) => {
  const child = spawn("pnpm", ["exec", "prisma", "migrate", "deploy"], {
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
