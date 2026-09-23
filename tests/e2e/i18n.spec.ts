import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("Vietnamese is the natural default and language choice persists", async ({
  page,
}, testInfo) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tạo tài khoản", exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByLabel("Ngôn ngữ")).toHaveValue("vi");

  await testInfo.attach("vietnamese-default-auth", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await page.getByLabel("Ngôn ngữ").selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }).first(),
  ).toBeVisible();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByLabel("Language")).toHaveValue("en");

  await page.getByLabel("Language").selectOption("vi");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }).first(),
  ).toBeVisible();
});


test("Vietnamese also covers authentication failures", async ({ page }, testInfo) => {
  await page.goto("/");

  await page.getByLabel("Email").fill("missing@example.com");
  await page.getByLabel("Mật khẩu").fill("wrong-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).last().click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Email hoặc mật khẩu không đúng." }),
  ).toBeVisible();
  await expect(
    page.getByText("Invalid email or password.", { exact: true }),
  ).toHaveCount(0);

  await testInfo.attach("vietnamese-auth-error", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});


test("authenticated core surfaces default to Vietnamese", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem("principles.locale");
  });

  const email = `i18n-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const signup = await page.request.post("/api/auth/signup", {
    data: { email, password: "correct-horse-battery-staple" },
  });
  expect(signup.status()).toBe(201);

  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.getByRole("link", { name: "Tôi", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tổ chức", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tri thức", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Học hỏi", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Tôi" }),
  ).toBeVisible();

  await testInfo.attach("vietnamese-me-display", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await page.getByRole("link", { name: "Tri thức", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tri thức" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Học hỏi", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Học hỏi" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Tổ chức", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tổ chức" }),
  ).toBeVisible();

  await page.getByRole("link", { name: `Tài khoản của ${email}`, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tài khoản và dữ liệu" })).toBeVisible();
  await expect(page.getByText("XÓA TÀI KHOẢN CỦA TÔI", { exact: true })).toBeVisible();
  await expect(page.getByText("DELETE MY ACCOUNT", { exact: true })).toHaveCount(0);

  await testInfo.attach("vietnamese-account-confirmation", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
