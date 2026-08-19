import { expect, test } from "@playwright/test";
import { genSaltSync, hashSync } from "bcrypt-ts";
import postgres from "postgres";

const EMAIL_A = "release-a@principles.test";
const EMAIL_B = "release-b@principles.test";
const PASSWORD_A = "release-password-a-2026";
const PASSWORD_B = "release-password-b-2026";

const sql = postgres(process.env.POSTGRES_URL ?? "", { max: 1 });

async function seedUser(email: string, password: string) {
  await sql`delete from "User" where "email" = ${email}`;
  const passwordHash = hashSync(password, genSaltSync(10));
  await sql`
    insert into "User" ("email", "emailVerified", "isAnonymous", "name", "password")
    values (${email}, true, false, ${`Release ${email}`}, ${passwordHash})
  `;
}

async function login(
  context: import("@playwright/test").BrowserContext,
  email: string,
  password: string
) {
  const loginResponse = await context.request.post("/api/auth/login", {
    data: { email, password },
  });
  const loginBody = await loginResponse.text();
  expect(loginResponse.status(), loginBody).toBe(200);

  const sessionResponse = await context.request.get("/api/auth/session");
  const sessionBody = await sessionResponse.text();
  expect(sessionResponse.status(), sessionBody).toBe(200);

  const page = await context.newPage();
  await page.goto("/decisions");
  await expect(page).toHaveURL(/\/decisions$/);
  return page;
}

test.describe("Milestone 8 internal auth isolation", () => {
  test.beforeAll(async () => {
    await seedUser(EMAIL_A, PASSWORD_A);
    await seedUser(EMAIL_B, PASSWORD_B);
  });

  test.afterAll(async () => {
    await sql`delete from "User" where "email" in (${EMAIL_A}, ${EMAIL_B})`;
    await sql.end({ timeout: 5 });
  });

  test("User A cannot leak Decisions, Principles, or Journal to User B", async ({
    browser,
  }) => {
    const contextA = await browser.newContext();
    const pageA = await login(contextA, EMAIL_A, PASSWORD_A);

    const createDecisionResponse = await contextA.request.post(
      "/api/decisions",
      {
        data: {
          input:
            "Should I run a reversible pricing experiment before a permanent rollout?",
        },
      }
    );
    expect(createDecisionResponse.status()).toBe(201);
    const created = (await createDecisionResponse.json()) as {
      decision: { id: string };
    };
    const decisionId = created.decision.id;
    const principleStatement =
      "Use reversible tests before irreversible pricing changes.";

    const createPrincipleResponse = await contextA.request.post(
      `/api/decisions/${decisionId}/principles`,
      { data: { statement: principleStatement } }
    );
    expect(createPrincipleResponse.status()).toBe(201);

    const ownPrinciples = await contextA.request.get("/api/principles");
    expect(ownPrinciples.status()).toBe(200);
    expect(JSON.stringify(await ownPrinciples.json())).toContain(
      principleStatement
    );

    const privateJournalText = `Private journal ${crypto.randomUUID()}`;
    const createJournal = await contextA.request.post("/api/journal", {
      data: { body: privateJournalText },
    });
    expect(createJournal.status()).toBe(201);
    const journalPayload = (await createJournal.json()) as {
      entry: { id: string };
    };
    const journalId = journalPayload.entry.id;

    const saveReflection = await contextA.request.put(
      `/api/journal/${journalId}/reflection`,
      {
        data: {
          candidate: { statement: "Private candidate principle." },
          observation: "Private recurring pattern.",
          text: "Private reflection.",
        },
      }
    );
    expect(saveReflection.status()).toBe(200);

    const contextB = await browser.newContext();
    await login(contextB, EMAIL_B, PASSWORD_B);

    const crossDecision = await contextB.request.get(
      `/api/decisions/${decisionId}`
    );
    expect(crossDecision.status()).toBe(404);

    const crossPrincipleWrite = await contextB.request.post(
      `/api/decisions/${decisionId}/principles`,
      { data: { statement: "B must not attach to A's decision." } }
    );
    expect(crossPrincipleWrite.status()).toBe(404);

    const principlesB = await contextB.request.get("/api/principles");
    expect(principlesB.status()).toBe(200);
    expect(JSON.stringify(await principlesB.json())).not.toContain(
      principleStatement
    );

    const journalListB = await contextB.request.get("/api/journal");
    expect(journalListB.status()).toBe(200);
    expect(JSON.stringify(await journalListB.json())).not.toContain(
      privateJournalText
    );

    const crossJournalRead = await contextB.request.get(
      `/api/journal/${journalId}`
    );
    expect(crossJournalRead.status()).toBe(404);

    const crossReflectionWrite = await contextB.request.put(
      `/api/journal/${journalId}/reflection`,
      { data: { text: "B must not modify A's reflection." } }
    );
    expect(crossReflectionWrite.status()).toBe(404);

    const crossAssist = await contextB.request.post(
      `/api/journal/${journalId}/reflection/assist`
    );
    expect(crossAssist.status()).toBe(404);

    const crossJournalDelete = await contextB.request.delete(
      `/api/journal/${journalId}`
    );
    expect(crossJournalDelete.status()).toBe(404);

    const crossDelete = await contextB.request.delete(
      `/api/decisions/${decisionId}`
    );
    expect(crossDelete.status()).toBe(404);

    const journalCleanup = await contextA.request.delete(
      `/api/journal/${journalId}`
    );
    expect(journalCleanup.status()).toBe(204);

    const cleanup = await contextA.request.delete(
      `/api/decisions/${decisionId}`
    );
    expect(cleanup.status()).toBe(204);

    await pageA.close();
    await contextA.close();
    await contextB.close();
  });
});
