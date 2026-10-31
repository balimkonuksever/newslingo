import type { NextConfig } from "next";

/**
 * Set by `pnpm site:build`, which builds the static site for GitHub Pages
 * (IMPLEMENTATION_PLAN.md M9). Without it, Next.js builds the local server
 * with the admin.
 */
const siteBuild = process.env.SITE_BUILD === "1";

/** The site's path on GitHub Pages: https://<owner>.github.io/newslingo. */
const SITE_BASE_PATH = "/newslingo";

// Route files named `*.local.tsx` or `*.local.ts` exist only on the local
// server (the admin, sign-in and the dictionary endpoint), and `*.site.ts`
// only in the static site.
const nextConfig: NextConfig = siteBuild
  ? {
      output: "export",
      basePath: SITE_BASE_PATH,
      trailingSlash: true,
      pageExtensions: ["site.ts", "tsx", "ts"],
      env: { NEXT_PUBLIC_BASE_PATH: SITE_BASE_PATH },
    }
  : {
      pageExtensions: ["local.tsx", "local.ts", "tsx", "ts"],
      env: { NEXT_PUBLIC_BASE_PATH: "" },
    };

export default nextConfig;
