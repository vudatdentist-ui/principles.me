import { expect, test } from "@playwright/test";
import {
  decisionBriefFixture,
  decisionQuestion,
  successfulDecisionEvents,
} from "../fixtures/decision";
import { installMockDecisionTransport } from "../helpers/mock-transport";
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
  await expect(workspace.locator('option[value="company"]')).toHaveAttribute(
    "disabled",
    ""
  );

  await expect(page.getByLabel("Decision question")).toBeVisible();
  await expect(page.getByRole("button", { name: "Decide" })).toBeDisabled();
  await expect(page.getByTestId("model-selector")).toHaveCount(0);
  await Promise.all(
    LEGACY_SURFACE_TERMS.map((term) =>
      expect(page.getByText(term, { exact: false })).toHaveCount(0)
    )
  );
});

test("streams a mocked Decision Brief through the V2 workspace", async ({
  page,
}) => {
  await installMockDecisionTransport(page, {
    endpoint: "**/api/v2/decisions",
    events: successfulDecisionEvents,
  });
  await page.goto("/v2");

  await page.getByLabel("Decision question").fill(decisionQuestion);
  await page.getByRole("button", { name: "Decide" }).click();

  await expect(
    page.getByRole("heading", { name: decisionBriefFixture.recommendation })
  ).toBeVisible();
  await expect(
    page.getByText(decisionBriefFixture.nextAction, { exact: true })
  ).toBeVisible();

  const evidenceButton = page.getByRole("button", { name: "View evidence" });
  await expect(evidenceButton).toBeEnabled();
  await evidenceButton.click();
  await expect(page.getByText("Pilot readiness review", { exact: true })).toBeVisible();
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
