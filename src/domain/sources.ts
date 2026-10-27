import type { SourceLicence } from "@/generated/prisma/enums";

// What Newslingo knows about the sources its news is adapted from (W).

/** A licence's name as it reads in a sentence. */
export const SOURCE_LICENCE_NAMES: Record<SourceLicence, string> = {
  OGL_3_0: "the Open Government Licence v3.0",
};

/** GOV.UK's pages, all published under the Open Government Licence v3.0. */
const GOV_UK_HOSTS = new Set(["www.gov.uk", "gov.uk"]);

/**
 * The licence a source's page is published under, when the source is one
 * whose licence an adaptation must credit, as GOV.UK's is (ADR-004).
 */
export function requiredLicence(sourceUrl: string): SourceLicence | null {
  try {
    return GOV_UK_HOSTS.has(new URL(sourceUrl).hostname) ? "OGL_3_0" : null;
  } catch {
    return null;
  }
}
