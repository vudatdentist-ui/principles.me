import { expect, test } from "@playwright/test";

const password = "a strong browser test password";

const ragSource = {
  key: "R1",
  provider: "ragflow",
  publishedAt: null,
  retrievedAt: "2026-09-08T01:00:00.000Z",
  snippet: "A safe, bounded excerpt from shared Principles knowledge.",
  sourceType: "ragflow",
  title: "Principles knowledge source",
  url: null,
};

const liveSource = {
  key: "W1",
  provider: "brave",
  publishedAt: "2026-09-08T00:30:00.000Z",
  retrievedAt: "2026-09-08T01:00:00.000Z",
  snippet: "A current public source excerpt.",
  sourceType: "live_web",
  title: "Live source",
  url: "https://example.com/live",
};

function ndjson(answer: string): string {
  return `${[
    { message: "Searching…", stage: "retrieving", type: "status" },
    {
      live: "ok",
      personal: "ok",
      private: "ok",
      references: [ragSource, liveSource],
      type: "sources",
    },
    { message: "Thinking from principles…", stage: "answering", type: "status" },
    { token: answer, type: "token" },
    { type: "done" },
  ]
    .map((event) => JSON.stringify(event))
    .join("\n")}\n`;
}

async function createAccount(page: import("@playwright/test").Page) {
  const email = `phase6-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Principles" })).toBeVisible();
  await page.getByRole("button", { name: "Create account" }).first().click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const signupResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/signup") && response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Create account" }).last().click();
  expect((await signupResponse).status()).toBe(201);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "What deserves attention now?" })
  ).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  return email;
}

async function answerGoalQuestion(
  page: import("@playwright/test").Page,
  value: string
) {
  const continueButton = page.getByRole("button", { name: "Continue" });
  await expect(continueButton).toBeVisible();
  await page.getByLabel("Goal discovery answer").fill(value);
  await expect(continueButton).toBeEnabled();
  await continueButton.click();
}

async function createGoal(
  page: import("@playwright/test").Page,
  values: [string, string, string, string, string]
) {
  for (const value of values) {
    await answerGoalQuestion(page, value);
  }
  const addGoal = page.getByRole("button", { name: "Add goal" });
  await expect(addGoal).toBeVisible();
  await addGoal.click();
}

const companyGoal: [string, string, string, string, string] = [
  "Build a company that operates without depending on me day to day.",
  "I want the company to compound without making me its bottleneck.",
  "The team makes routine operating decisions without waiting for me.",
  "I will deprioritize low-value side projects.",
  "Protect health and family time.",
];

const healthGoal: [string, string, string, string, string] = [
  "Build durable health and energy.",
  "Energy determines how well I can live and work.",
  "I train consistently and recover well for three months.",
  "I will reduce late-night work.",
  "Protect family commitments.",
];

test("authenticated shell uses Me and empty Learning waits for lived history", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/evolution/state")).status()).toBe(401);
  expect((await request.get("/api/learning/state")).status()).toBe(401);
  expect(
    (await request.post("/api/ask", { data: { question: "What is private?" } })).status()
  ).toBe(401);

  await createAccount(page);
  const evolution = await page.evaluate(async () => {
    const response = await fetch("/api/evolution/state");
    return { body: await response.json(), status: response.status };
  });
  expect(evolution.status).toBe(200);
  expect(evolution.body.stage).toBe("dream");
  expect(evolution.body.fiveSteps.current).toBe("goal");
  expect(evolution.body.goals).toEqual([]);
  expect(JSON.stringify(evolution.body)).not.toContain("workspaceId");

  for (const [path, active] of [
    ["/", "Me"],
    ["/organization", "Organization"],
    ["/knowledge", "Knowledge"],
    ["/learning", "Learning"],
  ] as const) {
    await page.goto(path);
    for (const tab of ["Me", "Organization", "Knowledge", "Learning"]) {
      await expect(page.getByRole("link", { name: tab, exact: true }).first()).toBeVisible();
    }
    await expect(page.getByRole("link", { name: active, exact: true }).first()).toHaveAttribute(
      "aria-current",
      "page"
    );
  }

  await expect(
    page.getByRole("heading", { name: "What is reality teaching you?" })
  ).toBeVisible();
  await expect(
    page.getByText(
      "Not enough history yet. Live the loop before asking the system to define a pattern.",
      { exact: true }
    )
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Find a pattern" })).toHaveCount(0);
});

test("Me keeps multiple goals visible and projects each goal independently", async ({ page }) => {
  await createAccount(page);
  await createGoal(page, companyGoal);
  await expect(page.getByRole("button", { name: "+ Goal" })).toBeVisible();
  await page.getByRole("button", { name: "+ Goal" }).click();
  await createGoal(page, healthGoal);

  await expect(page.getByText(companyGoal[0]).first()).toBeVisible();
  await expect(page.getByText(healthGoal[0]).first()).toBeVisible();

  const portfolio = await page.evaluate(async () => {
    const response = await fetch("/api/evolution/state");
    return response.json();
  });
  expect(portfolio.goals).toHaveLength(2);
  const company = portfolio.goals.find(
    (goal: { desiredState: string }) => goal.desiredState === companyGoal[0]
  );
  const health = portfolio.goals.find(
    (goal: { desiredState: string }) => goal.desiredState === healthGoal[0]
  );
  expect(company?.id).toBeTruthy();
  expect(health?.id).toBeTruthy();

  const lanes = await page.evaluate(async ({ companyId, healthId }) => {
    const [companyResponse, healthResponse] = await Promise.all([
      fetch(`/api/evolution/state?goalId=${encodeURIComponent(companyId)}`),
      fetch(`/api/evolution/state?goalId=${encodeURIComponent(healthId)}`),
    ]);
    return {
      company: await companyResponse.json(),
      health: await healthResponse.json(),
    };
  }, { companyId: company.id as string, healthId: health.id as string });

  expect(lanes.company.dream.desiredState).toBe(companyGoal[0]);
  expect(lanes.health.dream.desiredState).toBe(healthGoal[0]);
  expect(lanes.company.stage).toBe("reality");
  expect(lanes.health.stage).toBe("reality");

  const companyButton = page.locator('button[aria-pressed]').filter({ hasText: companyGoal[0] });
  await companyButton.click();
  await expect(companyButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: companyGoal[0] }).first()).toBeVisible();
});

test("one goal completes 5 Steps, Outcome, Reflection, Principle, and Learning", async ({
  page,
}) => {
  const actualOutcome =
    "The next three routine operating decisions were made by the named owner without waiting for me.";
  const outcomeLearning =
    "Changing default decision authority changed behavior; discussing responsibilities alone had not.";
  const correctedPattern =
    "The observed cycle suggests explicit default authority changed behavior where role discussion alone had not.";
  const revisedRule =
    "Name the decision owner and default authority before the next routine case, then verify the next real outcome.";

  await createAccount(page);
  await createGoal(page, companyGoal);
  await expect(page.getByText("Dream").first()).toBeVisible();
  await expect(page.getByText("Reality").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "5 Steps" })).toBeVisible();

  await page
    .getByLabel("What is actually true?")
    .fill("Three routine operating decisions waited for me this week.");
  await page.getByRole("button", { name: "Record reality" }).click();

  await page.getByRole("button", { name: "Find the problem" }).click();
  await expect(page.getByLabel("Problem")).toHaveValue(
    "The founder remains a routine operating bottleneck."
  );
  await page.getByRole("button", { name: "Name this problem" }).click();

  await page.getByRole("button", { name: "Diagnose the root cause" }).click();
  await expect(page.getByLabel("Root-cause hypothesis")).toHaveValue(
    "Routine decisions have no explicit default owner with authority to act without founder approval."
  );
  await page.getByRole("button", { name: "Accept this diagnosis" }).click();

  await page.getByRole("button", { name: "Design the machine" }).click();
  await expect(page.getByLabel("Machine change")).toHaveValue(
    "Assign one explicit decision owner and a default authority boundary for routine operating decisions."
  );
  await page.getByRole("button", { name: "Adopt this design" }).click();
  await expect(page.getByRole("button", { name: /^Complete / }).first()).toBeVisible();

  for (let guard = 0; guard < 6; guard += 1) {
    const completeButtons = page.getByRole("button", { name: /^Complete / });
    const beforeCount = await completeButtons.count();
    if (beforeCount === 0) break;

    const actionResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/people/actions") &&
        response.request().method() === "POST"
    );
    await completeButtons.first().click();
    expect((await actionResponse).status()).toBe(200);
    await expect
      .poll(async () => page.getByRole("button", { name: /^Complete / }).count())
      .toBe(beforeCount - 1);
  }

  await expect(page.getByLabel("Actual outcome")).toBeVisible();
  await page.getByLabel("Actual outcome").fill(actualOutcome);
  await page.getByRole("button", { name: "improved" }).click();
  await page.getByRole("button", { name: "Record outcome" }).click();

  await expect(page.getByText("Pain").first()).toBeVisible();
  await page.getByLabel("What hurt or surprised you?").fill(
    "A small authority rule removed more waiting than another discussion did."
  );
  await page.getByLabel("What did this teach you?").fill(outcomeLearning);
  await page.getByRole("button", { name: "Save reflection" }).click();

  await page.getByRole("button", { name: "Distill a principle" }).click();
  await expect(
    page
      .getByText(
        "Make the decision owner and default authority explicit before the next routine case."
      )
      .first()
  ).toBeVisible();
  await page.getByRole("button", { name: "Accept for testing" }).click();
  await expect(page.getByText("testing", { exact: true }).first()).toBeVisible();

  const finalEvolution = await page.evaluate(async () => {
    const response = await fetch("/api/evolution/state");
    return response.json();
  });
  expect(finalEvolution.stage).toBe("principle");
  expect(
    finalEvolution.fiveSteps.steps.every((step: { status: string }) => step.status === "complete")
  ).toBe(true);
  expect(finalEvolution.outcome.comparison).toBe("improved");
  expect(finalEvolution.reflection.learning).toBe(outcomeLearning);
  expect(finalEvolution.principle.lifecycleState).toBe("testing");

  const secondReflectionStatus = await page.evaluate(async () => {
    const stateResponse = await fetch("/api/people/state");
    const state = await stateResponse.json();
    const response = await fetch("/api/people/reflections", {
      body: JSON.stringify({
        expected: "Role discussion would remove the bottleneck.",
        goalId: state.goals[0].id,
        happened: "The same approval wait returned after another role discussion.",
        learning: "Discussion without explicit default authority did not change behavior.",
        problemId: state.problems[0].id,
        recurrenceNote: "The approval bottleneck repeated before the machine rule changed.",
        recurring: true,
        surprise: "Clarity in conversation did not create authority in practice.",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    return response.status;
  });
  expect(secondReflectionStatus).toBe(201);

  await page.goto("/learning");
  await expect(
    page.getByRole("heading", { name: "What is reality teaching you?" })
  ).toBeVisible();
  await expect(page.getByText(outcomeLearning).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rules I am testing" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Distill principle" })).toBeVisible();

  await expect(page.getByRole("button", { name: "Find a pattern" })).toBeVisible();
  await page.getByRole("button", { name: "Find a pattern" }).click();
  await expect(
    page.getByText(
      "Explicit default authority changed behavior where discussing responsibilities alone had not."
    )
  ).toBeVisible();
  await page.getByText("Inspect the evidence").click();
  await expect(page.getByText("Outcome review", { exact: false }).first()).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Pattern statement").fill(correctedPattern);
  await page.getByRole("button", { name: "Save corrected pattern" }).click();
  await expect(page.getByText(correctedPattern)).toBeVisible();
  await page.getByRole("button", { name: "Revise this principle" }).click();
  await page.getByLabel("Revised principle rule").fill(revisedRule);
  await page.getByRole("button", { name: "Revise and test" }).click();
  await expect(page.getByText("Principle revised · testing")).toBeVisible();

  const peopleState = await page.evaluate(async () => {
    const response = await fetch("/api/people/state");
    return response.json();
  });
  const revisedPrinciple = peopleState.principles.find(
    (item: { rule: string }) => item.rule === revisedRule
  );
  expect(revisedPrinciple?.acceptanceState).toBe("revised");
  expect(revisedPrinciple?.lifecycleState).toBe("testing");
});

test("Learning lets a user add a principle directly", async ({ page }) => {
  const trigger = "I am making an irreversible decision";
  const rule = "Slow down until I understand the downside.";

  await createAccount(page);
  await page.goto("/learning");
  await page.getByRole("button", { name: "+ Add principle" }).click();
  await page.getByLabel("Principle trigger").fill(trigger);
  await page.getByLabel("Principle rule").fill(rule);
  await page
    .getByLabel("Principle rationale")
    .fill("Reversal cost matters more than speed in this context.");
  await page.getByRole("button", { name: "Save principle" }).click();

  await expect(page.getByRole("heading", { name: rule })).toBeVisible();
  await expect(page.getByText("testing", { exact: true }).first()).toBeVisible();

  const saved = await page.evaluate(async ({ expectedRule }) => {
    const response = await fetch("/api/people/state");
    const state = await response.json();
    return state.principles.find((item: { rule: string }) => item.rule === expectedRule);
  }, { expectedRule: rule });

  expect(saved.originReflectionId).toBeNull();
  expect(saved.acceptanceState).toBe("accepted");
  expect(saved.lifecycleState).toBe("testing");
});

test("Knowledge uses shared evidence plus bounded personal context without durable writes", async ({
  page,
}) => {
  await createAccount(page);
  await createGoal(page, companyGoal);
  const before = await page.evaluate(async () => {
    const response = await fetch("/api/evolution/state");
    return response.json();
  });

  await page.goto("/knowledge");
  await expect(page.getByRole("heading", { name: "Think from principles." })).toBeVisible();

  await page.route("**/api/ask", async (route) => {
    await route.fulfill({
      body: ndjson("Shared knowledge [R1] and current evidence [W1] support this answer."),
      contentType: "application/x-ndjson; charset=utf-8",
      status: 200,
    });
  });

  await page.getByLabel("Question").fill("What problem am I not confronting?");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByRole("heading", { name: "Answer" })).toBeVisible();
  await expect(
    page.getByText("Shared Principles knowledge").locator("..").getByText("Connected")
  ).toBeVisible();
  await expect(
    page.getByText("Personal evolution context").locator("..").getByText("Connected")
  ).toBeVisible();
  await expect(
    page.getByText("Live public search").locator("..").getByText("Connected")
  ).toBeVisible();
  await expect(page.getByText("Principles knowledge source")).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue in Me →" })).toBeVisible();

  const after = await page.evaluate(async () => {
    const response = await fetch("/api/evolution/state");
    return response.json();
  });
  expect(after).toEqual(before);
  expect(JSON.stringify(after)).not.toContain("workspaceId");
});

test("long Knowledge answers keep normal document scrolling", async ({ page }) => {
  await createAccount(page);
  await page.goto("/knowledge");
  const longAnswer = Array.from(
    { length: 80 },
    (_, index) => `Paragraph ${index + 1}: a deliberately long answer for scrolling verification.`
  ).join("\n\n");

  await page.route("**/api/ask", async (route) => {
    await route.fulfill({
      body: ndjson(longAnswer),
      contentType: "application/x-ndjson; charset=utf-8",
      status: 200,
    });
  });
  await page.getByLabel("Question").fill("Give me the full long answer.");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByText("Paragraph 80:", { exact: false })).toBeVisible();

  const scrollState = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    overflow: getComputedStyle(document.body).overflowY,
    viewport: window.innerHeight,
  }));
  expect(scrollState.height).toBeGreaterThan(scrollState.viewport);
  expect(scrollState.overflow).not.toBe("hidden");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.getByText("Live source")).toBeInViewport();
});
