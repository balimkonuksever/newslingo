import type { SourceLicence } from "@/generated/prisma/enums";

// What Newslingo knows about the sources its news is adapted from (W).

/** How an adaptation credits each licence (`docs/sources/gov-uk.md`). */
export const SOURCE_LICENCES: Record<
  SourceLicence,
  {
    name: string;
    url: string;
    /** The required credit is this, then the licence's name, linked. */
    creditLead: string;
  }
> = {
  OGL_3_0: {
    name: "Open Government Licence v3.0",
    url: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    creditLead: "Contains public sector information licensed under the",
  },
};

type KnownSource = {
  /** Named beside the source in the credit, as GOV.UK must be. */
  publisher: string;
  licence: SourceLicence;
};

const KNOWN_SOURCES: ReadonlyArray<
  KnownSource & { hosts: ReadonlySet<string> }
> = [
  // GOV.UK's pages, all published under the Open Government Licence (ADR-004).
  {
    hosts: new Set(["www.gov.uk", "gov.uk"]),
    publisher: "GOV.UK",
    licence: "OGL_3_0",
  },
];

/** The publisher and licence of a source whose credit is required, or null. */
export function knownSource(sourceUrl: string): KnownSource | null {
  let hostname: string;

  try {
    ({ hostname } = new URL(sourceUrl));
  } catch {
    return null;
  }

  const source = KNOWN_SOURCES.find(({ hosts }) => hosts.has(hostname));

  return source
    ? { publisher: source.publisher, licence: source.licence }
    : null;
}

/**
 * The licence a source's page is published under, when the source is one
 * whose licence an adaptation must credit, as GOV.UK's is.
 */
export function requiredLicence(sourceUrl: string): SourceLicence | null {
  return knownSource(sourceUrl)?.licence ?? null;
}
