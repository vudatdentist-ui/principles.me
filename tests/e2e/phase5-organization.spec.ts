import { expect, test } from "@playwright/test";

const password = "a strong phase five browser password";

async function createAccount(
  page: import("@playwright/test").Page,
  email: string
) {
  await page.goto("/");
  await expect(page.getByLabel("Setup key")).toHaveCount(0);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).last().click();
  await expect(page.getByRole("heading", { name: "Evolve from reality." })).toBeVisible();
}

async function signOut(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
}

async function signIn(
  page: import("@playwright/test").Page,
  email: string
) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).last().click();
  await expect(page.getByRole("heading", { name: "Evolve from reality." })).toBeVisible();
}

test("Phase 5 removes Setup key and supports governed organization collaboration", async ({
  page,
}) => {
  const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ownerEmail = `phase5-owner-${nonce}@example.com`;
  const memberEmail = `phase5-member-${nonce}@example.com`;
  const organizationName = `Clear Machine ${nonce}`;
  const issueTitle = `Approval bottleneck ${nonce}`;

  await createAccount(page, ownerEmail);
  await signOut(page);
  await createAccount(page, memberEmail);
  await signOut(page);
  await signIn(page, ownerEmail);

  await page.goto("/organization");
  await expect(
    page.getByRole("heading", { name: "Design the machine together." })
  ).toBeVisible();
  await expect(page.getByLabel("Setup key")).toHaveCount(0);

  const createOrganization = page.locator("details").filter({
    has: page.getByText("Create organization", { exact: true }),
  });
  await createOrganization.locator('input[name="name"]').fill(organizationName);
  await createOrganization
    .locator('textarea[name="purpose"]')
    .fill("Make roles explicit and disagreement useful.");
  await createOrganization.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: organizationName })).toBeVisible();
  await expect(page.getByText("Owner", { exact: true }).first()).toBeVisible();

  await page.getByText("Add existing account", { exact: true }).click();
  const addMember = page.locator("details").filter({
    has: page.getByText("Add existing account", { exact: true }),
  });
  await addMember.locator('input[name="email"]').fill(memberEmail);
  await addMember.getByRole("button", { name: "Add member" }).click();
  await expect(page.getByText(memberEmail, { exact: true })).toBeVisible();

  await page.getByText("New role", { exact: true }).click();
  const roleForm = page.locator("details").filter({
    has: page.getByText("New role", { exact: true }),
  });
  await roleForm.locator('input[name="name"]').fill("Engineering Lead");
  await roleForm
    .locator('textarea[name="purpose"]')
    .fill("Own engineering system quality.");
  await roleForm
    .locator('textarea[name="decisionScope"]')
    .fill("Routine engineering sequencing.");
  await roleForm.getByRole("button", { name: "Create role" }).click();
  await expect(page.getByText("Engineering Lead", { exact: true })).toBeVisible();

  await page.getByText("New team", { exact: true }).click();
  const teamForm = page.locator("details").filter({
    has: page.getByText("New team", { exact: true }),
  });
  await teamForm.locator('input[name="name"]').fill("Product Engineering");
  await teamForm
    .locator('textarea[name="purpose"]')
    .fill("Turn diagnosed problems into machine changes.");
  await teamForm.getByRole("button", { name: "Create team" }).click();
  await expect(page.getByText("Product Engineering", { exact: true })).toBeVisible();

  await signOut(page);
  await signIn(page, memberEmail);
  await page.goto("/organization");
  await expect(page.getByRole("heading", { name: organizationName })).toBeVisible();
  await expect(page.getByText("Member", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Add existing account", { exact: true })).toHaveCount(0);
  await expect(page.getByText("New role", { exact: true })).toHaveCount(0);
  await expect(page.getByText("New team", { exact: true })).toHaveCount(0);

  const stateBeforeIssue = await page.evaluate(async () => {
    const response = await fetch("/api/organization/state");
    return response.json();
  });
  const handle = stateBeforeIssue.organizations[0].handle as string;
  const forbidden = await page.evaluate(async ({ organizationHandle }) => {
    const response = await fetch("/api/organization/roles", {
      body: JSON.stringify({ name: "Forbidden", organizationHandle }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    return response.status;
  }, { organizationHandle: handle });
  expect(forbidden).toBe(403);

  await page.getByText("Record issue", { exact: true }).click();
  const issueForm = page.locator("details").filter({
    has: page.getByText("Record issue", { exact: true }),
  });
  await issueForm.locator('input[name="title"]').fill(issueTitle);
  await issueForm
    .locator('textarea[name="observedReality"]')
    .fill("Three routine sequencing decisions waited for owner approval.");
  await issueForm
    .locator('textarea[name="tension"]')
    .fill("Delegated responsibility does not match actual decision flow.");
  await issueForm.getByRole("button", { name: "Record" }).click();
  await expect(page.getByRole("heading", { name: issueTitle })).toBeVisible();

  const issueCard = page.locator("article").filter({
    has: page.getByRole("heading", { name: issueTitle }),
  });
  await issueCard.getByText("Disagree", { exact: true }).click();
  await issueCard
    .locator('textarea[name="statement"]')
    .fill("The issue overstates the approval bottleneck.");
  await issueCard
    .locator('textarea[name="reasoning"]')
    .fill("One delay came from unclear acceptance criteria instead.");
  await issueCard.getByRole("button", { name: "Raise disagreement" }).click();
  await expect(
    page.getByText("The issue overstates the approval bottleneck.", { exact: true })
  ).toBeVisible();

  await page.getByText("Add context evidence", { exact: true }).click();
  const contextForm = page.locator("details").filter({
    has: page.getByText("Add context evidence", { exact: true }),
  });
  await contextForm.locator('select[name="email"]').selectOption(memberEmail);
  await contextForm.locator('input[name="context"]').fill("engineering sequencing");
  await contextForm
    .locator('textarea[name="observation"]')
    .fill("Reliability is improving in this specific decision context.");
  await contextForm
    .locator('textarea[name="evidenceFor"]')
    .fill("Two sequencing decisions were made independently with sound trade-offs.");
  await contextForm
    .locator('textarea[name="evidenceAgainst"]')
    .fill("One routine decision still escalated.");
  await contextForm.getByRole("button", { name: "Record evidence" }).click();
  await expect(page.getByText("engineering sequencing", { exact: true })).toBeVisible();

  const projected = await page.evaluate(async () => {
    const response = await fetch("/api/organization/state");
    return JSON.stringify(await response.json());
  });
  expect(projected).not.toContain("workspaceId");
  expect(projected).not.toContain("userId");
  expect(projected).not.toContain('"score"');
  expect(projected).not.toContain('"ranking"');

  await signOut(page);
  await signIn(page, ownerEmail);
  await page.goto("/organization");
  const ownerIssueCard = page.locator("article").filter({
    has: page.getByRole("heading", { name: issueTitle }),
  });
  const disagreementResolution = ownerIssueCard.locator('input[name="resolution"]').first();
  await disagreementResolution.fill("Separate acceptance-criteria evidence from approval waits.");
  await ownerIssueCard.getByRole("button", { name: "Resolve" }).first().click();
  await expect(
    ownerIssueCard.getByText("Separate acceptance-criteria evidence from approval waits.", {
      exact: false,
    })
  ).toBeVisible();

  const issueResolution = ownerIssueCard.locator('input[name="resolution"]').last();
  await issueResolution.fill("Keep routine sequencing delegated and clarify acceptance criteria.");
  await ownerIssueCard.getByRole("button", { name: "Resolve" }).last().click();
  await expect(ownerIssueCard.getByText("resolved", { exact: true })).toBeVisible();
});
