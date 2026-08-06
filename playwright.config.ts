import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against the browser preview (Vite dev server).
 * The desktop shell is not required: in browser preview the app uses
 * the in-memory credential store and the web-fallback Git runtime,
 * so flows must not depend on a real GitHub token. GitHub API calls
 * are stubbed per-test with route interception.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:1420",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:1420",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
