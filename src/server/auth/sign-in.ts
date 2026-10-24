import "server-only";

import { z } from "zod";

import { getAdminAccess } from "@/server/auth/access";
import type { Auth } from "@/server/auth/config";
import { cookieHeader, hasErrorCode } from "@/server/auth/responses";
import {
  clientAddress,
  createRateLimiter,
  type RateLimitDecision,
  type RateLimiter,
} from "@/server/rate-limit";

// The steps of an admin's sign-in, called from the sign-in pages' server
// actions (ADR-003). Better Auth has no HTTP endpoints here: these server-side
// calls are the only way in, so its own rate limiter, which guards only those
// endpoints, never runs. The limits below take its place.
//
// Each step returns Better Auth's response headers. Inside a server action
// the `nextCookies` plugin has already written their cookies to the
// response; tests use them to play the browser's part.

export type SignInLimits = {
  /** Failed password attempts for one email address. */
  byEmail: RateLimiter;
  /** Failed password and code attempts from one client address. */
  byClient: RateLimiter;
};

const FIFTEEN_MINUTES = 15 * 60_000;

/**
 * Only failures count, so an admin who signs in correctly is never slowed
 * down. Ten wrong codes also lock the account for 15 minutes in Better Auth
 * itself, in the database.
 */
export function createSignInLimits(): SignInLimits {
  return {
    byEmail: createRateLimiter({ limit: 10, windowMs: FIFTEEN_MINUTES }),
    byClient: createRateLimiter({ limit: 20, windowMs: FIFTEEN_MINUTES }),
  };
}

let limits: SignInLimits | undefined;

/** The limits shared by every sign-in in this server process. */
export function getSignInLimits() {
  limits ??= createSignInLimits();

  return limits;
}

export type PasswordStep =
  | { status: "code-needed"; headers: Headers }
  | { status: "refused"; message: string };

export type CodeStep =
  | { status: "signed-in"; headers: Headers }
  | { status: "expired" }
  | { status: "refused"; message: string };

const passwordForm = z.object({
  email: z.string().trim().toLowerCase().min(1).max(254),
  password: z.string().min(1).max(128),
});

// Up to 32 characters covers a six-digit code and a backup code, with spaces.
const codeForm = z.object({ code: z.string().trim().min(1).max(32) });

function refused(message: string) {
  return { status: "refused", message } as const;
}

function tooManyAttempts(decision: RateLimitDecision) {
  const minutes = decision.allowed
    ? 1
    : Math.ceil(decision.retryAfterSeconds / 60);

  return refused(
    `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
  );
}

/**
 * Checks an admin's email and password. A correct pair leaves the
 * two-factor cookie that the code step needs.
 */
export async function signInWithPassword(
  auth: Auth,
  signInLimits: SignInLimits,
  requestHeaders: Headers,
  input: { email: unknown; password: unknown },
): Promise<PasswordStep> {
  const form = passwordForm.safeParse(input);

  if (!form.success) {
    return refused("Enter your email address and password.");
  }

  const { email, password } = form.data;
  const client = clientAddress(requestHeaders);
  const blocked = [
    signInLimits.byEmail.check(email),
    signInLimits.byClient.check(client),
  ].find((decision) => !decision.allowed);

  if (blocked) {
    return tooManyAttempts(blocked);
  }

  let signIn;

  try {
    signIn = await auth.api.signInEmail({
      body: { email, password },
      headers: requestHeaders,
      returnHeaders: true,
    });
  } catch (error) {
    if (hasErrorCode(error, "INVALID_EMAIL_OR_PASSWORD")) {
      signInLimits.byEmail.take(email);
      signInLimits.byClient.take(client);

      return refused("That email address and password don’t match an admin.");
    }

    throw error;
  }

  if ("twoFactorRedirect" in signIn.response) {
    return { status: "code-needed", headers: signIn.headers };
  }

  // Only an account without an authenticator app gets a session from its
  // password alone. It opens nothing, so end the session at once.
  await auth.api.signOut({ headers: cookieHeader(signIn.headers) });

  return refused(
    "This account has no authenticator app, so it can’t sign in. An admin can set one up with pnpm admin:reset.",
  );
}

/**
 * Checks the code from the admin's authenticator app, or one of their backup
 * codes, after the password step. Success leaves the session cookie.
 */
export async function verifySignInCode(
  auth: Auth,
  signInLimits: SignInLimits,
  requestHeaders: Headers,
  input: { code: unknown },
): Promise<CodeStep> {
  const form = codeForm.safeParse(input);
  const code = form.success ? form.data.code.replace(/\s/g, "") : "";

  if (!code) {
    return refused("Enter the code from your authenticator app.");
  }

  const client = clientAddress(requestHeaders);
  const blocked = signInLimits.byClient.check(client);

  if (!blocked.allowed) {
    return tooManyAttempts(blocked);
  }

  let verified;

  try {
    verified = /^\d{6}$/.test(code)
      ? await auth.api.verifyTOTP({
          body: { code },
          headers: requestHeaders,
          returnHeaders: true,
        })
      : await auth.api.verifyBackupCode({
          body: { code },
          headers: requestHeaders,
          returnHeaders: true,
        });
  } catch (error) {
    if (hasErrorCode(error, "INVALID_TWO_FACTOR_COOKIE")) {
      return { status: "expired" };
    }

    if (hasErrorCode(error, "ACCOUNT_TEMPORARILY_LOCKED")) {
      return refused(
        "Too many wrong codes. The account is locked for 15 minutes.",
      );
    }

    if (
      hasErrorCode(error, "INVALID_CODE") ||
      hasErrorCode(error, "INVALID_BACKUP_CODE")
    ) {
      signInLimits.byClient.take(client);

      return refused(
        "That code isn’t right. Enter the one your app shows now, or a backup code.",
      );
    }

    throw error;
  }

  const session = cookieHeader(verified.headers);
  const access = await getAdminAccess(auth, session);

  if (access.status !== "admin") {
    await auth.api.signOut({ headers: session });

    return refused("This account can’t open admin pages.");
  }

  return { status: "signed-in", headers: verified.headers };
}

/** Ends the session the request carries, if any. */
export async function signOutAdmin(auth: Auth, requestHeaders: Headers) {
  await auth.api.signOut({ headers: requestHeaders });
}
