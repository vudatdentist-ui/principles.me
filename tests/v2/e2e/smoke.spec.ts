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

test("renders the primary product shell on the domain root", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole("link", { exact: true, name: "Principles" })
  ).toHaveAttribute("href", "/");

  const navigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  await expect(
    navigation.getByRole("link", { exact: true, name: "History" })
  ).toHaveAttribute("href", "/history");
  await expect(
    navigation.getByRole("link", { exact: true, name: "Brain" })
  ).toHaveAttribute("href", "/brain");

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

test("redirects the old V2 root to the primary domain root", async ({ page }) => {
  await page.goto("/v2");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("Decision question")).toBeVisible();
});

test("streams a mocked Decision Brief through the primary workspace", async ({
  page,
}) => {
  await installMockDecisionTransport(page, {
    endpoint: "**/api/v2/decisions",
    events: successfulDecisionEvents,
  });
  await page.goto("/");

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

test("scrolls long Decision Briefs with normal document scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ height: 720, width: 1280 });
  await installMockDecisionTransport(page, {
    endpoint: "**/api/v2/decisions",
    events: successfulDecisionEvents,
  });
  await page.goto("/");

  await page.getByLabel("Decision question").fill(decisionQuestion);
  await page.getByRole("button", { name: "Decide" }).click();
  await expect(
    page.getByRole("heading", { name: decisionBriefFixture.recommendation })
  ).toBeVisible();

  const bodyOverflowY = await page.locator("body").evaluate(
    (element) => getComputedStyle(element).overflowY
  );
  expect(bodyOverflowY).not.toBe("hidden");

  const metrics = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
  }));
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.viewportHeight);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.getByText("Valid as of", { exact: false })).toBeInViewport();
});

test("keeps primary navigation available across History and Brain", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { exact: true, name: "History" }).click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(
    page.getByRole("link", { exact: true, name: "Principles" })
  ).toBeVisible();

  await page.getByRole("link", { exact: true, name: "Principles" }).click();
  await page.getByRole("link", { exact: true, name: "Brain" }).click();
  await expect(page).toHaveURL(/\/brain$/);
  await expect(
    page.getByRole("link", { exact: true, name: "Principles" })
  ).toBeVisible();
});
