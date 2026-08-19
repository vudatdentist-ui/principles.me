import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: process.env.ENV_FILE || ".env.local" });

const port = Number(process.env.PORT || 3000);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  projects: [
    {
      name: "principles-chromium",
      testMatch: /e2e\/principles-smoke\.test\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "html",
  retries: process.env.CI ? 1 : 0,
  testDir: "./tests",
  timeout: 60_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseURL,
  },
  workers: 1,
});
