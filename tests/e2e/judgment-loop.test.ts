import { expect, test } from "@playwright/test";

const decisionContext =
  "Cofounder của tôi rất giỏi nhưng né conflict. Tôi đang cân nhắc có nên tiếp tục partnership không.";

async function createDecision(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel("What are you deciding?").fill(decisionContext);
  await page.getByRole("button", { name: "Create decision" }).click();
  await expect(page).toHaveURL(/\/decisions\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { name: "Tiếp tục partnership?" })
  ).toBeVisible();
}

async function runCouncil(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Run Council" }).click();
  await expect(page.getByTestId("council-brief")).toBeVisible();
  await expect(page.getByRole("link", { name: "Make your judgment" })).toBeVisible();
}

test.describe("Milestone 4 Judgment Loop", () => {
  test("Decision → Council → Judgment → edited candidate → adopted principle → revision lifecycle", async ({
    page,
  }) => {
    await createDecision(page);
    await runCouncil(page);

    await page.getByTestId("judgment-start").first().click();
    await page
      .getByLabel("What did you decide?")
      .fill(
        "I will continue the partnership, but only after a direct conversation with explicit behavioral expectations."
      );
    await page.getByLabel("Selected option").fill("Continue with conditions");
    await page
      .getByLabel("Rationale")
      .fill("The relationship is valuable, but trust repair must become observable.");
    await page.getByLabel("Confidence (%)").fill("65");
    await page.getByRole("button", { name: "Save judgment" }).click();

    await expect(page.getByText("65% confidence", { exact: true })).toBeVisible();
    const candidate = page.getByTestId("candidate-principle");
    await expect(candidate).toContainText(
      "Do not dissolve a high-value partnership before testing"
    );

    await candidate.getByRole("button", { name: "Edit" }).click();
    const adoptedStatement =
      "Before ending a high-value partnership, test whether trust can be repaired through explicit, observable commitments.";
    await page.getByLabel("Candidate principle statement").fill(adoptedStatement);
    await page.getByRole("button", { name: "Save edit" }).click();
    await expect(candidate).toContainText(adoptedStatement);
    await candidate.getByRole("button", { name: "Adopt" }).click();
    await expect(candidate).toContainText("adopted");
    await expect(page.getByText(adoptedStatement, { exact: true })).toBeVisible();

    await page.goto("/principles");
    const card = page.getByTestId("principle-card").filter({
      hasText: adoptedStatement,
    });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Revision 1");
    await expect(card).toContainText("active");
    await expect(card).toContainText("Times applied: 0");
    await expect(card).toContainText("Origin: Tiếp tục partnership?");

    await card.getByRole("button", { name: "Edit" }).click();
    const revisedStatement =
      "Before ending a high-value partnership, run a time-bounded trust-repair test with observable commitments.";
    await card.getByLabel("Edit principle statement").fill(revisedStatement);
    await card.getByRole("button", { name: "Save revision" }).click();

    const revisedCard = page.getByTestId("principle-card").filter({
      hasText: revisedStatement,
    });
    await expect(revisedCard).toContainText("Revision 2");
    await expect(revisedCard).toContainText("revised");
    await revisedCard.getByText("Revision history", { exact: true }).click();
    await expect(revisedCard).toContainText(adoptedStatement);
    await expect(revisedCard).toContainText(revisedStatement);

    await revisedCard.getByRole("button", { name: "Retire" }).click();
    await expect(revisedCard).toContainText("retired");
  });

  test("rejecting a candidate does not add it to My Principles", async ({ page }) => {
    await createDecision(page);
    await runCouncil(page);
    await page
      .getByLabel("What did you decide?")
      .fill("Continue only if a short trust-repair test changes the behavior.");
    await page.getByRole("button", { name: "Save judgment" }).click();

    const candidate = page.getByTestId("candidate-principle");
    await expect(candidate).toBeVisible();
    const statement =
      "Do not dissolve a high-value partnership before testing whether the trust problem can be corrected through explicit behavioral commitments.";
    await expect(candidate).toContainText(statement);
    await candidate.getByRole("button", { name: "Reject" }).click();
    await expect(candidate).toContainText("rejected");

    await page.goto("/principles");
    await expect(page.getByText(statement, { exact: true })).toHaveCount(0);
  });
});
