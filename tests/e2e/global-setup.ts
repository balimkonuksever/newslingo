import { execFileSync } from "node:child_process";

// `pnpm test:e2e` has already pointed DATABASE_URL at the test database; the
// reset script checks that again before deleting anything.
export default function globalSetup() {
  execFileSync("pnpm", ["exec", "tsx", "scripts/reset-test-database.ts"], {
    stdio: "inherit",
  });
}
