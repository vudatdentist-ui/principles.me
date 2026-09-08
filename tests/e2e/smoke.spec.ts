import { expect, test } from "@playwright/test";

const password = "a strong browser test password";

const ragSource = {
  key: "R1",
  provider: "ragflow",
  publishedAt: null,
  retrievedAt: "2026-08-24T01:00:00.000Z",
  snippet: "A safe, bounded excerpt from private knowledge.",
  sourceType: "ragflow",
  title: "Knowledge source",
  url: null,
};

const liveSource = {
  key: "W1",
  provider: "brave",
  publishedAt: "2026-08-24T00:30:00.000Z",
  retrievedAt: "2026-08-24T01:00:00.000Z",
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
      private: "ok",
      references: [ragSource, liveSource],
      type: "sources",
    },
    { message: "Preparing…", stage: "answering", type: "status" },
    { token: answer, type: "token" },
    { type: "done" },
  ]
    .map((event) => JSON.stringify(event))
    .join("\n")}\n`;
}

async function createAccount(page: import("@playwright/test").Page) {
  const email = `phase4-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Principles" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" }).first()).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.getByRole("button", { name: "Create account" }).first().click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const signupResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/signup") &&
      response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Create account" }).last().click();
  expect((await signupResponse).status()).toBe(201);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Evolve from reality." })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText("Personal")).toBeVisible();
  return email;
}

async function answerGoalQuestion(
  page: import("@playwright/test").Page,
  value: string
) {
  await page.getByLabel("Goal discovery answer").fill(value);
  await page.getByRole("button", { name: "Continue" }).click();
}

