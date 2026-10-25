import { execFileSync } from "node:child_process";

import {
  backupCodesFrom,
  codeFromApp,
  runAdminCommand,
  setupKeyFrom,
} from "../support/admin-command";
import { E2E_ADMINS_VARIABLE, type TestAdmin } from "./admins";

// `pnpm test:e2e` has already pointed DATABASE_URL at the test database; the
// reset script checks that again before deleting anything.
export default async function globalSetup() {
  execFileSync("pnpm", ["exec", "tsx", "scripts/reset-test-database.ts"], {
    stdio: "inherit",
  });

  // One admin per project, made with the admin command itself, so that the
  // projects' wrong codes and used backup codes never meet.
  const admins: Record<string, TestAdmin> = {};

  for (const project of ["desktop", "mobile"]) {
    const admin = {
      name: `Test Admin ${project}`,
      email: `admin-${project}@example.test`,
      password: "correct horse battery staple",
    };
    const { exitCode, output } = await runAdminCommand("create", [
      "yes",
      admin.name,
      admin.email,
      admin.password,
      admin.password,
      codeFromApp,
    ]);

    if (exitCode !== 0) {
      throw new Error(`The admin command failed:\n${output}`);
    }

    admins[project] = {
      ...admin,
      setupKey: setupKeyFrom(output),
      backupCodes: backupCodesFrom(output),
    };
  }

  // Workers inherit the environment the global setup leaves.
  process.env[E2E_ADMINS_VARIABLE] = JSON.stringify(admins);
}
