import { expect, test } from "@playwright/test";

test("Vietnamese is the natural default and language choice persists", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem("principles.locale");
  });

  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tạo tài khoản", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Ngôn ngữ")).toHaveValue("vi");

  await testInfo.attach("vietnamese-default-auth", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await page.getByLabel("Ngôn ngữ").selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByLabel("Language")).toHaveValue("en");

  await page.getByLabel("Language").selectOption("vi");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
});
