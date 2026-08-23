import { expect, test } from "@playwright/test";

const ragSource = {
  chunkId: "chunk-1",
  datasetId: "dataset-1",
  documentId: "document-1",
  key: "R1",
  observedAt: null,
  positions: [],
  provider: "ragflow",
  publishedAt: null,
  retrievedAt: "2026-08-23T10:00:00.000Z",
  score: 0.91,
  sourceType: "ragflow",
  text: "A source excerpt from the configured knowledge base.",
  title: "Knowledge source",
  url: null,
};

const liveSource = {
  chunkId: null,
  datasetId: null,
  documentId: null,
  key: "W1",
  observedAt: null,
  positions: [],
  provider: "brave",
  publishedAt: "2026-08-23T09:30:00.000Z",
  retrievedAt: "2026-08-23T10:00:00.000Z",
  score: null,
  sourceType: "live_web",
  text: "A current public source excerpt.",
  title: "Live source",
  url: "https://example.com/live",
};

function ndjson(answer: string): string {
  return `${[
    {
      message: "Searching knowledge and current sources…",
      stage: "retrieving",
      type: "status",
    },
    { live: "ok", references: [ragSource, liveSource], type: "sources" },
    {
      message: "Preparing the answer…",
      stage: "answering",
      type: "status",
    },
    { token: answer, type: "token" },
    { type: "done" },
  ]
    .map((event) => JSON.stringify(event))
    .join("\n")}\n`;
}

test("hybrid knowledge Q&A is the clean root baseline", async ({ page }) => {
  await page.route("**/api/ask", async (route) => {
    await route.fulfill({
      body: ndjson("Private knowledge [R1] and current evidence [W1] support this answer."),
      contentType: "application/x-ndjson; charset=utf-8",
      status: 200,
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Ask anything." })).toBeVisible();
  await expect(page.getByText("Knowledge · Live · AI")).toBeVisible();

  await page.getByLabel("Question").fill("What is true right now?");
  await page.getByRole("button", { name: "Ask" }).click();

  await expect(page.getByRole("heading", { name: "Answer" })).toBeVisible();
  await expect(
    page.getByText("Private knowledge [R1] and current evidence [W1] support this answer.")
  ).toBeVisible();
  await expect(page.getByText("Knowledge source")).toBeVisible();
  await expect(page.getByText("Live source")).toBeVisible();
  await expect(page.getByText("Answer complete.")).toBeVisible();
});

test("long answers use normal document scrolling", async ({ page }) => {
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

  await page.goto("/");
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
