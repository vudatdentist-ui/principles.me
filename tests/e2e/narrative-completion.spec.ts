import { expect, test } from "@playwright/test";

const password = "a strong narrative completion password";

async function createAccount(page: import("@playwright/test").Page) {
  const email = `narrative-completion-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.goto("/");
  await page.getByRole("button", { name: "Create account" }).first().click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const signup = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/signup") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create account" }).last().click();
  expect((await signup).status()).toBe(201);
  await expect(
    page.getByRole("heading", { name: "New goal", level: 1, exact: true }),
  ).toBeVisible();
}

test("Me keeps the goal question and input visible without a decorative chapter thesis", async ({
  page,
}) => {
  await createAccount(page);

  await expect(
    page.getByText(
      "What do you really want?",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Goal discovery answer")).toBeVisible();
});

test("Knowledge preserves body text attached to a markdown heading", async ({
  page,
}) => {
  await createAccount(page);
  await page.goto("/knowledge");

  await page.route("**/api/ask", async (route) => {
    const events = [
      {
        live: "disabled",
        personal: "empty",
        private: "empty",
        references: [],
        type: "sources",
      },
      {
        token:
          "### Evidence-backed answer\nThe body survives even without a blank line after the heading.",
        type: "token",
      },
      { type: "done" },
    ];
    await route.fulfill({
      body: events.map((event) => JSON.stringify(event)).join("\n"),
      contentType: "application/x-ndjson; charset=utf-8",
      status: 200,
    });
  });

  await page.getByLabel("Question").fill("What does the evidence imply?");
  await page.getByRole("button", { name: "Ask" }).click();

  await expect(
    page.getByRole("heading", { name: "Evidence-backed answer" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "The body survives even without a blank line after the heading.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText("Complete", { exact: true })).toBeVisible();
});
