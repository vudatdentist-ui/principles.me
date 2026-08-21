import { expect, test } from "@playwright/test";
import { blockExternalNetwork } from "../helpers/network";

const LEGACY_SURFACE_TERMS = [
  "Thinker Machine",
  "Evidence Judge",
  "Suggested actions",
  "Goals dashboard",
] as const;

test.beforeEach(async ({ page }) => {
  await blockExternalNetwork(page);
});

test("renders the V2 product shell without legacy dashboard concepts", async ({
  page,
}) => {
  const response = await page.goto("/v2");

  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole("link", { exact: true, name: "Principles" })
  ).toHaveAttribute("href", "/v2");

  const navigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  await expect(
    navigation.getByRole("link", { exact: true, name: "History" })
  ).toHaveAttribute("href", "/v2/history");
  await expect(
    navigation.getByRole("link", { exact: true, name: "Brain" })
  ).toHaveAttribute("href", "/v2/brain");

  const workspace = page.getByRole("combobox", { name: "Workspace" });
  await expect(workspace).toHaveValue("personal");
  await expect(workspace.locator('option[value="company"]')).toBeDisabled();

  await expect(page.getByTestId("model-selector")).toHaveCount(0);
  await Promise.all(
    LEGACY_SURFACE_TERMS.map((term) =>
      expect(page.getByText(term, { exact: false })).toHaveCount(0)
    )
  );
});

test("keeps V2 navigation available across History and Brain", async ({ page }) => {
  await page.goto("/v2");

  await page.getByRole("link", { exact: true, name: "History" }).click();
  await expect(page).toHaveURL(/\/v2\/history$/);
  await expect(
    page.getByRole("link", { exact: true, name: "Principles" })
  ).toBeVisible();

  await page.getByRole("link", { exact: true, name: "Principles" }).click();
  await page.getByRole("link", { exact: true, name: "Brain" }).click();
  await expect(page).toHaveURL(/\/v2\/brain$/);
  await expect(
    page.getByRole("link", { exact: true, name: "Principles" })
  ).toBeVisible();
});
