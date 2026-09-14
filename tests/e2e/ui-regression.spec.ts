import { expect, test } from "@playwright/test";

const password = "a strong ui regression password";

async function createAccount(page: import("@playwright/test").Page) {
  const email = `ui-regression-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.goto("/");
  await page.getByRole("button", { name: "Create account" }).first().click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const signupResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/signup") && response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Create account" }).last().click();
  expect((await signupResponse).status()).toBe(201);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "What deserves attention now?" })
  ).toBeVisible();
  return email;
}

async function createGoal(page: import("@playwright/test").Page) {
  for (const value of [
    "Build a company that can make routine decisions without depending on me.",
    "I want freedom without sacrificing decision quality.",
    "Routine operating decisions happen without waiting for my approval.",
    "I will stop being the default approver for low-risk operating decisions.",
    "Protect customer trust and irreversible financial decisions.",
  ]) {
    const continueButton = page.getByRole("button", { name: "Continue" });
    await expect(continueButton).toBeVisible();
    await page.getByLabel("Goal discovery answer").fill(value);
    await continueButton.click();
  }
  await page.getByRole("button", { name: "Add goal" }).click();
}

test("primary surfaces keep the shared hierarchy without viewport overflow", async ({ page }) => {
  await createAccount(page);

  const surfaces = [
    ["/", "What deserves attention now?"],
    ["/organization", "Design the machine around reality."],
    ["/knowledge", "Think from principles."],
    ["/learning", "What is reality teaching you?"],
    ["/account", "Your data stays yours."],
  ] as const;

  for (const viewport of [
    { height: 900, width: 1280 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);

    for (const [path, heading] of surfaces) {
      await page.goto(path);
      const title = page.getByRole("heading", { name: heading });
      await expect(title).toBeVisible();

      const geometry = await page.evaluate(() => {
        const heading = document.querySelector("h1");
        const headingStyle = heading ? getComputedStyle(heading) : null;
        return {
          fontSize: headingStyle ? Number.parseFloat(headingStyle.fontSize) : 0,
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        };
      });

      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
      expect(geometry.fontSize).toBeGreaterThanOrEqual(viewport.width < 600 ? 34 : 40);
      expect(geometry.fontSize).toBeLessThanOrEqual(72);

      if (path !== "/account") {
        for (const tab of ["Me", "Organization", "Knowledge", "Learning"] as const) {
          await expect(page.getByRole("link", { name: tab, exact: true }).first()).toBeVisible();
        }
      }
      const appHeader = page.getByRole("banner");
      await expect(appHeader.getByRole("link", { name: /^Account for / })).toBeVisible();
      await expect(appHeader.getByRole("button", { name: "Sign out" })).toBeVisible();
    }
  }
});

test("cancelled execution remains reversible after Outcome becomes available", async ({ page }) => {
  await createAccount(page);
  await createGoal(page);

  await page
    .getByLabel("What is actually true?")
    .fill("Three routine operating decisions waited for my approval this week.");
  await page.getByRole("button", { name: "Record reality" }).click();

  await page.getByRole("button", { name: "Find the problem" }).click();
  await expect(page.getByRole("textbox", { name: "Problem", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Name this problem" }).click();

  await page.getByRole("button", { name: "Diagnose the root cause" }).click();
  await expect(page.getByRole("textbox", { name: "Root-cause hypothesis" })).toBeVisible();
  await page.getByRole("button", { name: "Accept this diagnosis" }).click();

  await page.getByRole("button", { name: "Design the machine" }).click();
  await expect(page.getByRole("textbox", { name: "Machine change" })).toBeVisible();
  await page.getByRole("button", { name: "Adopt this design" }).click();

  const cancelResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/people/actions") && response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).first().click();
  expect((await cancelResponse).status()).toBe(200);

  for (let guard = 0; guard < 6; guard += 1) {
    const completeButtons = page.getByRole("button", { name: /^Complete / });
    if ((await completeButtons.count()) === 0) break;
    const actionResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/people/actions") && response.request().method() === "POST"
    );
    await completeButtons.first().click();
    expect((await actionResponse).status()).toBe(200);
  }

  await expect(page.getByLabel("Actual outcome")).toBeVisible();
  const executionDetails = page.locator("details").filter({ hasText: "Execution" }).first();
  await executionDetails.locator("summary").click();
  const restore = executionDetails.getByRole("button", { name: /^Restore / }).first();
  await expect(restore).toBeVisible();

  const restoreResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/people/actions") && response.request().method() === "POST"
  );
  await restore.click();
  expect((await restoreResponse).status()).toBe(200);

  await expect(page.getByLabel("Actual outcome")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Complete / }).first()).toBeVisible();

  const evolution = await page.evaluate(async () => {
    const response = await fetch("/api/evolution/state");
    return response.json();
  });
  expect(evolution.stage).toBe("do");
  expect(evolution.actions.some((action: { status: string }) => action.status === "pending")).toBe(
    true
  );
});
