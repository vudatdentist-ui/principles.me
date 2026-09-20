import { expect, test, type Page } from "@playwright/test";

const password = "a strong isolated audit password";
const origin = "http://127.0.0.1:3000";

async function account(page: Page) {
  const email = `audit-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const response = await page.request.post("/api/auth/signup", {
    data: { email, password },
    headers: { origin },
  });
  expect(response.status()).toBe(201);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What deserves attention now?" })).toBeVisible();
}

async function goal(page: Page, desiredState: string) {
  const response = await page.request.post("/api/people/goals", {
    data: {
      desiredState,
      whyItMatters: "More time for considered decisions",
      successConditions: "Routine decisions no longer need approval",
      acceptedTradeoffs: "Delegate reversible decisions",
      nonNegotiables: "Keep customer trust",
      measures: "",
    },
    headers: { origin },
  });
  expect(response.status()).toBe(201);
}

test("optional-verification signup enters Me without a manual reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create account" }).first().click();
  await page.getByLabel("Email").fill(`audit-signup-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).last().click();
  await expect(page.getByRole("heading", { name: "What deserves attention now?" })).toBeVisible();
});

test("sign-out failure stays on the page and offers an accessible error", async ({ page }) => {
  await account(page);
  await page.route("**/api/auth/signout", (route) => route.fulfill({
    status: 503, contentType: "application/json", body: JSON.stringify({ error: "Unavailable" }),
  }));
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Could not sign out");
  await expect(page.getByRole("heading", { name: "What deserves attention now?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeEnabled();
});

test("failed Goal selection keeps the current Reality draft", async ({ page }) => {
  await account(page);
  await goal(page, "First audit goal");
  await goal(page, "Second audit goal");
  await page.reload();
  const portfolio = page.getByRole("region", { name: "My goals" });
  const other = portfolio.locator('button[aria-pressed="false"]').first();
  const draft = page.getByLabel("What is actually true?");
  await draft.fill("A considered draft that must survive a network failure.");
  await page.route("**/api/evolution/state?goalId=*", (route) => route.fulfill({
    status: 503, contentType: "application/json", body: "{}",
  }));
  await other.click();
  await expect(page.getByRole("alert")).toContainText("Could not refresh Me");
  await expect(draft).toHaveValue("A considered draft that must survive a network failure.");
});

test("Knowledge preserves the first terminal error instead of accepting a later done", async ({ page }) => {
  await account(page);
  await page.goto("/knowledge");
  await page.route("**/api/ask", (route) => route.fulfill({
    status: 200, contentType: "application/x-ndjson",
    body: [
      { type: "token", token: "Evidence received so far." },
      { type: "error", code: "UPSTREAM", message: "Provider interrupted.", retryable: true },
      { type: "done" },
      { type: "token", token: "This must not be appended." },
    ].map((event) => JSON.stringify(event)).join("\n"),
  }));
  await page.getByLabel("Question").fill("What is supported by the evidence?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Provider interrupted.");
  await expect(page.getByText("Complete", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Evidence received so far.", { exact: true })).toBeVisible();
  await expect(page.getByText("This must not be appended.", { exact: false })).toHaveCount(0);
});

test("Learning exposes every active Principle, including the fourth record", async ({ page }) => {
  await account(page);
  for (let index = 1; index <= 4; index += 1) {
    const response = await page.request.post("/api/people/principles", {
      data: { trigger: `Audit situation ${index}`, rule: `Audit rule number ${index}`, rationale: "A hypothesis to test" },
      headers: { origin },
    });
    expect(response.status()).toBe(201);
  }
  await page.goto("/learning");
  const library = page.locator("#learning-principle");
  for (let index = 1; index <= 4; index += 1) {
    await expect(library.getByRole("heading", { name: `Audit rule number ${index}`, exact: true })).toBeVisible();
  }
});

test("all product surfaces retain readable bounds at mobile and desktop widths", async ({ page }, testInfo) => {
  await account(page);
  for (const width of [390, 1440, 2560]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const path of ["/", "/knowledge", "/organization", "/learning", "/account"]) {
      await page.goto(path);
      await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const measure = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      expect(measure.document).toBeLessThanOrEqual(measure.viewport + 1);
      await testInfo.attach(`${path.slice(1) || "me"}-${width}`, {
        body: await page.screenshot({ fullPage: true }), contentType: "image/png",
      });
    }
  }
});
