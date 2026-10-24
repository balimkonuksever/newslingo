import { beforeEach, describe, expect, it } from "vitest";

import { getAdminAccess } from "@/server/auth/access";
import { createAdmin } from "@/server/auth/admin-accounts";
import {
  createSignInLimits,
  type SignInLimits,
  signInWithPassword,
  signOutAdmin,
  verifySignInCode,
} from "@/server/auth/sign-in";
import { db } from "@/server/db/client";
import { createRateLimiter } from "@/server/rate-limit";

import { authenticatorCode, nextRequest } from "../support/sign-in";
import {
  createFinishedAdmin,
  TEST_ADMIN as ADMIN,
  testAuth as auth,
} from "./admins";
import { resetDatabase } from "./database";

// The sign-in steps behind the admin sign-in pages' server actions (ADR-003).

let limits: SignInLimits;

beforeEach(async () => {
  await resetDatabase();
  limits = createSignInLimits();
});

/** A request from one browser, carrying the cookies it holds. */
function fromBrowser(cookies = new Headers()) {
  const headers = new Headers(cookies);
  headers.set("x-forwarded-for", "203.0.113.7");

  return headers;
}

function submitPassword(password = ADMIN.password) {
  return signInWithPassword(auth, limits, fromBrowser(), {
    email: ADMIN.email,
    password,
  });
}

/** The password step, then the request the code page sends. */
async function codeRequest() {
  const result = await submitPassword();

  if (result.status !== "code-needed") {
    throw new Error(`Expected the code step, got ${JSON.stringify(result)}`);
  }

  return fromBrowser(nextRequest(result.headers));
}

function submitCode(request: Headers, code: string) {
  return verifySignInCode(auth, limits, request, { code });
}

describe("signInWithPassword", () => {
  it("asks an admin for their code after a correct password", async () => {
    await createFinishedAdmin();

    await expect(submitPassword()).resolves.toMatchObject({
      status: "code-needed",
    });
    expect(await db.session.count()).toBe(0);
  });

  it("refuses a wrong password and an empty form", async () => {
    await createFinishedAdmin();

    await expect(submitPassword("not the password")).resolves.toEqual({
      status: "refused",
      message: "That email address and password don’t match an admin.",
    });
    await expect(
      signInWithPassword(auth, limits, fromBrowser(), {
        email: "",
        password: null,
      }),
    ).resolves.toEqual({
      status: "refused",
      message: "Enter your email address and password.",
    });
  });

  it("stops trying an address after too many wrong passwords, but never counts a right one", async () => {
    await createFinishedAdmin();
    limits = {
      ...limits,
      byEmail: createRateLimiter({ limit: 2, windowMs: 60_000 }),
    };

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(submitPassword()).resolves.toMatchObject({
        status: "code-needed",
      });
    }

    await submitPassword("wrong once");
    await submitPassword("wrong twice");

    await expect(submitPassword()).resolves.toEqual({
      status: "refused",
      message: "Too many failed attempts. Try again in 1 minute.",
    });
  });

  it("refuses an admin without an authenticator app and ends the session", async () => {
    await createAdmin(auth, ADMIN);

    const result = await submitPassword();

    expect(result).toMatchObject({
      status: "refused",
      message: expect.stringContaining("no authenticator app"),
    });
    expect(await db.session.count()).toBe(0);
  });
});

describe("verifySignInCode", () => {
  it("signs an admin in with the code from their app", async () => {
    const admin = await createFinishedAdmin();
    const result = await submitCode(
      await codeRequest(),
      authenticatorCode(admin.setupKey),
    );

    expect(result.status).toBe("signed-in");
    if (result.status === "signed-in") {
      await expect(
        getAdminAccess(auth, nextRequest(result.headers)),
      ).resolves.toMatchObject({ status: "admin", admin: { id: admin.id } });
    }
  });

  it("signs an admin in with a backup code, once", async () => {
    const admin = await createFinishedAdmin();
    const [backupCode = ""] = admin.backupCodes;

    await expect(
      submitCode(await codeRequest(), backupCode),
    ).resolves.toMatchObject({ status: "signed-in" });
    await expect(
      submitCode(await codeRequest(), backupCode),
    ).resolves.toMatchObject({
      status: "refused",
      message: expect.stringContaining("That code isn’t right"),
    });
  });

  it("refuses a wrong code and stops a client after too many", async () => {
    const admin = await createFinishedAdmin();
    limits = {
      ...limits,
      byClient: createRateLimiter({ limit: 1, windowMs: 60_000 }),
    };
    const request = await codeRequest();

    await expect(submitCode(request, "000000")).resolves.toMatchObject({
      status: "refused",
      message: expect.stringContaining("That code isn’t right"),
    });
    await expect(
      submitCode(request, authenticatorCode(admin.setupKey)),
    ).resolves.toMatchObject({
      status: "refused",
      message: expect.stringContaining("Too many failed attempts"),
    });
  });

  it("sends a visitor who skipped the password step back to the start", async () => {
    await createFinishedAdmin();

    await expect(submitCode(fromBrowser(), "123456")).resolves.toEqual({
      status: "expired",
    });
  });

  it("turns away an account that is no longer an admin, even with a right code", async () => {
    const admin = await createFinishedAdmin();
    await db.user.update({ where: { id: admin.id }, data: { role: null } });

    await expect(
      submitCode(await codeRequest(), authenticatorCode(admin.setupKey)),
    ).resolves.toEqual({
      status: "refused",
      message: "This account can’t open admin pages.",
    });
    expect(await db.session.count()).toBe(0);
  });
});

describe("signOutAdmin", () => {
  it("ends the admin's session", async () => {
    const admin = await createFinishedAdmin();
    const result = await submitCode(
      await codeRequest(),
      authenticatorCode(admin.setupKey),
    );
    expect(result.status).toBe("signed-in");

    if (result.status === "signed-in") {
      await signOutAdmin(auth, nextRequest(result.headers));
    }

    expect(await db.session.count()).toBe(0);
  });

  it("does nothing for a visitor without a session", async () => {
    await expect(signOutAdmin(auth, fromBrowser())).resolves.toBeUndefined();
  });
});
