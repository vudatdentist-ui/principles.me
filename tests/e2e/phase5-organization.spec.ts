import { expect, test } from "@playwright/test";

const password = "a strong phase five browser password";

async function createAccount(
  page: import("@playwright/test").Page,
  email: string
) {
  await page.goto("/");
  await page.getByRole("button", { name: "Create account" }).first().click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const response = page.waitForResponse(
    (item) => item.url().endsWith("/api/auth/signup") && item.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Create account" }).last().click();
  expect((await response).status()).toBe(201);
  await page.reload();
  await expect(page.getByRole("heading", { name: "What deserves attention now?" })).toBeVisible();
}

async function signOut(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("button", { name: "Sign in" }).first()).toBeVisible();
}

async function signIn(
  page: import("@playwright/test").Page,
  email: string
) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).first().click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).last().click();
  await expect(page.getByRole("heading", { name: "What deserves attention now?" })).toBeVisible();
}

async function openOperations(page: import("@playwright/test").Page) {
  const summary = page.getByText("Operations", { exact: true });
  const details = summary.locator("..");
  if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await summary.click();
  }
  return details;
}

test("Organization reuses the evolution language while preserving governed collaboration", async ({
  page,
}) => {
  const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ownerEmail = `phase6-owner-${nonce}@example.com`;
  const memberEmail = `phase6-member-${nonce}@example.com`;
  const organizationName = `Clear Machine ${nonce}`;
  const purpose = "Make routine decisions explicit, distributed, and observable.";
  const issueTitle = `Approval bottleneck ${nonce}`;

  await createAccount(page, ownerEmail);
  await signOut(page);
  await createAccount(page, memberEmail);
  await signOut(page);
  await signIn(page, ownerEmail);

  await page.goto("/organization");
  await expect(
    page.getByRole("heading", { name: "Design the machine around reality." })
  ).toBeVisible();
  await expect(page.getByText("Dream").first()).toBeVisible();
  await expect(page.getByText("Design").first()).toBeVisible();
  for (const tab of ["Me", "Organization", "Knowledge", "Learning"]) {
    await expect(page.getByRole("link", { name: tab, exact: true }).first()).toBeVisible();
  }

  const operations = await openOperations(page);
  const createOrganization = operations.locator("details").filter({
    has: page.getByText("Create organization", { exact: true }),
  });
  await createOrganization.locator('input[name="name"]').fill(organizationName);
  await createOrganization.locator('textarea[name="purpose"]').fill(purpose);
  await createOrganization.getByRole("button", { name: "Create" }).click();
  await expect(operations.getByRole("heading", { name: organizationName })).toBeVisible();

  await operations.getByText("Add existing account", { exact: true }).click();
  const addMember = operations.locator("details").filter({
    has: page.getByText("Add existing account", { exact: true }),
  });
  await addMember.locator('input[name="email"]').fill(memberEmail);
  await addMember.getByRole("button", { name: "Add member" }).click();
  await expect(operations.getByRole("list").getByText(memberEmail, { exact: true })).toBeVisible();

  await operations.getByText("New role", { exact: true }).click();
  const roleForm = operations.locator("details").filter({
    has: page.getByText("New role", { exact: true }),
  });
  await roleForm.locator('input[name="name"]').fill("Engineering Lead");
  await roleForm.locator('textarea[name="purpose"]').fill("Own engineering system quality.");
  await roleForm.locator('textarea[name="decisionScope"]').fill("Routine engineering sequencing.");
  await roleForm.getByRole("button", { name: "Create role" }).click();
  await expect(operations.getByText("Engineering Lead", { exact: true })).toBeVisible();

  await operations.getByText("Record issue", { exact: true }).click();
  const issueForm = operations.locator("details").filter({
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
  await expect(operations.getByRole("heading", { name: issueTitle })).toBeVisible();

  await page.reload();
  await expect(page.getByText(purpose).first()).toBeVisible();
  await expect(
    page.getByText("Three routine sequencing decisions waited for owner approval.").first()
  ).toBeVisible();
  await expect(page.getByText("Where is the machine failing?")).toBeVisible();
  await expect(page.getByText("Engineering Lead", { exact: true }).first()).toBeVisible();

  await signOut(page);
  await signIn(page, memberEmail);
  await page.goto("/organization");
  const memberOperations = await openOperations(page);
  await expect(memberOperations.getByRole("heading", { name: organizationName })).toBeVisible();
  await expect(memberOperations.getByText("Member", { exact: true }).first()).toBeVisible();
  await expect(memberOperations.getByText("Add existing account", { exact: true })).toHaveCount(0);
  await expect(memberOperations.getByText("New role", { exact: true })).toHaveCount(0);

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

  const issueCard = memberOperations.locator("article").filter({
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
    memberOperations.getByText("The issue overstates the approval bottleneck.", { exact: true })
  ).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Competing models" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "The issue overstates the approval bottleneck." }).first()
  ).toBeVisible();

  const projected = await page.evaluate(async () => {
    const response = await fetch("/api/organization/state");
    return JSON.stringify(await response.json());
  });
  expect(projected).not.toContain("workspaceId");
  expect(projected).not.toContain("userId");
  expect(projected).not.toContain('"score"');
  expect(projected).not.toContain('"ranking"');
});
