import { expect, test } from "@playwright/test";

const ragSource = {
  key: "R1",
  provider: "ragflow",
  publishedAt: null,
  retrievedAt: "2026-08-23T10:00:00.000Z",
  snippet: "A safe, bounded excerpt from private knowledge.",
  sourceType: "ragflow",
  title: "Knowledge source",
  url: null,
};

const liveSource = {
  key: "W1",
  provider: "brave",
  publishedAt: "2026-08-23T09:30:00.000Z",
  retrievedAt: "2026-08-23T10:00:00.000Z",
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
  const email = `phase1-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Principles" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a strong browser test password");
  await page.getByRole("button", { name: "Create account" }).last().click();
  await expect(page.getByRole("heading", { name: "Ask anything." })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText("Personal")).toBeVisible();
  return email;
}

test("unauthenticated AI is blocked and a Personal Workspace survives sign-in", async ({
  page,
  request,
}) => {
  const unauthenticated = await request.post("/api/ask", {
    data: { question: "What is private?" },
  });
  expect(unauthenticated.status()).toBe(401);

  const email = await createAccount(page);
  const me = await page.evaluate(async () => {
    const response = await fetch("/api/me");
    return { body: await response.json(), status: response.status };
  });
  expect(me.status).toBe(200);
  expect(me.body.user.email).toBe(email);
  expect(me.body.workspace.kind).toBe("personal");

  await page.getByRole("button", { name: "Sign out" }).click();
  const signInMode = page.getByRole("button", { name: "Sign in" });
  await expect(signInMode).toBeVisible();
  await signInMode.click();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a strong browser test password");
  await page.getByRole("button", { name: "Sign in" }).last().click();
  await expect(page.getByRole("heading", { name: "Ask anything." })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
});

test("authenticated Q&A renders only the safe source projection", async ({ page }) => {
  await createAccount(page);
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
    page.getByText(
      "Private knowledge [R1] and current evidence [W1] support this answer."
    )
  ).toBeVisible();
  await expect(page.getByText("Knowledge source")).toBeVisible();
  await expect(page.getByText("Live source")).toBeVisible();
  await expect(page.getByText("Complete")).toBeVisible();

  await page.getByText("Knowledge source").click();
  await expect(page.getByText(ragSource.snippet)).toBeVisible();
  await expect(page.getByText("private-dataset-id")).toHaveCount(0);
});

test("long answers use normal document scrolling", async ({ page }) => {
  await createAccount(page);
  const longAnswer = Array.from(
    { length: 80 },
    (_, index) =>
      `Paragraph ${index + 1}: a deliberately long answer for scrolling verification.`
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

  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight)
  );
  await expect(page.getByText("Live source")).toBeInViewport();
});
