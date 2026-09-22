import { expect, test } from "@playwright/test";

test("goal input waits for hydration and preserves the first answer", async ({
  page,
}) => {
  const signup = await page.request.post("/api/auth/signup", {
    data: {
      email: `hydration-${Date.now()}@example.com`,
      password: "a strong isolated hydration password",
    },
    headers: { origin: "http://127.0.0.1:3000" },
  });
  expect(signup.status()).toBe(201);

  let releaseScripts = () => {};
  const scriptsReady = new Promise<void>((resolve) => {
    releaseScripts = resolve;
  });
  let blockedScripts = 0;
  await page.route("**/_next/**", async (route) => {
    if (route.request().resourceType() === "script") {
      blockedScripts += 1;
      await scriptsReady;
    }
    await route.continue();
  });

  try {
    await page.goto("/", { waitUntil: "commit" });
    const answer = page.locator("#goal-discovery-answer");
    await expect(answer).toBeVisible();
    await expect.poll(() => blockedScripts).toBeGreaterThan(0);
    await expect(answer).toBeDisabled();
    await expect(page.locator("#goal-discovery-continue")).toBeDisabled();
  } finally {
    releaseScripts();
  }

  const answer = page.locator("#goal-discovery-answer");
  const firstAnswer = "Make considered decisions without losing context.";
  await expect(answer).toBeEditable();
  await answer.fill(firstAnswer);
  await expect(answer).toHaveValue(firstAnswer);
  const next = page.locator("#goal-discovery-continue");
  await expect(next).toBeEnabled();

  await page.route("**/api/people/goal-discovery", async (route) => {
    expect(route.request().postDataJSON().desiredState).toBe(firstAnswer);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        kind: "question",
        field: "whyItMatters",
        question: "Why does this goal matter?",
      }),
    });
  });
  await next.click();
  await expect(
    page.getByText("Why does this goal matter?", { exact: true }),
  ).toBeVisible();
  await expect(answer).toHaveValue("");
  await answer.fill("A clearer goal makes daily tradeoffs more deliberate.");
  await expect(next).toBeEnabled();
});
