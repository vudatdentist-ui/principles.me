import { expect, test } from "@playwright/test";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for release smoke.`);
  }
  return value;
}

async function readNdjson(response: import("@playwright/test").APIResponse) {
  const text = await response.text();
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

test("release smoke: auth → Decision → Council → sources → cleanup", async ({
  page,
}) => {
  const email = required("SMOKE_USER_EMAIL");
  const password = required("SMOKE_USER_PASSWORD");
  const question = required("SMOKE_COUNCIL_QUESTION");
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.name));

  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/decisions$/);

  const sessionResponse = await page.context().request.get("/api/auth/session");
  expect(sessionResponse.status()).toBe(200);

  let decisionId = "";
  try {
    const createResponse = await page.context().request.post("/api/decisions", {
      data: { input: question },
    });
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as {
      decision: { id: string };
    };
    decisionId = created.decision.id;

    const councilResponse = await page.context().request.post("/api/council", {
      data: { decisionId, question },
      timeout: 60_000,
    });
    expect(councilResponse.status()).toBe(200);
    const events = await readNdjson(councilResponse);
    const referencesEvent = events.find((event) => event.type === "references");
    const answerEvent = events.find((event) => event.type === "answer");
    const references = Array.isArray(referencesEvent?.references)
      ? (referencesEvent.references as Array<{ key?: string; text?: string }>)
      : [];
    const citations = Array.isArray(answerEvent?.citations)
      ? (answerEvent.citations as string[])
      : [];

    expect(answerEvent?.grounded).toBe(true);
    expect(references.length).toBeGreaterThan(0);
    expect(citations.length).toBeGreaterThan(0);
    const referenceKeys = new Set(references.map((reference) => reference.key));
    expect(citations.every((citation) => referenceKeys.has(citation))).toBe(true);
    expect(references.every((reference) => Boolean(reference.text))).toBe(true);
  } finally {
    if (decisionId) {
      const cleanup = await page.context().request.delete(
        `/api/decisions/${decisionId}`
      );
      expect(cleanup.status()).toBe(204);
    }
  }

  expect(pageErrors).toEqual([]);
});
