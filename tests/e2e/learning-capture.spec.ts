import { expect, test } from "@playwright/test";

const password = "a strong learning capture password";

async function createAccount(page: import("@playwright/test").Page) {
  const email = `learning-capture-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.goto("/");
  await page.getByRole("button", { name: "Create account" }).first().click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const signup = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/signup") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create account" }).last().click();
  expect((await signup).status()).toBe(201);
  await expect(
    page.getByRole("heading", { name: "What deserves attention now?" }),
  ).toBeVisible();
}

async function seedReflectionContext(
  page: import("@playwright/test").Page,
): Promise<void> {
  const result = await page.evaluate(async () => {
    async function post<T>(url: string, body: unknown): Promise<T> {
      const response = await fetch(url, {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`${url} returned ${response.status}`);
      }
      return response.json() as Promise<T>;
    }

    const goal = await post<{ goal: { id: string } }>("/api/people/goals", {
      acceptedTradeoffs: "Less low-value work",
      desiredState: "A learning system grounded in real operating evidence",
      measures: "Weekly reviewed cases",
      nonNegotiables: "Do not invent evidence",
      successConditions: "Reflections produce testable rules",
      whyItMatters: "Learning should change future decisions",
    });
    const reality = await post<{ reality: { observationId: string } }>(
      "/api/people/reality",
      {
        goalId: goal.goal.id,
        statement: "Learning notes are currently fragmented across surfaces.",
      },
    );
    const problem = await post<{ problem: { id: string } }>(
      "/api/people/problems",
      {
        gap: "The evidence exists but the learning loop is hard to capture.",
        goalId: goal.goal.id,
        observationId: reality.reality.observationId,
        statement:
          "Learning capture is not available where the user sees the chapter.",
      },
    );
    await post("/api/people/reflections", {
      expected: "The learning surface would make the next action obvious.",
      goalId: goal.goal.id,
      happened:
        "The previous Learning layout separated evidence from the actions that created it.",
      learning:
        "Learning becomes usable when evidence and capture stay in the same narrative scene.",
      problemId: problem.problem.id,
      recurrenceNote: "",
      recurring: false,
      surprise: "The data model was stronger than the visible interaction model.",
    });
    return true;
  });
  expect(result).toBe(true);
}

test("Learning keeps the working loop in one scene and lets every chapter capture content", async ({
  page,
}) => {
  await page.setViewportSize({ height: 768, width: 1024 });
  await createAccount(page);
  await seedReflectionContext(page);
  await page.goto("/learning");

  const scene = page.getByLabel("Learning working scene");
  await expect(scene).toBeVisible();
  const sceneBox = await scene.boundingBox();
  expect(sceneBox?.y ?? 9999).toBeLessThan(620);

  await expect(
    page.getByRole("heading", { name: "Pain worth learning from" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recurring reality" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Rules I am testing" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "+ Reflection" }).click();
  await page
    .getByLabel("Reflection happened")
    .fill("The old Learning page showed empty sections without a direct capture path.");
  await page
    .getByLabel("Reflection learning")
    .fill("Capture must live beside the narrative chapter it belongs to.");
  await page.getByRole("button", { name: "Save reflection" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Capture must live beside the narrative chapter it belongs to.",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "+ Pattern" }).click();
  await page.getByRole("button", { name: "Synthesize pattern" }).click();
  await expect(page.getByLabel("Pattern statement")).toBeVisible();
  await page
    .getByLabel("Pattern statement")
    .fill("Hidden capture tools make empty narrative sections feel read-only.");
  await page
    .getByLabel("Pattern implication")
    .fill("Put capture actions in the chapter itself.");
  await page
    .getByLabel("Pattern evidence for")
    .fill("The Learning screenshot showed no chapter-level input action.");
  await page
    .getByLabel("Pattern evidence against")
    .fill("A hero-level action existed but was easy to lose after scrolling.");
  await page
    .getByLabel("Pattern uncertainty")
    .fill("More usage is needed to test whether the chapter action is enough.");
  await page.getByRole("button", { name: "Keep pattern" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Hidden capture tools make empty narrative sections feel read-only.",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "+ Add principle" }).click();
  await page
    .getByLabel("Principle trigger")
    .fill("When a narrative chapter asks the user to think");
  await page
    .getByLabel("Principle rule")
    .fill("Put the capture action in that same chapter.");
  await page
    .getByLabel("Principle rationale")
    .fill("The interface should not separate meaning from action.");
  await page.getByRole("button", { name: "Save principle" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Put the capture action in that same chapter.",
    }),
  ).toBeVisible();
});
