import type { NextConfig } from "next";

/**
 * Set by `pnpm site:build`, which builds the static site for GitHub Pages
 * (IMPLEMENTATION_PLAN.md M9). Without it, Next.js builds the local server
 * with the admin.
 */
const siteBuild = process.env.SITE_BUILD === "1";

/** The site's path on GitHub Pages: https://<owner>.github.io/newslingo. */
const SITE_BASE_PATH = "/newslingo";

// Since Next.js 16.4, `next dev` writes its agent-rules block into
// AGENTS.md when it detects a coding agent. Here AGENTS.md links to the
// owner's hand-written agent instructions, so Next.js must not write it
// (IMPLEMENTATION_PLAN.md §19, 2026-11-25).
const shared: NextConfig = { agentRules: false };

// Route files named `*.local.tsx` or `*.local.ts` exist only on the local
// server (the admin, sign-in and the dictionary endpoint), and `*.site.tsx`
// or `*.site.ts` only in the static site.
const nextConfig: NextConfig = siteBuild
  ? {
      ...shared,
      output: "export",
      basePath: SITE_BASE_PATH,
      trailingSlash: true,
      pageExtensions: ["site.tsx", "site.ts", "tsx", "ts"],
      env: { NEXT_PUBLIC_BASE_PATH: SITE_BASE_PATH },
      // Route types here would leave out the admin, which `pnpm typecheck`
      // checks with the rest of the project before any site build.
      typescript: { ignoreBuildErrors: true },
    }
  : {
      ...shared,
      pageExtensions: ["local.tsx", "local.ts", "tsx", "ts"],
      env: { NEXT_PUBLIC_BASE_PATH: "" },
    };

export default nextConfig;
