import { expect, test } from "@playwright/test";

test.describe("Principles foundation smoke", () => {
  test("renders the current Principles product shell", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Think with"
    );
    await expect(page.getByLabel("Ask your council")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  });

  test("carries a real question into the Council workspace", async ({ page }) => {
    const question =
      "Should I keep working with a capable cofounder who avoids difficult conversations?";

    await page.goto("/");
    await page.getByLabel("Ask your council").fill(question);
    await page.getByLabel("Ask your council").press("Enter");

    await expect(page.getByRole("heading", { name: "Ask the council." })).toBeVisible();
    await expect(page.locator("#council-question")).toHaveValue(question);
  });

  test("fails closed when no RAG evidence is configured", async ({ page }) => {
    const question = "What should I consider before making this decision?";

    await page.goto("/");
    await page.getByLabel("Ask your council").fill(question);
    await page.getByLabel("Ask your council").press("Enter");
    await page
      .locator(".council-form")
      .getByRole("button", { name: "Ask Council" })
      .click();

    await expect(page.getByText("No evidence retrieved.")).toBeVisible();
    await expect(
      page.getByText(/Chưa có evidence đủ liên quan từ RAGFlow/)
    ).toBeVisible();
  });
});
