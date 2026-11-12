// @vitest-environment node
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { drawMotifs, MOTIFS_DIRECTORY } from "./draw-motifs";

describe("drawMotifs", () => {
  it.each(Object.entries(drawMotifs()))(
    "matches the committed src/app/motifs/%s",
    async (name, drawing) => {
      // Run `pnpm exec tsx scripts/draw-motifs.ts` after changing the drawing.
      expect(await readFile(join(MOTIFS_DIRECTORY, name), "utf8")).toBe(
        drawing,
      );
    },
  );

  // The site check refuses anything more in an SVG file
  // (scripts/site-security.ts); this catches it before a site build.
  it("draws only shapes, linked within the file", () => {
    for (const drawing of Object.values(drawMotifs())) {
      expect(drawing).not.toMatch(/<script|\son[a-z]+=|<foreignObject/i);
      expect(drawing).not.toMatch(/href="(?!#)|url\((?!#)/);
    }
  });
});
