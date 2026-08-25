import assert from "node:assert/strict";
import test from "node:test";
import { createAccount } from "../../features/auth/repository";
import { hashPassword } from "../../features/auth/password";
import {
  createOrganizationEvolutionGoal,
  recordOrganizationEvolutionIssue,
} from "../../features/organization/evolution-repository";
import {
  createOrganization,
  resolveOrganizationIssue,
} from "../../features/organization/repository";
import { closeDatabaseForTests, db } from "../../lib/db/client";

async function resetDatabase() {
  await db()`TRUNCATE TABLE users, rate_limit_buckets RESTART IDENTITY CASCADE`;
}

test("a Goal-linked organization Issue cannot be resolved before its kernel loop completes", async () => {
  process.env.AUTH_SIGNUP_MODE = "open";
  process.env.RAGFLOW_ASSIGN_BOOTSTRAP_DATASETS = "false";
  await resetDatabase();

  try {
    const passwordHash = await hashPassword("organization consistency password");
    const owner = await createAccount({ email: "consistency@org.test", passwordHash });
    const organization = await createOrganization({
      name: "Consistent Machine",
      userId: owner.userId,
    });
    const handle = organization.organizations[0]?.handle;
    assert.ok(handle);

    let state = await createOrganizationEvolutionGoal({
      desiredState: "Routine decisions happen without owner bottlenecks.",
      handle,
      successConditions: "One routine decision completes within its delegated boundary.",
      userId: owner.userId,
      whyItMatters: "The operating model must match stated decision rights.",
    });
    const goal = state.goals[0];
    assert.ok(goal);

    state = await recordOrganizationEvolutionIssue({
      goalId: goal.id,
      handle,
      observedReality: "A routine decision still waited for owner approval.",
      tension: "The observed reality conflicts with the shared Goal.",
      title: "Delegated decision still escalated",
      userId: owner.userId,
    });
    const problem = state.goals[0]?.problems[0];
    assert.ok(problem);

    await assert.rejects(
      resolveOrganizationIssue({
        handle,
        issueId: problem.issueId,
        resolution: "This must not bypass Diagnosis, Design, Outcome and Reflection.",
        userId: owner.userId,
      }),
      (error: unknown) =>
        Boolean(
          error &&
            typeof error === "object" &&
            "code" in error &&
            (error as { code?: unknown }).code === "P0001"
        )
    );

    const rows = await db()`
      SELECT issue.status AS issue_status, problem.status AS problem_status
      FROM organization_issue_kernel_links link
      JOIN organization_issues issue
        ON issue.id = link.issue_id
        AND issue.workspace_id = link.workspace_id
      JOIN problems problem
        ON problem.id = link.problem_id
        AND problem.workspace_id = link.workspace_id
      WHERE link.issue_id = ${problem.issueId}::uuid
    `;
    assert.equal(rows[0]?.issue_status, "open");
    assert.equal(rows[0]?.problem_status, "recognized");
  } finally {
    await resetDatabase();
    await closeDatabaseForTests();
  }
});
