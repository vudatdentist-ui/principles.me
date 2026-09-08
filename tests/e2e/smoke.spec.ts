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
  await expect(page.getByRole("heading", { name: "Evolve through reality." })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  return email;
}

async function answerDreamQuestion(
  page: import("@playwright/test").Page,
  value: string
) {
  const continueButton = page.getByRole("button", { name: "Continue" });
  await expect(continueButton).toBeVisible();
  await page.getByLabel("Goal discovery answer").fill(value);
  await expect(continueButton).toBeEnabled();
  await continueButton.click();
}

async function createDream(page: import("@playwright/test").Page) {
  await answerDreamQuestion(page, "Build a company that operates without depending on me day to day.");
  await answerDreamQuestion(page, "I want the company to compound without making me its bottleneck.");
  await answerDreamQuestion(page, "The team makes routine operating decisions without waiting for me.");
  await answerDreamQuestion(page, "I will deprioritize low-value side projects.");
  await answerDreamQuestion(page, "Protect health and family time.");

  const chooseDream = page.getByRole("button", { name: "Choose this dream" });
  await expect(chooseDream).toBeVisible();
  await chooseDream.click();
}

test("authenticated shell is coherent and empty Learning waits for lived history", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/evolution/state")).status()).toBe(401);
  expect((await request.get("/api/learning/state")).status()).toBe(401);
  expect((await request.post("/api/ask", { data: { question: "What is private?" } })).status()).toBe(401);

  const email = await createAccount(page);
  const evolution = await page.evaluate(async () => {
    const response = await fetch("/api/evolution/state");
    return { body: await response.json(), status: response.status };
  });
  expect(evolution.status).toBe(200);
  expect(evolution.body.stage).toBe("dream");
  expect(evolution.body.fiveSteps.current).toBe("goal");
  expect(JSON.stringify(evolution.body)).not.toContain("workspaceId");

  for (const [path, active] of [
    ["/", "People"],
    ["/organization", "Organization"],
    ["/knowledge", "Knowledge"],
    ["/learning", "Learning"],
  ] as const) {
    await page.goto(path);
    for (const tab of ["People", "Organization", "Knowledge", "Learning"]) {
      await expect(page.getByRole("link", { name: tab, exact: true }).first()).toBeVisible();
    }
    await expect(page.getByRole("link", { name: active, exact: true }).first()).toHaveAttribute(
      "aria-current",
      "page"
    );
  }

  await expect(page.getByRole("heading", { name: "What is reality teaching you?" })).toBeVisible();
  await expect(
    page.getByText(
      "Not enough history yet. Live the loop before asking the system to define a pattern.",
      { exact: true }
    )
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Find a pattern" })).toHaveCount(0);

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("button", { name: "Sign in" }).first().click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).last().click();
  await expect(page.getByRole("heading", { name: "Evolve through reality." })).toBeVisible();
});

test("one person completes Dream, 5 Steps, Outcome, Pain + Reflection, and a living Principle", async ({
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
  await expect(page.getByText("Dream").first()).toBeVisible();
  await expect(page.getByText("Reality").first()).toBeVisible();
  await expect(page.getByText("5 Steps to Get What You Want")).toBeVisible();
  await createDream(page);

  await page
    .getByLabel("Describe reality without explaining it away.")
    .fill("Three routine operating decisions waited for me this week.");
  await page.getByRole("button", { name: "Record reality" }).click();

  await page.getByRole("button", { name: "Find the problem" }).click();
  await expect(page.getByLabel("Problem statement")).toHaveValue(
    "The founder remains a routine operating bottleneck."
  );
  await page.getByRole("button", { name: "Name this problem" }).click();

  await expect(page.getByRole("button", { name: "Diagnose the root cause" })).toBeVisible();
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

  for (let index = 0; index < 3; index += 1) {
    const nextAction = page.getByRole("button", { name: /^Complete / }).first();
    await expect(nextAction).toBeVisible();
    await nextAction.click();
  }

  await page.getByLabel("Actual outcome").fill(actualOutcome);
  await page.getByRole("button", { name: "improved" }).click();
  await page.getByRole("button", { name: "Record observed outcome" }).click();

  await expect(page.getByText("Pain").first()).toBeVisible();
  await page.getByLabel("What hurt or surprised you?").fill(
    "A small authority rule removed more waiting than another discussion did."
  );
  await page.getByLabel("What should change in your model next time?").fill(outcomeLearning);
  await page.getByRole("button", { name: "Turn reflection into progress" }).click();

  await page.getByRole("button", { name: "Distill a principle" }).click();
  await expect(
    page.getByText("Make the decision owner and default authority explicit before the next routine case.")
  ).toBeVisible();
  await page.getByRole("button", { name: "Accept for testing" }).click();
  await expect(page.getByText("testing", { exact: true }).first()).toBeVisible();

  const finalEvolution = await page.evaluate(async () => {
    const response = await fetch("/api/evolution/state");
    return response.json();
  });
  expect(finalEvolution.stage).toBe("principle");
  expect(finalEvolution.fiveSteps.steps.every((step: { status: string }) => step.status === "complete")).toBe(true);
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
  await expect(page.getByRole("heading", { name: "What is reality teaching you?" })).toBeVisible();
  await expect(page.getByText(outcomeLearning).first()).toBeVisible();
  await expect(page.getByText("A rule earns trust through reality.")).toBeVisible();

  await expect(page.getByRole("button", { name: "Find a pattern" })).toBeVisible();
  await page.getByRole("button", { name: "Find a pattern" }).click();
  await expect(
    page.getByText("Explicit default authority changed behavior where discussing responsibilities alone had not.")
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

test("Knowledge uses shared evidence plus bounded personal context without durable writes", async ({ page }) => {
  await createAccount(page);
  await createDream(page);
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
  await expect(page.getByRole("heading", { name: "Reason with reality." })).toBeVisible();
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
  await expect(page.getByRole("link", { name: "Use this thinking in People →" })).toBeVisible();

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
