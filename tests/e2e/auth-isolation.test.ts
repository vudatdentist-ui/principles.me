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
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  const loginResponsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/auth/login" &&
      response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Sign in" }).click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.status()).toBe(200);

  const sessionResponse = await context.request.get("/api/auth/session");
  const sessionBody = await sessionResponse.text();
  expect(sessionResponse.status(), sessionBody).toBe(200);

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

  test("User A cannot leak Decisions or Principles to User B", async ({
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

    const crossDelete = await contextB.request.delete(
      `/api/decisions/${decisionId}`
    );
    expect(crossDelete.status()).toBe(404);

    const cleanup = await contextA.request.delete(
      `/api/decisions/${decisionId}`
    );
    expect(cleanup.status()).toBe(204);

    await pageA.close();
    await contextA.close();
    await contextB.close();
  });
});
