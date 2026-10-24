import "server-only";

import { getAuthEnv } from "@/lib/env";
import { type Auth, createAuth } from "@/server/auth/config";

let configured: Auth | undefined;

/**
 * The site's admin sign-in, created on first use from the environment.
 * Changing the environment needs a server restart.
 */
export function getAuth(): Auth {
  configured ??= createAuth(getAuthEnv());

  return configured;
}
