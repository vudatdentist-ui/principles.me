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
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "What deserves attention now?" }),
  ).toBeVisible();
}

test("Me keeps the meaning of the current chapter inside the working scene", async ({
  page,
}) => {
  await createAccount(page);

  await expect(
    page.getByText(
      "Name the reality worth creating before you optimize the path.",
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
