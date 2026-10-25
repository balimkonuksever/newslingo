import "server-only";

// Small helpers for reading Better Auth's server-side responses.

/** The Cookie header a browser would send after this response. */
export function cookieHeader(response: Headers) {
  const pairs = response
    .getSetCookie()
    .map((setCookie) => setCookie.split(";")[0]?.trim() ?? "")
    .filter((pair) => /^[^=]+=.+/.test(pair));

  return new Headers({ cookie: pairs.join("; ") });
}

/** Whether `error` is a Better Auth refusal with this error code. */
export function hasErrorCode(error: unknown, code: string) {
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
