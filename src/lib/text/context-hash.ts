import { createHash } from "node:crypto";

/**
 * The cache key part for a lookup context (see lookup-context.ts): the hex
 * SHA-256 of the marked sentence. Node-only; the lookup service and the seed
 * scripts must both use it so their keys match.
 */
export function hashContext(context: string) {
  return createHash("sha256").update(context).digest("hex");
}
