import { afterAll } from "vitest";

import { requireTestDatabaseUrl } from "@/lib/database-env";

// `pnpm test:integration` points DATABASE_URL at the test database once its
// guard passes. Checking again here stops a direct `vitest --project
// integration` run from wiping any other database.
requireTestDatabaseUrl("DATABASE_URL", process.env.DATABASE_URL);

afterAll(async () => {
  const { db } = await import("@/server/db/client");

  await db.$disconnect();
});
