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

function ndjsonEvents(value: string) {
  return value
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => JSON.parse(row) as Record<string, unknown>);
}

test.describe("Decision workspace", () => {
  test("uses the decision-first v1 navigation", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "What are you deciding?" })
    ).toBeVisible();
    const navigation = page.getByRole("navigation", {
      name: "Main navigation",
    });
    await expect(navigation.getByText("Ask", { exact: true })).toBeVisible();
    await expect(
      navigation.getByText("Decisions", { exact: true })
    ).toBeVisible();
    await expect(
      navigation.getByText("My Principles", { exact: true })
    ).toBeVisible();
    await expect(
      navigation.getByText("Explore", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("Team Brain", { exact: true })).toHaveCount(0);
  });

  test("persists a created decision across reload and the Decisions list", async ({
    page,
  }) => {
    await createDecision(page);
    await expect(page.getByText(decisionContext)).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Tiếp tục partnership?" })
    ).toBeVisible();
    await expect(page.getByText(decisionContext)).toBeVisible();

    await page.goto("/decisions");
    await expect(
      page.getByText("Tiếp tục partnership?", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  });

  test("runs Auto Council, links claims to evidence, and persists the brief", async ({
    page,
  }) => {
    await createDecision(page);

    await expect(
      page.getByText("Customize Council", { exact: true })
    ).toBeVisible();
    await page.getByRole("button", { name: "Run Council" }).click();

    const plan = page.getByTestId("council-plan");
    await expect(plan).toBeVisible();
    await expect(plan).toContainText("Auto Council");
    await expect(plan).toContainText("Trust & integrity");
    await expect(plan).toContainText("Conflict & candor");

    const brief = page.getByTestId("council-brief");
    await expect(brief).toBeVisible();
    await expect(
      brief.getByRole("heading", { name: "Where the council agrees" })
    ).toBeVisible();
    await expect(
      brief.getByRole("heading", { name: "The crux" })
    ).toBeVisible();
    await expect(
      brief.getByText("interpretation", { exact: true }).first()
    ).toBeVisible();
    await expect(
      brief.getByText("application", { exact: true }).first()
    ).toBeVisible();

    const citation = brief
      .getByRole("link", { exact: true, name: "R1" })
      .first();
    await citation.click();
    await expect(page).toHaveURL(/#evidence-R1$/);
    await expect(page.getByTestId("evidence-R1")).toBeVisible();
    await expect(page.getByTestId("evidence-R1")).toContainText(
      "Principles — Radical Truth"
    );

    await page.reload();
    await expect(page.getByTestId("council-plan")).toContainText(
      "Auto Council"
    );
    await expect(page.getByTestId("council-brief")).toBeVisible();
    await expect(page.getByTestId("evidence-R1")).toBeVisible();
  });

  test("Council fails closed when multi-query retrieval has no evidence", async ({
    request,
  }) => {
    const response = await request.post("/api/council", {
      data: {
        context: "NO_EVIDENCE_FIXTURE",
        question: "NO_EVIDENCE_FIXTURE?",
        thinkerIds: [],
      },
    });
    expect(response.ok()).toBeTruthy();
    const events = ndjsonEvents(await response.text());
    const plan = events.find((event) => event.type === "plan");
    const answer = events.find((event) => event.type === "answer");

    expect(plan).toBeTruthy();
    expect(answer?.grounded).toBe(false);
    expect(answer?.brief).toBeNull();
    expect(answer?.citations).toEqual([]);
  });

  test("persists judgment, principle, and outcome on the decision", async ({
    page,
  }) => {
    await createDecision(page);

    await page
      .getByLabel("What did you decide?")
      .fill("Continue the partnership with a 60-day conflict protocol test.");
    await page.getByLabel("Selected option").fill("Continue with conditions");
    await page
      .getByLabel("Rationale")
      .fill(
        "Capability matters, but conflict avoidance needs a measurable correction window."
      );
    await page.getByRole("button", { name: "Save judgment" }).click();
    await expect(
      page.getByText("Decided", { exact: true }).first()
    ).toBeVisible();

    await page
      .getByLabel("Keep a principle")
      .fill("Do not normalize repeated avoidance of hard conversations.");
    await page
      .getByLabel("Why it matters")
      .fill(
        "Partnership quality depends on resolving tension before it compounds."
      );
    await page.getByRole("button", { name: "Adopt principle" }).click();
    await expect(
      page.getByText(
        "Do not normalize repeated avoidance of hard conversations."
      )
    ).toBeVisible();

    await page
      .getByLabel("What happened?")
      .fill(
        "The protocol exposed the issue quickly and made the partnership workable."
      );
    await page.getByLabel("Verdict").selectOption("positive");
    await page
      .getByLabel("What did you learn?")
      .fill(
        "Behavioral tests are more useful than vague promises to communicate better."
      );
    await page.getByRole("button", { name: "Save outcome" }).click();
    await expect(
      page.getByText("Reviewed", { exact: true }).first()
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByText(
        "Continue the partnership with a 60-day conflict protocol test."
      )
    ).toBeVisible();
    await expect(
      page.getByText(
        "Do not normalize repeated avoidance of hard conversations."
      )
    ).toBeVisible();
    await expect(
      page.getByText(
        "The protocol exposed the issue quickly and made the partnership workable."
      )
    ).toBeVisible();

    await page.goto("/principles");
    await expect(
      page.getByText(
        "Do not normalize repeated avoidance of hard conversations."
      )
    ).toBeVisible();
  });
});
