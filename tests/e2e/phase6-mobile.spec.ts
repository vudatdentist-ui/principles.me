import { expect, test } from "@playwright/test";

const password = "a strong phase six mobile password";

test("all four authenticated surfaces share one stable mobile shell", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  const email = `phase6-mobile-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

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

  let referenceBrandTop: number | null = null;
  let referenceNavTop: number | null = null;

  for (const [path, active, heading] of [
    ["/", "Me", "What deserves attention now?"],
    ["/organization", "Organization", "Design the machine around reality."],
    ["/knowledge", "Knowledge", "Think from principles."],
    ["/learning", "Learning", "What is reality teaching you?"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();

    const tabs = ["Me", "Organization", "Knowledge", "Learning"] as const;
    for (const tab of tabs) {
      await expect(page.getByRole("link", { name: tab, exact: true }).first()).toBeVisible();
    }
    await expect(page.getByRole("link", { name: active, exact: true }).first()).toHaveAttribute(
      "aria-current",
      "page"
    );

    const geometry = await page.evaluate(() => {
      const brand = document.querySelector('a[aria-label="Principles home"]');
      const nav = document.querySelector('nav[aria-label="Primary"]');
      const brandRect = brand?.getBoundingClientRect();
      const navRect = nav?.getBoundingClientRect();
      return {
        brandTop: brandRect?.top ?? -1,
        navTop: navRect?.top ?? -1,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });

    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    if (referenceBrandTop === null || referenceNavTop === null) {
      referenceBrandTop = geometry.brandTop;
      referenceNavTop = geometry.navTop;
    } else {
      expect(Math.abs(geometry.brandTop - referenceBrandTop)).toBeLessThanOrEqual(2);
      expect(Math.abs(geometry.navTop - referenceNavTop)).toBeLessThanOrEqual(2);
    }
  }
});
