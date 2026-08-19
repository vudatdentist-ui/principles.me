import { expect, test } from "@playwright/test";

const originalPrinciple =
  "Do not dissolve a high-value partnership before testing whether the trust problem can be corrected through explicit behavioral commitments.";
const revisedPrinciple =
  "Avoid irreversible partnerships when conflict repair remains unproven after a time-bounded behavioral test.";

async function createDecision(page: import("@playwright/test").Page) {
  await page.goto("/ask");
  await page
    .getByLabel("What are you deciding?")
    .fill(
      "Cofounder của tôi rất giỏi nhưng né conflict. Tôi đang cân nhắc có nên tiếp tục partnership không."
    );
  await page.getByRole("button", { name: "Create decision" }).click();
  await expect(page).toHaveURL(/\/decisions\/[0-9a-f-]{36}$/);
}

async function adoptPrinciple(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Run Council" }).click();
  await expect(page.getByTestId("council-brief")).toBeVisible();
  await page
    .getByLabel("What did you decide?")
    .fill(
      "Continue only through a time-bounded trust-repair test with explicit commitments."
    );
  await page.getByLabel("Confidence (%)").fill("70");
  await page.getByRole("button", { name: "Save judgment" }).click();
  const candidate = page.getByTestId("candidate-principle");
  await expect(candidate).toContainText(originalPrinciple);
  await candidate.getByRole("button", { name: "Adopt" }).click();
}

test.describe("Milestone 6 Learning Loop", () => {
  test("Decision → Judgment → Principle → Outcome → assumption review → Principle revision", async ({
    page,
  }) => {
    await createDecision(page);
    await adoptPrinciple(page);

    await page.getByTestId("learning-loop-launcher").click();
    const loop = page.getByTestId("learning-loop");
    await expect(loop).toBeVisible();

    await loop.getByRole("button", { name: "30 days" }).click();
    await expect(loop.getByTestId("review-scheduled")).toBeVisible();

    await loop
      .getByLabel("What happened?")
      .fill(
        "The trust-repair test surfaced the same avoidance pattern even after expectations were explicit."
      );
    await loop.getByLabel("Outcome").selectOption("negative");
    await loop.getByLabel("Was the decision good?").selectOption("yes");
    await loop.getByLabel("Was the reasoning good?").selectOption("partially");
    await loop
      .getByLabel("Was assumption 1 correct?")
      .selectOption("incorrect");
    await loop
      .getByLabel("Assumption 1 note")
      .fill("The behavior did not improve during the test window.");
    await loop
      .getByLabel("What did you learn?")
      .fill(
        "A reversible test was the right process, but the original assumption about repairability was wrong."
      );
    await loop.getByRole("button", { name: "Save decision review" }).click();

    const latestReview = loop.getByTestId("latest-learning-review");
    await expect(latestReview).toContainText("Outcome: negative");
    await expect(latestReview).toContainText("Decision good: yes");
    await expect(latestReview).toContainText("Reasoning good: partially");
    await expect(latestReview).toContainText("incorrect");
    await expect(latestReview).toContainText(
      "The behavior did not improve during the test window."
    );

    const principleReview = loop
      .getByTestId("learning-principle-review")
      .filter({ hasText: originalPrinciple });
    await principleReview.getByRole("button", { name: "Revise" }).click();
    await principleReview
      .getByLabel("Revised principle")
      .fill(revisedPrinciple);
    await principleReview
      .getByRole("button", { name: "Save revision" })
      .click();
    await expect(loop).toContainText(revisedPrinciple);
    await expect(loop.getByTestId("principle-review-saved")).toContainText(
      "revise · resulting revision 2"
    );

    await page.reload();
    await page.getByTestId("learning-loop-launcher").click();
    const reloadedLoop = page.getByTestId("learning-loop");
    await expect(
      reloadedLoop.getByTestId("latest-learning-review")
    ).toContainText(
      "The trust-repair test surfaced the same avoidance pattern"
    );
    await expect(reloadedLoop).toContainText(revisedPrinciple);
    await expect(reloadedLoop).toContainText("resulting revision 2");

    await page.goto("/principles");
    const revisedCard = page
      .getByTestId("principle-card")
      .filter({ hasText: revisedPrinciple });
    await expect(revisedCard).toContainText("changed once");
    await revisedCard.getByRole("button").first().click();
    await expect(
      revisedCard.getByRole("heading", { name: "History" })
    ).toBeVisible();
    await expect(revisedCard.getByText("v2", { exact: true })).toBeVisible();
    await expect(revisedCard.getByText("v1", { exact: true })).toBeVisible();
  });
});
