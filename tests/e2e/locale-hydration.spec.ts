import { expect, test } from "@playwright/test";

test("stored English hydrates streamed pages once and preserves native chapter links", async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("pageerror", (error) => hydrationErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat|did not match/i.test(message.text()))
      hydrationErrors.push(message.text());
  });
  await page.addInitScript(() => {
    localStorage.setItem("principles.locale", "en");
  });
  const signup = await page.request.post("/api/auth/signup", {
    data: {
      email: `locale-hydration-${Date.now()}@example.com`,
      password: "isolated locale hydration test password",
    },
    headers: { origin: "http://127.0.0.1:3000" },
  });
  expect(signup.status()).toBe(201);

  for (const [path, id, heading] of [
    ["/", "me-title", "New goal"],
    ["/knowledge", "knowledge-title", "Knowledge"],
    ["/organization", "organization-title", "Organization"],
    ["/learning", "learning-title", "Learning"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    // Include hidden DOM: native hash navigation can select a hidden duplicate ID.
    await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    await expect(page.locator('[id="main-content"]')).toHaveCount(1);
  }

  const chapter = page.locator('[id="learning-principle"]');
  await expect(chapter).toHaveCount(1);
  await page.getByRole("navigation", { name: "Learning chapters", exact: true })
    .locator('a[href="#learning-principle"]').click();
  await expect(page).toHaveURL(/#learning-principle$/);
  await expect(chapter.getByRole("heading", { name: "Principles", exact: true })).toBeInViewport();
  await page.reload();
  await expect(chapter).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Learning", level: 1, exact: true })).toBeVisible();
  await expect(chapter.getByRole("heading", { name: "Principles", exact: true })).toBeInViewport();
  expect(hydrationErrors).toEqual([]);
});
