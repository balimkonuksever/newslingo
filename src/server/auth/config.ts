import "server-only";

import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";

import { db } from "@/server/db/client";

export type AuthSettings = {
  /**
   * Signs session cookies and encrypts authenticator secrets. At least 32
   * characters.
   */
  secret: string;
  /** The site's origin, such as `http://localhost:3000`. */
  baseURL: string;
};

/** The one role there is. An account without it opens no admin page. */
export const ADMIN_ROLE = "admin";

export const MIN_PASSWORD_LENGTH = 12;

/**
 * Admin sign-in (ADR-003): an email, a password and a code from an
 * authenticator app. Public sign-up is off, so an admin account can only be
 * created on the server. Sessions live in PostgreSQL, where deleting a row
 * revokes one.
 */
export function createAuth({ secret, baseURL }: AuthSettings) {
  return betterAuth({
    appName: "Newslingo",
    secret,
    baseURL,
    // The minimal build leaves out Kysely: every query goes through Prisma.
    database: prismaAdapter(db, { provider: "postgresql", transaction: true }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
    },
    user: {
      additionalFields: {
        // Only the admin command sets it: no request can.
        role: { type: "string", required: false, input: false },
      },
    },
    // nextCookies writes the cookies of sign-in calls made in server actions.
    // It must come last, after every plugin that sets cookies.
    plugins: [twoFactor(), nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
