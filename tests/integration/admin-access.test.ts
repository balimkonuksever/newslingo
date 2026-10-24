import { beforeEach, describe, expect, it } from "vitest";

import { getAdminAccess } from "@/server/auth/access";
import {
  AdminAccountError,
  createAdmin,
  finishAuthenticatorSetup,
  resetAdminSignIn,
  startAuthenticatorSetup,
} from "@/server/auth/admin-accounts";
import { db } from "@/server/db/client";

import { authenticatorCode } from "../support/sign-in";
import {
  createFinishedAdmin,
  signIn,
  signInWithCode,
  TEST_ADMIN as ADMIN,
  testAuth as auth,
} from "./admins";
import { resetDatabase } from "./database";

// The access check that every admin page, action and route handler calls,
// and the account functions behind the admin command (ADR-003).

beforeEach(resetDatabase);

describe("getAdminAccess", () => {
  it("turns away a request without a session", async () => {
    await expect(getAdminAccess(auth, new Headers())).resolves.toEqual({
      status: "signed-out",
    });
  });

  it("turns away a signed-in account without the admin role", async () => {
    // As if public sign-up had been switched on by mistake.
    const context = await auth.$context;
    const user = await context.internalAdapter.createUser(
      { name: "Visitor", email: "visitor@example.test" },
      { method: "email-password" },
    );
    await context.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: await context.password.hash(ADMIN.password),
    });

    const { session } = await signIn("visitor@example.test");

    await expect(getAdminAccess(auth, session)).resolves.toEqual({
      status: "not-admin",
    });
  });

  it("turns away an admin without an authenticator app", async () => {
    await createAdmin(auth, ADMIN);
    const { session } = await signIn();

    await expect(getAdminAccess(auth, session)).resolves.toEqual({
      status: "no-authenticator",
    });
  });

  it("lets in an admin who signed in with a password and a code, and names only them", async () => {
    const admin = await createFinishedAdmin();
    const session = await signInWithCode(admin.setupKey);

    await expect(getAdminAccess(auth, session)).resolves.toEqual({
      status: "admin",
      admin: { id: admin.id, name: ADMIN.name, email: ADMIN.email },
    });
  });
});

describe("the admin command's account functions", () => {
  it("creates an admin with a hashed password login", async () => {
    const admin = await createAdmin(auth, {
      ...ADMIN,
      email: " Admin@Example.TEST ",
    });

    expect(admin.email).toBe(ADMIN.email);

    const stored = await db.user.findUniqueOrThrow({
      where: { id: admin.id },
      include: { accounts: true },
    });
    expect(stored).toMatchObject({ role: "admin", twoFactorEnabled: false });
    expect(stored.accounts).toEqual([
      expect.objectContaining({
        providerId: "credential",
        accountId: admin.id,
      }),
    ]);
    expect(stored.accounts[0]?.password).not.toContain(ADMIN.password);
  });

  it("refuses a second account for an address, a short password and a non-address", async () => {
    await createAdmin(auth, ADMIN);

    await expect(
      createAdmin(auth, { ...ADMIN, email: "ADMIN@example.test" }),
    ).rejects.toThrow(AdminAccountError);
    await expect(
      createAdmin(auth, {
        ...ADMIN,
        email: "other@example.test",
        password: "too short",
      }),
    ).rejects.toThrow(/at least 12 characters/);
    await expect(
      createAdmin(auth, { ...ADMIN, email: "not an address" }),
    ).rejects.toThrow(/not an email address/);

    expect(await db.user.count()).toBe(1);
  });

  it("turns on two-factor sign-in only for a correct code, then ends the setup session", async () => {
    await createAdmin(auth, ADMIN);
    const setup = await startAuthenticatorSetup(auth, ADMIN);

    await expect(
      finishAuthenticatorSetup(auth, {
        session: setup.session,
        code: "000000",
      }),
    ).rejects.toThrow(AdminAccountError);
    expect(await db.user.findFirstOrThrow()).toMatchObject({
      twoFactorEnabled: false,
    });

    await finishAuthenticatorSetup(auth, {
      session: setup.session,
      code: authenticatorCode(setup.setupKey),
    });

    expect(await db.user.findFirstOrThrow()).toMatchObject({
      twoFactorEnabled: true,
    });
    expect(await db.session.count()).toBe(0);
    expect(setup.backupCodes).toHaveLength(10);
  });

  it("resets an admin to a new password, with no authenticator and no sessions", async () => {
    const admin = await createFinishedAdmin();
    await signInWithCode(admin.setupKey);
    const newPassword = "a different long passphrase";

    await resetAdminSignIn(auth, { email: ADMIN.email, password: newPassword });

    expect(await db.session.count()).toBe(0);
    expect(await db.twoFactor.count()).toBe(0);
    expect(
      await db.user.findUniqueOrThrow({ where: { id: admin.id } }),
    ).toMatchObject({ twoFactorEnabled: false });
    await expect(signIn(ADMIN.email, ADMIN.password)).rejects.toMatchObject({
      body: { code: "INVALID_EMAIL_OR_PASSWORD" },
    });

    const { session } = await signIn(ADMIN.email, newPassword);
    await expect(getAdminAccess(auth, session)).resolves.toEqual({
      status: "no-authenticator",
    });
  });

  it("resets admins only", async () => {
    await expect(
      resetAdminSignIn(auth, {
        email: "nobody@example.test",
        password: ADMIN.password,
      }),
    ).rejects.toThrow(/No admin has the email/);
  });

  it("stores no role but admin", async () => {
    const admin = await createAdmin(auth, ADMIN);

    await expect(
      db.user.update({ where: { id: admin.id }, data: { role: "editor" } }),
    ).rejects.toThrow(/User_role_known/);
  });
});
