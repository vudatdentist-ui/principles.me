import { expect, test } from "@playwright/test";

const password = "a strong browser test password";

async function createAccount(page: import("@playwright/test").Page) {
  const email = `account-data-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.goto("/");
  await page.getByRole("button", { name: "Create account" }).first().click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const signupResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/signup") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create account" }).last().click();
  expect((await signupResponse).status()).toBe(201);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "What deserves attention now?" }),
  ).toBeVisible();
  return email;
}

test("account data controls require re-authentication, export and delete the temporary account", async ({
  page,
}) => {
  const email = await createAccount(page);
  await page.getByRole("link", { name: `Account for ${email}` }).click();
  await expect(page.getByRole("heading", { name: "Your data stays yours." })).toBeVisible();

  await page.getByLabel("Confirm password").first().fill("incorrect password");
  await page.getByRole("button", { name: "Export data" }).click();
  await expect(page.getByText("Password confirmation failed.").first()).toBeVisible();

  await page.getByLabel("Confirm password").first().fill(password);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export data" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^principles-export-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(page.getByText("Export ready.")).toBeVisible();

  await page.getByLabel("Confirm password").last().fill(password);
  await page.getByLabel(/Type DELETE MY ACCOUNT/).fill("DELETE MY ACCOUNT");
  const deleteResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/account/delete") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Delete account" }).click();
  expect((await deleteResponse).status()).toBe(200);
  await page.waitForURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Principles" })).toBeVisible();

  await page.getByRole("button", { name: "Sign in" }).first().click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).last().click();
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});
