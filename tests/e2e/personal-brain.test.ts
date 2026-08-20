import { expect, test } from "@playwright/test";

const principleStatement =
  "Do not dissolve a high-value partnership before testing whether the trust problem can be corrected through explicit behavioral commitments.";

async function createDecision(
  page: import("@playwright/test").Page,
  context: string
) {
  await page.goto("/ask");
  await page.getByLabel("What are you deciding?").fill(context);
  await page.getByRole("button", { name: "Create decision" }).click();
  await expect(page).toHaveURL(/\/decisions\/[0-9a-f-]{36}$/);
}

async function runCouncil(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Run Council" }).click();
  await expect(page.getByTestId("council-brief")).toBeVisible();
}

test.describe("Milestone 5 Personal Brain", () => {
  test("Decision A adopts Principle P; Decision B retrieves and applies P", async ({
    page,
  }) => {
    await createDecision(
      page,
      "Cofounder của tôi rất giỏi nhưng né conflict. Tôi đang cân nhắc có nên tiếp tục partnership không."
    );
    await runCouncil(page);
    await page
      .getByLabel("What did you decide?")
      .fill(
        "Continue the partnership only after a time-bounded trust-repair test with explicit commitments."
      );
    await page.getByLabel("Confidence (%)").fill("70");
    await page.getByRole("button", { name: "Save judgment" }).click();

    const candidate = page.getByTestId("candidate-principle");
    await expect(candidate).toContainText(principleStatement);
    await candidate.getByRole("button", { name: "Adopt" }).click();
    await expect(
      page.getByText(principleStatement, { exact: true })
    ).toBeVisible();

    await createDecision(
      page,
      "I am considering ending the same cofounder partnership because conflict avoidance continues, but I want to test a reversible trust-repair path first."
    );

    const personalMemory = page.getByTestId("personal-memory");
    await expect(personalMemory).toBeVisible();
    const rememberedPrinciple = personalMemory
      .getByTestId("personal-principle")
      .filter({ hasText: principleStatement });
    await expect(rememberedPrinciple).toBeVisible();
    await expect(rememberedPrinciple).toContainText("Adopted after");
    await expect(personalMemory.getByText("Similar decisions")).toBeVisible();

    await rememberedPrinciple
      .getByRole("button", { name: "Apply to this decision" })
      .click();
    await expect(
      rememberedPrinciple.getByTestId("principle-applied")
    ).toBeVisible();

    await page.goto("/principles");
    const principleCard = page
      .getByTestId("principle-card")
      .filter({ hasText: principleStatement });
    await expect(principleCard).toContainText("Used 1 times");

    await page.goto("/brain");
    await expect(page.getByTestId("personal-brain-dashboard")).toBeVisible();
    await expect(page.getByTestId("brain-decisions")).toContainText("2");
    await expect(page.getByTestId("brain-principles")).toContainText("1");
    await expect(page.getByTestId("brain-reused")).toContainText("1");
  });
});
