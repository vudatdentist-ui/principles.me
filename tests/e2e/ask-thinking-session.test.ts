import { expect, test } from "@playwright/test";

test.describe("Ask thinking session", () => {
  test("runs directly and can save the result as a decision", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Ask your Principles").fill(
      "Should we extend runway for six months because customer retention is still the main uncertainty?"
    );
    await page.getByRole("button", { name: "Ask" }).click();

    await expect(page.getByText("My read")).toBeVisible();
    await expect(page.getByText("Confidence")).toBeVisible();
    await expect(page.getByText("Thinking session context")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save as Decision" })).toBeVisible();
  });

  test("clarifies once and continues with an answer", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Ask your Principles").fill("Should I hire a CTO now?");
    await page.getByRole("button", { name: "Ask" }).click();

    await expect(page.getByText("What is currently limiting you more?")).toBeVisible();
    await page.getByRole("button", { name: "Execution" }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await expect(page.getByText("The decision turns on the constraint you identified: Execution.")).toBeVisible();
    await expect(page.getByText("medium")).toBeVisible();
  });

  test("does not trap the user in clarification", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Ask your Principles").fill("Should I hire a CTO now?");
    await page.getByRole("button", { name: "Ask" }).click();
    await page.getByRole("button", { name: "Continue with available information" }).click();

    await expect(page.getByText("My read")).toBeVisible();
    await expect(page.getByText("low")).toBeVisible();
  });
});
