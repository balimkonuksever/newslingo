import "server-only";

import { randomUUID } from "node:crypto";

import { z } from "zod";

import {
  ADMIN_ROLE,
  type Auth,
  MIN_PASSWORD_LENGTH,
} from "@/server/auth/config";
import { db } from "@/server/db/client";

// What the admin command does (ADR-003). Nothing here is reachable from a
// page: admins are created and reset only from the command line.

/** A refusal the admin command shows as it is, without a stack trace. */
export class AdminAccountError extends Error {}

export type AuthenticatorSetup = {
  /** The key to type into an authenticator app. */
  setupKey: string;
  /** The same key as a link that authenticator apps can open. */
  totpURI: string;
  /** One-time codes for signing in without the app. */
  backupCodes: string[];
  /** The session the setup runs in. Finishing the setup ends it. */
  session: Headers;
};

function normalizeEmail(email: string) {
  const address = email.trim().toLowerCase();

  if (!z.email().safeParse(address).success) {
    throw new AdminAccountError(`"${email}" is not an email address.`);
  }

  return address;
}

function checkPassword(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AdminAccountError(
      `The password needs at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }
}

async function newId(auth: Auth, model: "user" | "account") {
  const context = await auth.$context;

  return context.generateId({ model }) || randomUUID();
}

/** The Cookie header a browser would send after this response. */
function cookieHeader(response: Headers) {
  const pairs = response
    .getSetCookie()
    .map((setCookie) => setCookie.split(";")[0]?.trim() ?? "")
    .filter((pair) => /^[^=]+=.+/.test(pair));

  return new Headers({ cookie: pairs.join("; ") });
}

function hasErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "body" in error &&
    typeof error.body === "object" &&
    error.body !== null &&
    "code" in error.body &&
    error.body.code === code
  );
}

/**
 * Creates an admin, with the account and its password login written
 * together. The admin opens no admin page until an authenticator app is set
 * up, which comes next.
 */
export async function createAdmin(
  auth: Auth,
  { name, email, password }: { name: string; email: string; password: string },
) {
  const address = normalizeEmail(email);
  checkPassword(password);

  if (!name.trim()) {
    throw new AdminAccountError("The admin needs a name.");
  }

  if (await db.user.findUnique({ where: { email: address } })) {
    throw new AdminAccountError(`An account for ${address} already exists.`);
  }

  const context = await auth.$context;
  const id = await newId(auth, "user");

  return db.user.create({
    data: {
      id,
      name: name.trim(),
      email: address,
      role: ADMIN_ROLE,
      accounts: {
        create: {
          id: await newId(auth, "account"),
          providerId: "credential",
          accountId: id,
          password: await context.password.hash(password),
        },
      },
    },
    select: { id: true, email: true },
  });
}

/** Deletes an admin whose setup did not finish, with everything they own. */
export async function removeUnfinishedAdmin(id: string) {
  await db.user.delete({ where: { id } });
}

/**
 * Signs the admin in with their password and asks Better Auth for a new
 * authenticator secret, as a signed-in admin would. Two-factor sign-in starts
 * only when `finishAuthenticatorSetup` accepts a code from the app.
 */
export async function startAuthenticatorSetup(
  auth: Auth,
  { email, password }: { email: string; password: string },
): Promise<AuthenticatorSetup> {
  const signIn = await auth.api.signInEmail({
    body: { email: normalizeEmail(email), password },
    returnHeaders: true,
  });

  if ("twoFactorRedirect" in signIn.response) {
    throw new AdminAccountError(
      "This admin already has an authenticator app. Reset their sign-in first.",
    );
  }

  const session = cookieHeader(signIn.headers);
  const enrolment = await auth.api.enableTwoFactor({
    body: { password, method: "totp" },
    headers: session,
  });

  if (enrolment.method !== "totp") {
    throw new Error("Better Auth did not start an authenticator-app setup.");
  }

  return {
    setupKey: new URL(enrolment.totpURI).searchParams.get("secret") ?? "",
    totpURI: enrolment.totpURI,
    backupCodes: enrolment.backupCodes,
    session,
  };
}

/**
 * Checks a code from the newly set up app, which turns two-factor sign-in
 * on, then ends all of the admin's sessions: the setup session was opened
 * with the password alone.
 */
export async function finishAuthenticatorSetup(
  auth: Auth,
  { session, code }: { session: Headers; code: string },
) {
  const signedIn = await auth.api.getSession({ headers: session });

  if (!signedIn) {
    throw new Error("The setup session ended before a code was checked.");
  }

  try {
    await auth.api.verifyTOTP({ body: { code }, headers: session });
  } catch (error) {
    if (hasErrorCode(error, "INVALID_CODE")) {
      throw new AdminAccountError(
        "That is not the code the app shows now. Try the next one.",
      );
    }

    throw error;
  }

  await db.session.deleteMany({ where: { userId: signedIn.user.id } });
}

/**
 * Gives an admin a new password, removes their authenticator app and ends
 * every session, in one transaction. Setting up a new app comes next; until
 * then the admin opens no admin page.
 */
export async function resetAdminSignIn(
  auth: Auth,
  { email, password }: { email: string; password: string },
) {
  const address = normalizeEmail(email);
  checkPassword(password);

  const user = await db.user.findUnique({
    where: { email: address },
    select: { id: true, role: true },
  });

  if (!user || user.role !== ADMIN_ROLE) {
    throw new AdminAccountError(`No admin has the email ${address}.`);
  }

  const context = await auth.$context;
  const passwordHash = await context.password.hash(password);
  const accountId = await newId(auth, "account");

  await db.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.twoFactor.deleteMany({ where: { userId: user.id } });
    await tx.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false },
    });

    const { count } = await tx.account.updateMany({
      where: { userId: user.id, providerId: "credential" },
      data: { password: passwordHash },
    });

    if (count === 0) {
      await tx.account.create({
        data: {
          id: accountId,
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: passwordHash,
        },
      });
    }
  });
}
