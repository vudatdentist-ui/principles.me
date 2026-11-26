import { expect, test } from "@playwright/test";

test("save, reopen, rehearse and compare replies", async ({ page }, info) => {
  const signup = await page.request.post("/api/auth/signup", {
    headers: { origin: "http://127.0.0.1:3000" },
    data: {
      email: "studio-" + Date.now() + "@example.test",
      password: "a private practice fixture password",
    },
  });
  expect(signup.status()).toBe(201);
  await page.goto("/");
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 830 });
    await expect(
      page.getByRole("heading", { name: "Situation studio" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath("studio-" + width + ".png"),
    });
  }
  const scenario = "I need to renegotiate a deadline";
  await page
    .getByLabel("What would you like to practise saying?")
    .fill(scenario);
  await page.getByRole("button", { name: "Save for later" }).click();
  await expect(page.getByText("Private scenario saved.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: scenario }).click();
  await page.getByRole("button", { name: "Begin rehearsal" }).click();
  for (const answer of [
    "Can we extend by a week?",
    "Could we deliver the first half tomorrow?",
  ]) {
    await page.getByLabel("What would you say?").fill(answer);
    await page.getByRole("button", { name: "Reply", exact: true }).click();
    await expect(
      page.getByText(answer, { exact: false }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Retry this turn" }).click();
  }
  await expect(page.getByRole("button", { name: "Continue here" })).toHaveCount(
    2,
  );
});
