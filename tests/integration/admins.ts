import { expect } from "vitest";

import {
  createAdmin,
  finishAuthenticatorSetup,
  startAuthenticatorSetup,
} from "@/server/auth/admin-accounts";
import { createAuth } from "@/server/auth/config";

import { authenticatorCode, nextRequest } from "../support/sign-in";

// Admins for integration tests, made the way the admin command makes them.

export const testAuth = createAuth({
  secret: "integration-tests-only-secret-0123456789",
  baseURL: "http://localhost:3100",
});

export const TEST_ADMIN = {
  name: "Test Admin",
  email: "admin@example.test",
  password: "correct horse battery staple",
};

export async function signIn(
  email = TEST_ADMIN.email,
  password = TEST_ADMIN.password,
) {
  const { headers, response } = await testAuth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });

  return { session: nextRequest(headers), response };
}

/** Creates an admin and sets up their authenticator app. */
export async function createFinishedAdmin() {
  const admin = await createAdmin(testAuth, TEST_ADMIN);
  const setup = await startAuthenticatorSetup(testAuth, TEST_ADMIN);
  await finishAuthenticatorSetup(testAuth, {
    session: setup.session,
    code: authenticatorCode(setup.setupKey),
  });

  return { ...admin, setupKey: setup.setupKey, backupCodes: setup.backupCodes };
}

/** Signs in as an admin with an authenticator does: password, then code. */
export async function signInWithCode(setupKey: string) {
  const { session: challenge, response } = await signIn();
  expect(response).toMatchObject({ twoFactorRedirect: true });

  const verified = await testAuth.api.verifyTOTP({
    body: { code: authenticatorCode(setupKey) },
    headers: challenge,
    returnHeaders: true,
  });

  return nextRequest(verified.headers, challenge);
}
