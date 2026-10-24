import { spawn } from "node:child_process";

import { beforeEach, describe, expect, it } from "vitest";

import { getAdminAccess } from "@/server/auth/access";
import { createAuth } from "@/server/auth/config";
import { db } from "@/server/db/client";

import { authenticatorCode, nextRequest } from "../support/sign-in";
import { resetDatabase } from "./database";

// Runs the admin command as an admin would, against the test database,
// answering each prompt when it appears.

const SECRET = "integration-tests-only-secret-0123456789";
const BASE_URL = "http://localhost:3100";
const auth = createAuth({ secret: SECRET, baseURL: BASE_URL });

const ADMIN = {
  name: "Test Admin",
  email: "admin@example.test",
  password: "correct horse battery staple",
};

beforeEach(resetDatabase);

/** An answer, or a way to work one out from what the command has printed. */
type Answer = string | ((output: string) => string);

/** The code for the setup key the command printed last. */
function codeFromApp(output: string) {
  const setupKey = [...output.matchAll(/Setup key: ([A-Z2-7 ]+)/g)].at(-1)?.[1];

  return authenticatorCode(setupKey?.replace(/ /g, "") ?? "");
}

/**
 * Runs `scripts/admin-account.ts` the way `pnpm admin:create` and
 * `pnpm admin:reset` do, answering prompts in order. When the answers run
 * out, the input ends.
 */
function runCommand(action: "create" | "reset", answers: Answer[]) {
  const child = spawn(
    "node_modules/.bin/tsx",
    ["--conditions=react-server", "scripts/admin-account.ts", action],
    {
      // DATABASE_URL already names the test database.
      env: {
        ...process.env,
        BETTER_AUTH_SECRET: SECRET,
        BETTER_AUTH_URL: BASE_URL,
      },
    },
  );
  const pending = [...answers];
  let output = "";
  let answeredAt = 0;

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    output += chunk;
  });
  child.stdout.on("data", (chunk: string) => {
    output += chunk;

    // A prompt is the last thing printed, ending in ": ", until it is answered.
    if (output.length > answeredAt && output.endsWith(": ")) {
      const answer = pending.shift();
      answeredAt = output.length;

      if (answer === undefined) {
        child.stdin.end();
      } else {
        child.stdin.write(
          `${typeof answer === "function" ? answer(output) : answer}\n`,
        );
      }
    }
  });

  return new Promise<{ exitCode: number | null; output: string }>((resolve) => {
    child.on("close", (exitCode) => resolve({ exitCode, output }));
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
