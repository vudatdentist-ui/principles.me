import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: process.env.ENV_FILE || ".env.local" });

const port = Number(process.env.PORT || 3000);
const localBaseURL = `http://127.0.0.1:${port}`;
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, "");
const baseURL = externalBaseURL || localBaseURL;
const webServerCommand = process.env.CI
  ? "pnpm build && pnpm start"
  : "pnpm dev";

export default defineConfig({
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  projects: [
    {
      name: "principles-chromium",
      testMatch:
        /e2e\/(personal-os-smoke|goals-loop|journal-reflection|auth-isolation|release-smoke)\.test\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "html",
  retries: 0,
  testDir: "./tests",
  timeout: 60_000,
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: externalBaseURL
    ? undefined
    : {
        command: webServerCommand,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        url: localBaseURL,
      },
  workers: 1,
});
