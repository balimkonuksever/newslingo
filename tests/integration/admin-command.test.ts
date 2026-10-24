import { beforeEach, describe, expect, it } from "vitest";

import { getAdminAccess } from "@/server/auth/access";
import { createAuth } from "@/server/auth/config";
import { db } from "@/server/db/client";

import {
  type Answer,
  codeFromApp,
  runAdminCommand,
} from "../support/admin-command";
import { nextRequest } from "../support/sign-in";
import { resetDatabase } from "./database";

// Runs the admin command as an admin would, against the test database.

const SECRET = "integration-tests-only-secret-0123456789";
const BASE_URL = "http://localhost:3100";
const auth = createAuth({ secret: SECRET, baseURL: BASE_URL });

const ADMIN = {
  name: "Test Admin",
  email: "admin@example.test",
  password: "correct horse battery staple",
};

beforeEach(resetDatabase);

/** Runs the command with the same secret as the `auth` instance above. */
function runCommand(action: "create" | "reset", answers: Answer[]) {
  return runAdminCommand(action, answers, {
    ...process.env,
    BETTER_AUTH_SECRET: SECRET,
    BETTER_AUTH_URL: BASE_URL,
  });
}

const createAnswers = (code: Answer = codeFromApp): Answer[] => [
  "yes",
  ADMIN.name,
  ADMIN.email,
  ADMIN.password,
  ADMIN.password,
  code,
];

/** Signs in with a password and a code from the setup key in `output`. */
async function signInWithCode(password: string, output: string) {
  const { headers, response } = await auth.api.signInEmail({
    body: { email: ADMIN.email, password },
    returnHeaders: true,
  });
  expect(response).toMatchObject({ twoFactorRedirect: true });

  const challenge = nextRequest(headers);
  const verified = await auth.api.verifyTOTP({
    body: { code: codeFromApp(output) },
    headers: challenge,
    returnHeaders: true,
  });

  return getAdminAccess(auth, nextRequest(verified.headers, challenge));
}

describe("the admin command", { timeout: 60_000 }, () => {
  it("creates an admin who signs in with the password and a code from the app", async () => {
    const { exitCode, output } = await runCommand("create", createAnswers());

    expect(output).toContain('Creating an admin in database "newslingo_test"');
    expect(exitCode).toBe(0);
    await expect(signInWithCode(ADMIN.password, output)).resolves.toMatchObject(
      { status: "admin", admin: { email: ADMIN.email } },
    );
  });

  it("changes nothing unless the database is confirmed", async () => {
    const { exitCode, output } = await runCommand("create", ["no"]);

    expect(exitCode).toBe(1);
    expect(output).toContain("Nothing was changed.");
    expect(await db.user.count()).toBe(0);
  });

  it("changes nothing when the passwords differ", async () => {
    const { exitCode, output } = await runCommand("create", [
      "yes",
      ADMIN.name,
      ADMIN.email,
      ADMIN.password,
      "a different long passphrase",
    ]);

    expect(exitCode).toBe(1);
    expect(output).toContain("The passwords are different.");
    expect(await db.user.count()).toBe(0);
  });

  it("removes the new admin when no code from the app is right", async () => {
    const { exitCode, output } = await runCommand("create", [
      ...createAnswers("000000"),
      "000000",
      "000000",
    ]);

    expect(exitCode).toBe(1);
    expect(output).toContain("The admin was not created.");
    expect(await db.user.count()).toBe(0);
  });

  it("resets an admin's password and authenticator app", async () => {
    const created = await runCommand("create", createAnswers());
    expect(created.exitCode).toBe(0);
    const newPassword = "a different long passphrase";

    const { exitCode, output } = await runCommand("reset", [
      "yes",
      ADMIN.email,
      newPassword,
      newPassword,
      codeFromApp,
    ]);

    expect(exitCode).toBe(0);
    expect(output).toContain("every session has ended");
    await expect(
      auth.api.signInEmail({
        body: { email: ADMIN.email, password: ADMIN.password },
      }),
    ).rejects.toMatchObject({ body: { code: "INVALID_EMAIL_OR_PASSWORD" } });
    await expect(signInWithCode(newPassword, output)).resolves.toMatchObject({
      status: "admin",
    });
  });
});
