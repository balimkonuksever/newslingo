// Creates an admin, or gives one a new password and authenticator app, in
// the database named by DATABASE_URL (ADR-003). No page can do either.
//
//   pnpm admin:create   a new admin, with a password and an authenticator app
//   pnpm admin:reset    a new password and authenticator app for an admin
//
// Run it with the same BETTER_AUTH_SECRET as the site the admin signs in to:
// that secret encrypts the authenticator key. Passwords are typed at a hidden
// prompt, never passed as arguments, so they stay out of shell history. Piped
// input, one answer per line, is for automated tests.
//
// The server modules it shares with the site refuse to load outside a
// server, so the package scripts run it with `--conditions=react-server`.
import { createInterface } from "node:readline";
import { Writable } from "node:stream";

import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const actions = ["create", "reset"] as const;
const action = actions.find((name) => name === process.argv[2]);

if (!action) {
  console.error(`Use one of: ${actions.join(", ")}.`);
  process.exit(1);
}

// Loaded after the environment, which these modules read as they load.
const { getAuthEnv } = await import("@/lib/env");
const { isLocalDatabaseHost, parsePostgresUrl } =
  await import("@/lib/database-env");
const { getAuth } = await import("@/server/auth");
const accounts = await import("@/server/auth/admin-accounts");
const { db } = await import("@/server/db/client");

/** Asks one question at a time, hiding the answers to secret ones. */
function createPrompter() {
  const interactive = Boolean(process.stdin.isTTY);
  let hidden = false;
  // Typed characters echo through this stream, so a hidden answer shows nothing.
  const echo = new Writable({
    write(chunk, encoding, callback) {
      if (!hidden) {
        process.stdout.write(chunk, encoding);
      }

      callback();
    },
  });
  const input = createInterface({
    input: process.stdin,
    output: echo,
    terminal: interactive,
  });
  const answered: string[] = [];
  const waiting: Array<(line: string | undefined) => void> = [];
  let ended = false;

  input.on("line", (line) => {
    const next = waiting.shift();

    if (next) {
      next(line);
    } else {
      answered.push(line);
    }
  });
  input.on("close", () => {
    ended = true;

    for (const next of waiting.splice(0)) {
      next(undefined);
    }
  });

  async function ask(question: string, { secret = false } = {}) {
    process.stdout.write(question);
    hidden = secret && interactive;

    const line =
      answered.shift() ??
      (ended
        ? undefined
        : await new Promise<string | undefined>((resolve) => {
            waiting.push(resolve);
          }));

    if (hidden) {
      process.stdout.write("\n");
      hidden = false;
    }

    if (line === undefined) {
      throw new accounts.AdminAccountError(
        "The input ended before every question was answered.",
      );
    }

    return line;
  }

  return { ask, input, close: () => input.close() };
}

const prompter = createPrompter();
const { ask } = prompter;
const auth = getAuth();

/** Set while a new admin exists but their setup has not finished. */
let unfinishedAdminId: string | undefined;

async function removeUnfinishedAdmin() {
  if (unfinishedAdminId) {
    await accounts.removeUnfinishedAdmin(unfinishedAdminId);
    unfinishedAdminId = undefined;
    console.log("The admin was not created.");
  }
}

prompter.input.on("SIGINT", () => {
  console.log("\nStopped.");
  void removeUnfinishedAdmin().finally(() => process.exit(130));
});

async function confirmTarget() {
  const databaseUrl = parsePostgresUrl(
    "DATABASE_URL",
    process.env.DATABASE_URL,
  );
  const { hostname, port, pathname } = new URL(databaseUrl);
  const database = decodeURIComponent(pathname.slice(1));

  console.log(
    `${action === "create" ? "Creating an admin" : "Resetting an admin's sign-in"} in database "${database}" at ${hostname}:${port || "5432"}, for the site at ${getAuthEnv().baseURL}.`,
  );

  const local = isLocalDatabaseHost(hostname);
  const expected = local ? "yes" : hostname;
  const answer = await ask(
    local
      ? 'Type "yes" to go on: '
      : `This database is not on this machine. Type its host, ${hostname}, to go on: `,
  );

  if (answer.trim() !== expected) {
    throw new accounts.AdminAccountError("Stopped. Nothing was changed.");
  }
}

async function askPassword(question: string) {
  const password = await ask(question, { secret: true });

  if ((await ask("Same password again: ", { secret: true })) !== password) {
    throw new accounts.AdminAccountError(
      "The passwords are different. Nothing was changed.",
    );
  }

  return password;
}

async function setUpAuthenticator(email: string, password: string) {
  const setup = await accounts.startAuthenticatorSetup(auth, {
    email,
    password,
  });

  console.log(
    [
      "",
      "Add this account to an authenticator app, such as Google Authenticator, 1Password or Authy.",
      `Setup key: ${setup.setupKey.match(/.{1,4}/g)?.join(" ") ?? ""}`,
      `Setup link, for apps that take one: ${setup.totpURI}`,
      "",
      "Keep these backup codes somewhere safe. Each one signs in once without the app:",
      ...setup.backupCodes.map((code) => `  ${code}`),
      "",
    ].join("\n"),
  );

  for (let attempt = 1; ; attempt += 1) {
    const code = (await ask("Code from the app: ")).replace(/\s/g, "");

    try {
      await accounts.finishAuthenticatorSetup(auth, {
        session: setup.session,
        code,
      });

      return;
    } catch (error) {
      if (error instanceof accounts.AdminAccountError && attempt < 3) {
        console.log(error.message);
        continue;
      }

      throw error;
    }
  }
}

let failed = false;
/** Set while a reset admin has no authenticator app yet. */
let resetUnfinished = false;

try {
  await confirmTarget();

  if (action === "create") {
    const name = await ask("Name: ");
    const email = await ask("Email: ");
    const password = await askPassword("Password: ");
    const admin = await accounts.createAdmin(auth, { name, email, password });
    unfinishedAdminId = admin.id;

    await setUpAuthenticator(admin.email, password);
    unfinishedAdminId = undefined;
    console.log(
      `Done. ${admin.email} signs in with the password and a code from the app.`,
    );
  } else {
    const email = await ask("Email: ");
    const password = await askPassword("New password: ");

    await accounts.resetAdminSignIn(auth, { email, password });
    resetUnfinished = true;
    console.log(
      "The new password is set, the old authenticator app is removed, and every session has ended.",
    );

    await setUpAuthenticator(email, password);
    resetUnfinished = false;
    console.log("Done. The admin signs in with the new password and app.");
  }
} catch (error) {
  failed = true;

  if (error instanceof accounts.AdminAccountError) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  await removeUnfinishedAdmin();

  if (resetUnfinished) {
    console.log(
      "The admin has no authenticator app now, so they open no admin page. Run pnpm admin:reset again.",
    );
  }
} finally {
  prompter.close();
  await db.$disconnect();
}

process.exit(failed ? 1 : 0);
