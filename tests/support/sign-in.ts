import { createHmac } from "node:crypto";

// Helpers for tests that sign in through Better Auth on the server, where no
// browser keeps cookies and no authenticator app shows codes.

/**
 * Plays the browser's part: applies a response's Set-Cookie headers to the
 * cookies already held and returns the next request's headers.
 */
export function nextRequest(response: Headers, held = new Headers()) {
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
 * SHA-1, six digits and 30-second steps. Written out here so that tests do
 * not check Better Auth's codes with Better Auth's own generator.
 */
export function authenticatorCode(base32Secret: string) {
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
