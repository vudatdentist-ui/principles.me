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


test("Vietnamese also covers authentication failures", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Email").fill("missing@example.com");
  await page.getByLabel("Mật khẩu").fill("wrong-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).last().click();

  await expect(page.getByRole("alert")).toContainText("Email hoặc mật khẩu không đúng.");
  await expect(page.getByRole("alert")).not.toContainText("Invalid email or password.");
});


test("authenticated core surfaces default to Vietnamese", async ({ page }) => {
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
    page.getByRole("heading", { name: "Lúc này, điều gì đáng để bạn tập trung nhất?" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Tri thức", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Điều gì vẫn chưa rõ?" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Học hỏi", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Thực tế đang dạy bạn điều gì?" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Tổ chức", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Điều gì cần vận hành khác đi?" }),
  ).toBeVisible();

  await page.getByRole("link", { name: `Tài khoản của ${email}`, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tài khoản và dữ liệu" })).toBeVisible();
  await expect(page.getByText("XÓA TÀI KHOẢN CỦA TÔI", { exact: true })).toBeVisible();
  await expect(page.getByText("DELETE MY ACCOUNT", { exact: true })).toHaveCount(0);
});
