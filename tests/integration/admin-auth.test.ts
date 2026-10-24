import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { createAuth } from "@/server/auth/config";
import { db } from "@/server/db/client";

import { resetDatabase } from "./database";

// Checks that Better Auth's Prisma adapter works with this project's Prisma
// 7.10.0 client, generator and driver adapter (ADR-003), before any admin
// page is built on it.

const auth = createAuth({
  secret: "integration-tests-only-secret-0123456789",
  baseURL: "http://localhost:3100",
});

const EMAIL = "admin@example.test";
const PASSWORD = "correct horse battery staple";

beforeEach(resetDatabase);

/** Creates an admin on the server, as the guarded command will. */
async function createAdmin() {
  const context = await auth.$context;
  const user = await context.internalAdapter.createUser(
    { name: "Test Admin", email: EMAIL },
    { method: "admin" },
  );

  await context.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await context.password.hash(PASSWORD),
  });

  return user;
}

function signIn(password = PASSWORD) {
  return auth.api.signInEmail({
    body: { email: EMAIL, password },
    returnHeaders: true,
  });
}

/**
 * Plays the browser's part: applies a response's Set-Cookie headers to the
 * cookies already held and returns the next request's headers.
 */
function nextRequest(response: Headers, held = new Headers()) {
  const cookies = new Map<string, string>();

  for (const pair of held.get("cookie")?.split("; ") ?? []) {
    const split = pair.indexOf("=");
    cookies.set(pair.slice(0, split), pair.slice(split + 1));
  }

  for (const setCookie of response.getSetCookie()) {
    const [pair = "", ...attributes] = setCookie.split(";");
    const split = pair.indexOf("=");
    const name = pair.slice(0, split);
    const value = pair.slice(split + 1);
    const expired = attributes.some((attribute) =>
      /^\s*max-age=0$/i.test(attribute),
    );

    if (expired || value === "") {
      cookies.delete(name);
    } else {
      cookies.set(name, value);
    }
  }

  return new Headers({
    cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
  });
}

/**
 * The code an authenticator app shows for a base32 secret: RFC 6238 with
 * SHA-1, six digits and 30-second steps. Written out here so the test does
 * not check Better Auth's codes with Better Auth's own generator.
 */
function authenticatorCode(base32Secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...base32Secret.replace(/=+$/, "").toUpperCase()]
    .map((character) =>
      alphabet.indexOf(character).toString(2).padStart(5, "0"),
    )
    .join("");
  const key = Buffer.from(
    (bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2)),
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));

  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = (hmac.at(-1) ?? 0) & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;

  return code.toString().padStart(6, "0");
}

/** Turns on two-factor sign-in the way an admin does, from a signed-in session. */
async function enableTwoFactor(session: Headers) {
  const enrolment = await auth.api.enableTwoFactor({
    body: { password: PASSWORD, method: "totp" },
    headers: session,
  });

  if (enrolment.method !== "totp") {
    throw new Error("Expected an authenticator-app enrolment.");
  }

  const secret = new URL(enrolment.totpURI).searchParams.get("secret") ?? "";
  const verified = await auth.api.verifyTOTP({
    body: { code: authenticatorCode(secret) },
    headers: session,
    returnHeaders: true,
  });

  return { secret, session: nextRequest(verified.headers, session) };
}

describe("admin sign-in through Better Auth's Prisma adapter", () => {
  it("signs an admin in with a password and keeps the session in PostgreSQL", async () => {
    const admin = await createAdmin();

    const { headers } = await signIn();
    const session = await auth.api.getSession({
      headers: nextRequest(headers),
    });

    expect(session?.user).toMatchObject({ id: admin.id, email: EMAIL });
    expect(await db.session.findMany({ where: { userId: admin.id } })).toEqual([
      expect.objectContaining({ token: session?.session.token }),
    ]);

    const login = await db.account.findFirstOrThrow({
      where: { userId: admin.id },
    });
    expect(login.providerId).toBe("credential");
    expect(login.password).not.toContain(PASSWORD);
  });

  it("refuses public sign-up", async () => {
    await expect(
      auth.api.signUpEmail({
        body: {
          name: "Visitor",
          email: "visitor@example.test",
          password: PASSWORD,
        },
      }),
    ).rejects.toMatchObject({
      body: { code: "EMAIL_PASSWORD_SIGN_UP_DISABLED" },
    });

    expect(await db.user.count()).toBe(0);
  });

  it("refuses a wrong password without creating a session", async () => {
    await createAdmin();

    await expect(signIn("not the password")).rejects.toMatchObject({
      body: { code: "INVALID_EMAIL_OR_PASSWORD" },
    });

    expect(await db.session.count()).toBe(0);
  });

  it("revokes the session when the admin signs out", async () => {
    await createAdmin();
    const { headers } = await signIn();
    const session = nextRequest(headers);

    await auth.api.signOut({ headers: session });

    expect(await db.session.count()).toBe(0);
    expect(await auth.api.getSession({ headers: session })).toBeNull();
  });

  it("asks for an authenticator code at sign-in once two-factor is on", async () => {
    const admin = await createAdmin();
    const firstSignIn = await signIn();
    const enabled = await enableTwoFactor(nextRequest(firstSignIn.headers));

    const stored = await db.twoFactor.findFirstOrThrow({
      where: { userId: admin.id },
    });
    expect(stored.secret).not.toContain(enabled.secret);
    expect(
      await db.user.findUniqueOrThrow({ where: { id: admin.id } }),
    ).toMatchObject({ twoFactorEnabled: true });

    await auth.api.signOut({ headers: enabled.session });
    const password = await signIn();

    expect(password.response).toMatchObject({ twoFactorRedirect: true });
    expect(await db.session.count()).toBe(0);

    const challenge = nextRequest(password.headers);
    await expect(
      auth.api.verifyTOTP({ body: { code: "000000" }, headers: challenge }),
    ).rejects.toMatchObject({ body: { code: "INVALID_CODE" } });

    const verified = await auth.api.verifyTOTP({
      body: { code: authenticatorCode(enabled.secret) },
      headers: challenge,
      returnHeaders: true,
    });
    const session = await auth.api.getSession({
      headers: nextRequest(verified.headers, challenge),
    });

    expect(session?.user.id).toBe(admin.id);
  });

  it("deletes an admin's sessions, logins and authenticator with the admin", async () => {
    const admin = await createAdmin();
    const { headers } = await signIn();
    await enableTwoFactor(nextRequest(headers));

    await db.user.delete({ where: { id: admin.id } });

    expect(await db.session.count()).toBe(0);
    expect(await db.account.count()).toBe(0);
    expect(await db.twoFactor.count()).toBe(0);
  });

  it("stores email addresses in lower case only", async () => {
    await expect(
      db.user.create({
        data: { id: "upper-case", name: "Admin", email: "Admin@Example.test" },
      }),
    ).rejects.toThrow(/User_email_lowercase/);
  });
});