test("unauthenticated private APIs are blocked and Learning waits for real history", async ({
  page,
  request,
}) => {
  const unauthenticatedAsk = await request.post("/api/ask", {
    data: { question: "What is private?" },
  });
  expect(unauthenticatedAsk.status()).toBe(401);
  const unauthenticatedPeople = await request.get("/api/people/state");
  expect(unauthenticatedPeople.status()).toBe(401);
  const unauthenticatedExecution = await request.get("/api/people/execution/state");
  expect(unauthenticatedExecution.status()).toBe(401);
  const unauthenticatedEvolution = await request.get("/api/evolution/state");
  expect(unauthenticatedEvolution.status()).toBe(401);
  const unauthenticatedLearning = await request.get("/api/learning/state");
  expect(unauthenticatedLearning.status()).toBe(401);

  const email = await createAccount(page);
  const authenticatedState = await page.evaluate(async () => {
    const [meResponse, evolutionResponse] = await Promise.all([
      fetch("/api/me"),
      fetch("/api/evolution/state"),
    ]);
    return {
      evolution: {
        body: await evolutionResponse.json(),
        status: evolutionResponse.status,
      },
      me: { body: await meResponse.json(), status: meResponse.status },
    };
  });
  expect(authenticatedState.me.status).toBe(200);
  expect(authenticatedState.me.body.user.email).toBe(email);
  expect(authenticatedState.me.body.workspace.kind).toBe("personal");
  expect(authenticatedState.evolution.status).toBe(200);
  expect(authenticatedState.evolution.body.stage).toBe("dream");
  expect(authenticatedState.evolution.body.fiveSteps.current).toBe("goal");
  expect(authenticatedState.evolution.body.nextAction.kind).toBe("clarify_dream");
  expect(JSON.stringify(authenticatedState.evolution.body)).not.toContain("workspaceId");

  await page.goto("/learning");
  await expect(
    page.getByRole("heading", { name: "What is your history teaching you?" })
  ).toBeVisible();
  await expect(page.getByText("Not enough history yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Find a pattern" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "People" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Knowledge" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Learning" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  const signInMode = page.getByRole("button", { name: "Sign in" }).first();
  await expect(signInMode).toBeVisible();
  await signInMode.click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).last().click();
  await expect(page.getByRole("heading", { name: "Evolve from reality." })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
});

test("one person evolves from Goal through Outcome into a corrected Pattern and revised testing Principle", async ({
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

  await answerGoalQuestion(
    page,
    "Build a company that operates without depending on me day to day."
  );
  await expect(page.getByText("Why does this matter", { exact: false })).toBeVisible();
  await answerGoalQuestion(
    page,
    "I want the company to compound without making me its bottleneck."
  );
  await expect(page.getByText("What would make you say", { exact: false })).toBeVisible();
  await answerGoalQuestion(
    page,
    "The team makes routine operating decisions without waiting for me."
  );
  await expect(page.getByText("What are you willing to give up", { exact: false })).toBeVisible();
  await answerGoalQuestion(page, "I will deprioritize low-value side projects.");
  await expect(page.getByText("What boundary must remain true", { exact: false })).toBeVisible();
  await answerGoalQuestion(page, "Protect health and family time.");

  await expect(page.getByRole("button", { name: "Choose this goal" })).toBeVisible();
  await page.getByRole("button", { name: "Choose this goal" }).click();
  await expect(page.getByLabel("Reality observation")).toBeVisible();

  await page
    .getByLabel("Reality observation")
    .fill("Three routine operating decisions waited for me this week.");
  await page.getByRole("button", { name: "Record observation" }).click();
  await expect(page.getByText("Three routine operating decisions waited for me this week.")).toBeVisible();

  await page.getByRole("button", { name: "Recognize the gap" }).click();
  await expect(page.getByLabel("Problem")).toHaveValue(
    "The founder remains a routine operating bottleneck."
  );
  await page.getByRole("button", { name: "This is the problem" }).click();
  await expect(page.getByText("The founder remains a routine operating bottleneck.")).toBeVisible();

  await page.getByLabel("Reflection answer").fill("Decisions waited until I answered.");
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByLabel("Reflection answer")
    .fill("The team would make routine operating decisions without me.");
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByLabel("Reflection answer")
    .fill("The same dependency appeared even after responsibilities were discussed.");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Yes" }).click();
  await page
    .getByLabel("Reflection answer")
    .fill("This happened in three separate operating decisions.");
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByLabel("Reflection answer")
    .fill("If routine decisions still wait for me, ownership is not explicit enough.");
  await page.getByRole("button", { name: "Complete reflection" }).click();
  await expect(
    page.getByText("If routine decisions still wait for me, ownership is not explicit enough.")
  ).toBeVisible();

  await page.getByRole("button", { name: "Propose a principle" }).click();
  await expect(
    page.getByText("Make the decision owner and default authority explicit before the next routine case.")
  ).toBeVisible();
  await expect(page.getByText("AI confidence 72%")).toBeVisible();
  await page.getByRole("button", { name: "Test this principle" }).click();
  await expect(page.getByText("Testing", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Evolve from reality." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Diagnose root cause" })).toBeVisible();

  await page.getByRole("button", { name: "Diagnose root cause" }).click();
  await expect(
    page.getByText(
      "Routine decisions have no explicit default owner with authority to act without founder approval."
    )
  ).toBeVisible();
  await page.getByRole("button", { name: "Use this diagnosis" }).click();

  await expect(page.getByRole("button", { name: "Design the machine" })).toBeVisible();
  await page.getByRole("button", { name: "Design the machine" }).click();
  await expect(
    page.getByText(
      "Assign one explicit decision owner and a default authority boundary for routine operating decisions."
    )
  ).toBeVisible();
  await page.getByRole("button", { name: "Use this design" }).click();

  await expect(page.getByLabel("Complete action 1")).toBeVisible();
  await page.getByLabel("Complete action 1").click();
  await expect(page.getByLabel("Complete action 2")).toBeVisible();
  await page.getByLabel("Complete action 2").click();
  await expect(page.getByLabel("Complete action 3")).toBeVisible();
  await page.getByLabel("Complete action 3").click();

  await expect(page.getByLabel("Outcome result")).toBeVisible();
  await page.getByLabel("Outcome result").fill(actualOutcome);
  await page.getByRole("button", { name: "Improved" }).click();
  await page.getByRole("button", { name: "Record outcome" }).click();
  const execution = page.getByLabel("Design and execution");
  await expect(execution.locator("strong").filter({ hasText: actualOutcome })).toBeVisible();

  await expect(page.getByText("What surprised you about the result?")).toBeVisible();
  await page
    .getByLabel("Outcome review answer")
    .fill("A small authority rule removed more waiting than another discussion did.");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("What did this result teach you?")).toBeVisible();
  await page.getByLabel("Outcome review answer").fill(outcomeLearning);
  await page.getByRole("button", { name: "Complete review" }).click();
  await expect(execution.locator("strong").filter({ hasText: outcomeLearning })).toBeVisible();
  await expect(execution.getByText("Loop complete")).toBeVisible();

  await page.reload();
  const reloadedExecution = page.getByLabel("Design and execution");
  await expect(reloadedExecution.locator("strong").filter({ hasText: actualOutcome })).toBeVisible();
  await expect(reloadedExecution.locator("strong").filter({ hasText: outcomeLearning })).toBeVisible();
  await expect(reloadedExecution.getByText("Loop complete")).toBeVisible();

  await page.goto("/learning");
  await expect(
    page.getByRole("heading", { name: "What is your history teaching you?" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Find a pattern" })).toBeVisible();
  await page.getByRole("button", { name: "Find a pattern" }).click();
  await expect(
    page.getByText(
      "Explicit default authority changed behavior where discussing responsibilities alone had not."
    )
  ).toBeVisible();
  await page.getByText("Inspect the evidence").click();
  await expect(page.getByText("Case 1 · Reflection")).toBeVisible();
  await expect(page.getByText("Case 2 · Outcome review")).toBeVisible();
  await expect(
    page.getByText(
      "This is one before/after cycle, so the causal interpretation should remain a hypothesis and be tested again."
    )
  ).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Pattern statement").fill(correctedPattern);
  await page.getByRole("button", { name: "Save corrected pattern" }).click();
  await expect(page.getByText(correctedPattern)).toBeVisible();
  await expect(page.getByRole("button", { name: "Revise this principle" })).toBeVisible();

  await page.getByRole("button", { name: "Revise this principle" }).click();
  await expect(page.getByLabel("Revised principle rule")).toHaveValue(
    "Name the decision owner and their default authority before the next routine case, then verify the next real outcome."
  );
  await page.getByLabel("Revised principle rule").fill(revisedRule);
  await page.getByRole("button", { name: "Revise and test" }).click();
  await expect(page.getByText("Principle revised · testing")).toBeVisible();
  await expect(page.getByText(revisedRule)).toBeVisible();

  const peopleState = await page.evaluate(async () => {
    const response = await fetch("/api/people/state");
    return response.json();
  });
  const revisedPrinciple = peopleState.principles.find(
    (item: { rule: string }) => item.rule === revisedRule
  );
  expect(revisedPrinciple?.acceptanceState).toBe("revised");
  expect(revisedPrinciple?.lifecycleState).toBe("testing");
  expect(revisedPrinciple?.lifecycleState).not.toBe("trusted");

  await page.reload();
  await expect(page.getByText(correctedPattern)).toBeVisible();
  await expect(page.getByText("Principle revised · testing")).toBeVisible();
  await expect(page.getByText(revisedRule)).toBeVisible();

  await page.getByRole("button", { name: "Find a pattern" }).click();
  await expect(page.getByRole("button", { name: "Reject" })).toBeVisible();
  await page.getByRole("button", { name: "Reject" }).click();
  await expect(page.getByRole("button", { name: "Reject" })).toHaveCount(0);
  await expect(page.getByText(correctedPattern)).toBeVisible();
});

test("Knowledge remains authenticated and renders only the safe source projection", async ({ page }) => {
  await createAccount(page);
  await page.goto("/knowledge");
  await expect(page.getByRole("heading", { name: "Ask anything." })).toBeVisible();

  await page.route("**/api/ask", async (route) => {
    await route.fulfill({
      body: ndjson(
        "Private knowledge [R1] and current evidence [W1] support this answer."
      ),
      contentType: "application/x-ndjson; charset=utf-8",
      status: 200,
    });
  });

  await page.getByLabel("Question").fill("What is true right now?");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByRole("heading", { name: "Answer" })).toBeVisible();
  await expect(
    page.getByText("Private knowledge").locator("..").getByText("Connected")
  ).toBeVisible();
  await expect(
    page.getByText("Live search").locator("..").getByText("Connected")
  ).toBeVisible();
  await expect(
    page.getByText(
      "Private knowledge [R1] and current evidence [W1] support this answer."
    )
  ).toBeVisible();
  await expect(page.getByText("Knowledge source")).toBeVisible();
  await expect(page.getByText("Live source")).toBeVisible();
  await page.getByText("Knowledge source").click();
  await expect(page.getByText(ragSource.snippet)).toBeVisible();
  await expect(page.getByText("private-dataset-id")).toHaveCount(0);
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