import assert from "node:assert/strict";
import test from "node:test";
import { createAccount } from "../../features/auth/repository";
import { hashPassword } from "../../features/auth/password";
import { persistManualPrinciple } from "../../features/people/principle-persistence";
import { loadPeopleState } from "../../features/people/repository";
import { closeDatabaseForTests, db } from "../../lib/db/client";

async function resetDatabase() {
  await db()`TRUNCATE TABLE users, rate_limit_buckets RESTART IDENTITY CASCADE`;
}

test("a user-authored Principle is durable, testing, and isolated to its workspace", async () => {
  process.env.AUTH_SIGNUP_MODE = "open";
  process.env.RAGFLOW_ASSIGN_BOOTSTRAP_DATASETS = "false";
  await resetDatabase();

  try {
    const passwordHash = await hashPassword("a strong phase six integration password");
    const accountA = await createAccount({ email: "phase6-principle-a@example.com", passwordHash });
    const accountB = await createAccount({ email: "phase6-principle-b@example.com", passwordHash });

    const principle = await persistManualPrinciple({
      rationale: "Irreversible decisions deserve more care than reversible ones.",
      rule: "Slow down until the downside is understood.",
      trigger: "When a decision is hard to reverse",
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });

    assert.equal(principle.acceptanceState, "accepted");
    assert.equal(principle.lifecycleState, "testing");
    assert.equal(principle.originReflectionId, null);
    assert.deepEqual(principle.evidenceIds, []);

    const stateA = await loadPeopleState(accountA.workspaceId);
    const stateB = await loadPeopleState(accountB.workspaceId);
    assert.equal(stateA.principles.some((item) => item.id === principle.id), true);
    assert.equal(stateB.principles.some((item) => item.id === principle.id), false);
  } finally {
    await closeDatabaseForTests();
  }
});
