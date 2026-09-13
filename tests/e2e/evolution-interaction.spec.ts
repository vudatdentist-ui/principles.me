import { expect, test } from "@playwright/test";

const password = "a strong evolution interaction password";

async function createAccount(page: import("@playwright/test").Page) {
  const email = `evolution-interaction-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.goto("/");
  await page.getByRole("button", { name: "Create account" }).first().click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const signupResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/signup") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create account" }).last().click();
  expect((await signupResponse).status()).toBe(201);
  await page.reload();
}

async function answerGoalQuestion(page: import("@playwright/test").Page, value: string) {
  const continueButton = page.getByRole("button", { name: "Continue" });
  await expect(continueButton).toBeVisible();
  await page.getByLabel("Goal discovery answer").fill(value);
  await expect(continueButton).toBeEnabled();
  const discoveryResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/people/goal-discovery") &&
      response.request().method() === "POST",
  );
  await continueButton.click();
  expect((await discoveryResponse).ok()).toBe(true);
}

test("5 Steps lets the user inspect lived, current, and future meaning", async ({ page }) => {
  const goal = "Build a company that can make routine decisions without depending on me.";

  await createAccount(page);
  for (const value of [
    goal,
    "I want freedom without sacrificing the quality of decisions.",
    "Routine operating decisions happen without waiting for my approval.",
    "I will stop being the default approver for low-risk operating decisions.",
    "Protect customer trust and irreversible financial decisions.",
  ]) {
    await answerGoalQuestion(page, value);
  }
  await page.getByRole("button", { name: "Add goal" }).click();

  const path = page.getByRole("tablist", { name: "Inspect the 5 Steps" });
  await expect(path).toBeVisible();

  const goalTab = page.getByRole("tab", { name: "Evolution step 1: desired reality" });
  const problemTab = page.getByRole("tab", { name: "Evolution step 2: meaningful gap" });
  const diagnosisTab = page.getByRole("tab", { name: "Evolution step 3: root cause" });

  await expect(goalTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText(goal);

  await problemTab.click();
  await expect(problemTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Find the gap that matters.");
  await expect(page.getByRole("tabpanel")).toContainText("Ahead");

  await diagnosisTab.click();
  await expect(page.getByRole("tabpanel")).toContainText("Understand why the gap exists.");

  await page.getByLabel("What is actually true?").fill(
    "Three routine operating decisions waited for my approval this week.",
  );
  await page.getByRole("button", { name: "Record reality" }).click();
  await page.getByRole("button", { name: "Find the problem" }).click();
  await expect(page.getByLabel("Problem", { exact: true })).toHaveValue(
    "The founder remains a routine operating bottleneck.",
  );
  await page.getByRole("button", { name: "Name this problem" }).click();

  await problemTab.click();
  await expect(page.getByRole("tabpanel")).toContainText(
    "The founder remains a routine operating bottleneck.",
  );
  await expect(page.getByRole("tabpanel")).toContainText("Lived");

  await diagnosisTab.click();
  await expect(page.getByRole("tabpanel")).toContainText("Now");
  await expect(page.getByRole("tabpanel")).toContainText("Understand why the gap exists.");
});
