import { z } from "zod";

export const SLUG_MAX_LENGTH = 100;

/**
 * Public URL slugs: lowercase ASCII letters and digits in words joined by
 * single hyphens. Route parameters are checked against this before any
 * database lookup.
 */
export const slugSchema = z
  .string()
  .max(SLUG_MAX_LENGTH)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/**
 * Converts text such as a headline into a slug. Words are dropped from the end
 * rather than cut mid-word when the result would exceed `maxLength`. Returns an
 * empty string when the text contains no letters or digits.
 */
export function slugify(text: string, maxLength = SLUG_MAX_LENGTH): string {
  const words = text
    // Decomposition strips accents from ç, ğ, ö, ş, ü and İ. Turkish dotless ı
    // has no decomposition, so it is mapped explicitly.
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll("ı", "i")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  let slug = "";

  for (const word of words) {
    const candidate = slug ? `${slug}-${word}` : word;

    if (candidate.length > maxLength) {
      break;
    }

    slug = candidate;
  }

  return slug || (words[0]?.slice(0, maxLength) ?? "");
}
