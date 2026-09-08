import { expect, test } from "@playwright/test";

const password = "a strong organization evolution password";

async function createAccount(page: import("@playwright/test").Page, email: string) {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).last().click();
  await expect(page.getByRole("heading", { name: "Evolve from reality." })).toBeVisible();
}

async function signOut(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
}

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).last().click();
  await expect(page.getByRole("heading", { name: "Evolve from reality." })).toBeVisible();
}

test("a real team completes the original organization evolution loop", async ({ page }) => {
  const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ownerEmail = `evolve-owner-${nonce}@example.com`;
  const memberEmail = `evolve-member-${nonce}@example.com`;
  const organizationName = `Evolution Machine ${nonce}`;
  const goalText = `Routine releases operate without owner approval ${nonce}`;
  const problemTitle = `Release sequencing still escalates ${nonce}`;

  await createAccount(page, ownerEmail);
  await signOut(page);
  await createAccount(page, memberEmail);
  await signOut(page);
  await signIn(page, ownerEmail);

  await page.goto("/organization");
  const createOrganization = page.locator("details").filter({
    has: page.getByText("Create organization", { exact: true }),
  });
  await createOrganization.locator('input[name="name"]').fill(organizationName);
  await createOrganization
    .locator('textarea[name="purpose"]')
    .fill("Run one collective learning loop from Goal to Principle.");
  await createOrganization.getByRole("button", { name: "Create" }).click();
  await page.getByText("Add existing account", { exact: true }).click();
  const addMember = page.locator("details").filter({
    has: page.getByText("Add existing account", { exact: true }),
  });
  await addMember.locator('input[name="email"]').fill(memberEmail);
  await addMember.getByRole("button", { name: "Add member" }).click();
  await expect(page.getByRole("list").getByText(memberEmail, { exact: true })).toBeVisible();

  await page.goto("/organization/evolve");
  await expect(
    page.getByRole("heading", { name: "Change the machine. Observe the result." })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: organizationName })).toBeVisible();
  const goalDetails = page.locator("details").filter({
    has: page.getByText("New shared goal", { exact: true }),
  });
  await goalDetails.locator('textarea[name="desiredState"]').fill(goalText);
  await goalDetails
    .locator('textarea[name="whyItMatters"]')
    .fill("Owner attention is the current scaling constraint.");
  await goalDetails
    .locator('textarea[name="successConditions"]')
    .fill("A routine release ships independently while quality holds.");
  await goalDetails.getByRole("button", { name: "Choose goal" }).click();
  await expect(page.getByRole("heading", { name: goalText })).toBeVisible();

  await signOut(page);
  await signIn(page, memberEmail);
  await page.goto("/organization/evolve");
  await expect(page.getByRole("heading", { name: organizationName })).toBeVisible();
  const problemDetails = page.locator("details").filter({
    has: page.getByText("Record observed problem", { exact: true }),
  });
  await problemDetails.locator('input[name="title"]').fill(problemTitle);
  await problemDetails
    .locator('textarea[name="observedReality"]')
    .fill("Two routine releases waited for owner sequencing approval.");
  await problemDetails
    .locator('textarea[name="tension"]')
    .fill("The observed decision flow contradicts the shared Goal.");
  await problemDetails.getByRole("button", { name: "Record problem" }).click();
  await expect(page.getByRole("heading", { name: problemTitle })).toBeVisible();
  await expect(page.getByText("Diagnose root cause", { exact: true })).toHaveCount(0);

  await signOut(page);
  await signIn(page, ownerEmail);
  await page.goto("/organization/evolve");
  const problemCard = page.locator("article").filter({
    has: page.getByRole("heading", { name: problemTitle }),
  });
  const diagnosisDetails = problemCard.locator("details").filter({
    has: page.getByText("Diagnose root cause", { exact: true }),
  });
  await diagnosisDetails.locator('textarea[name="symptom"]').fill("Routine releases wait.");
  await diagnosisDetails
    .locator('textarea[name="rootCauseHypothesis"]')
    .fill("Decision rights are stated but not encoded in the release machine.");
  await diagnosisDetails
    .locator('textarea[name="supportingEvidence"]')
    .fill("The same escalation repeated after delegation was announced.");
  await diagnosisDetails
    .locator('textarea[name="uncertainty"]')
    .fill("Acceptance criteria may explain part of the delay.");
  await diagnosisDetails.getByRole("button", { name: "Accept diagnosis" }).click();
  await expect(
    problemCard.getByText("Decision rights are stated but not encoded in the release machine.", {
      exact: true,
    })
  ).toBeVisible();

  const designDetails = problemCard.locator("details").filter({
    has: page.getByText("Design the machine change", { exact: true }),
  });
  await designDetails
    .locator('textarea[name="machineChange"]')
    .fill("Move routine release sequencing authority to the accountable engineering role.");
  await designDetails
    .locator('textarea[name="rationale"]')
    .fill("Make the diagnosed decision boundary operational.");
  await designDetails
    .locator('textarea[name="expectedResult"]')
    .fill("The next routine release ships without owner approval.");
  await designDetails
    .locator('textarea[name="successSignal"]')
    .fill("Release ships independently and quality checks pass.");
  await designDetails.locator('select[name="assignedToEmail"]').selectOption(memberEmail);
  await designDetails
    .locator('textarea[name="actions"]')
    .fill("Document the decision boundary\nRun the next release under that boundary");
  await designDetails.getByRole("button", { name: "Commit design" }).click();
  await expect(problemCard.getByText(`Design · ${memberEmail}`, { exact: true })).toBeVisible();

  await signOut(page);
  await signIn(page, memberEmail);
  await page.goto("/organization/evolve");
  const memberProblemCard = page.locator("article").filter({
    has: page.getByRole("heading", { name: problemTitle }),
  });
  await memberProblemCard.getByRole("button", { name: "Done" }).first().click();
  await memberProblemCard.getByRole("button", { name: "Done" }).first().click();
  await expect(memberProblemCard.getByText("Observe outcome", { exact: true })).toBeVisible();

  const outcomeDetails = memberProblemCard.locator("details").filter({
    has: page.getByText("Observe outcome", { exact: true }),
  });
  await outcomeDetails
    .locator('textarea[name="actualResult"]')
    .fill("The release shipped without owner escalation and all quality checks passed.");
  await outcomeDetails.locator('select[name="comparison"]').selectOption("improved");
  await outcomeDetails.getByRole("button", { name: "Record outcome" }).click();
  await expect(memberProblemCard.getByText("Outcome · improved", { exact: true })).toBeVisible();

  const reflectionDetails = memberProblemCard.locator("details").filter({
    has: page.getByText("Reflect", { exact: true }),
  });
  await reflectionDetails
    .locator('textarea[name="happened"]')
    .fill("The accountable role exercised the boundary and the release shipped normally.");
  await reflectionDetails
    .locator('textarea[name="expected"]')
    .fill("Delegation would remove the wait without weakening quality.");
  await reflectionDetails
    .locator('textarea[name="surprise"]')
    .fill("No compensating quality failure appeared.");
  await reflectionDetails
    .locator('textarea[name="learning"]')
    .fill("Delegation works when decision rights are explicit in the machine and exercised by a named owner.");
  await reflectionDetails.locator('select[name="recurring"]').selectOption("yes");
  await reflectionDetails.getByRole("button", { name: "Complete reflection" }).click();
  await expect(memberProblemCard.getByText("Reflection", { exact: true })).toBeVisible();

  await signOut(page);
  await signIn(page, ownerEmail);
  await page.goto("/organization/evolve");
  const ownerProblemCard = page.locator("article").filter({
    has: page.getByRole("heading", { name: problemTitle }),
  });
  const principleDetails = ownerProblemCard.locator("details").filter({
    has: page.getByText("Update an organizational Principle", { exact: true }),
  });
  await principleDetails
    .locator('textarea[name="trigger"]')
    .fill("When a recurring decision falls inside a documented role boundary");
  await principleDetails
    .locator('textarea[name="rule"]')
    .fill("Delegate it to the accountable role and escalate only explicit exceptions.");
  await principleDetails
    .locator('textarea[name="rationale"]')
    .fill("The observed release proved the machine change under real execution.");
  await principleDetails.getByRole("button", { name: "Save principle" }).click();
  await expect(ownerProblemCard.getByText("resolved", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Delegate it to the accountable role and escalate only explicit exceptions.", {
      exact: true,
    })
  ).toBeVisible();

  const projected = await page.evaluate(async () => {
    const stateResponse = await fetch("/api/organization/state");
    const state = await stateResponse.json();
    const organizationHandle = state.organizations[0].handle;
    const response = await fetch(
      `/api/organization/evolution?organization=${encodeURIComponent(organizationHandle)}`
    );
    return JSON.stringify(await response.json());
  });
  expect(projected).not.toContain("workspaceId");
  expect(projected).not.toContain("userId");
  expect(projected).not.toContain('"score"');
  expect(projected).not.toContain('"ranking"');
});
