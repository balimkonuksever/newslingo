import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

const port = 3300;
const baseURL = `http://127.0.0.1:${port}`;

// Tests the static site in out/ (tests/site), served as GitHub Pages serves
// it. Run through `pnpm test:site` after `pnpm site:build`; the tests need no
// database. tests/e2e covers the local server, admin included.
if (!existsSync("out/index.html")) {
  throw new Error("There is no static site to test: run `pnpm site:build`.");
}

export default defineConfig({
  testDir: "tests/site",
  outputDir: "test-results/site",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { open: "never", outputFolder: "playwright-report/site" }],
      ]
    : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], channel: "chrome" },
    },
  ],
  webServer: {
    command: `pnpm site:serve ${port}`,
    url: `${baseURL}/newslingo/`,
    reuseExistingServer: !process.env.CI,
  },
});
