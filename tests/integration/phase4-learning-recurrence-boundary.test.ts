import assert from "node:assert/strict";
import test from "node:test";
import { createAccount } from "../../features/auth/repository";
import { hashPassword } from "../../features/auth/password";
import {
  createLearningPattern,
  persistLearningSuggestion,
} from "../../features/learning/repository";
import {
  commitGoal,
  createProblem,
  createRealityObservation,
  createReflection,
} from "../../features/people/repository";
import { closeDatabaseForTests, db } from "../../lib/db/client";

async function resetDatabase() {
  await db()`TRUNCATE TABLE users, rate_limit_buckets RESTART IDENTITY CASCADE`;
}

const goalDraft = {
  acceptedTradeoffs: "Deprioritize low-value work.",
  desiredState: "Routine decisions move without waiting for me.",
  measures: "Observe the next real cases.",
  nonNegotiables: "Keep important boundaries explicit.",
  successConditions: "The machine handles routine work without founder approval.",
  whyItMatters: "I do not want to remain the operating bottleneck.",
};

const baseDraft = {
  confidence: 0.65,
  contradictingEvidence: "The sample is still small.",
  implication: "Test the hypothesis in another real case.",
  statement: "Routine work may wait when default authority is ambiguous.",
  supportingEvidence: "The selected cases show waiting around routine decisions.",
  uncertainty: "More independent cases are needed before treating this as recurring.",
};

async function countPatterns(workspaceId: string): Promise<number> {
  const rows = await db()`
    SELECT count(*)::int AS count
    FROM learning_patterns
    WHERE workspace_id = ${workspaceId}::uuid
  `;
  return Number(rows[0]?.count ?? 0);
}

async function createCase(input: {
  desiredState: string;
  problemStatement: string;
  userId: string;
  workspaceId: string;
}) {
  const goal = await commitGoal({
    draft: { ...goalDraft, desiredState: input.desiredState },
    userId: input.userId,
    workspaceId: input.workspaceId,
  });
  const reality = await createRealityObservation({
    goalId: goal.id,
    statement: "A routine decision waited for founder input.",
    userId: input.userId,
    workspaceId: input.workspaceId,
  });
  const problem = await createProblem({
    evidenceIds: [reality.evidenceId],
    goalId: goal.id,
    statement: input.problemStatement,
    userId: input.userId,
    workspaceId: input.workspaceId,
  });
  const reflection = await createReflection({
    expected: "The routine decision would move without founder input.",
    goalId: goal.id,
    happened: "The decision waited.",
    learning: "Default authority may be ambiguous.",
    problemId: problem.id,
    recurring: false,
    surprise: "Role discussion alone did not remove the wait.",
    userId: input.userId,
    workspaceId: input.workspaceId,
  });
  return { goal, problem, reflection };
}

test("recurring Learning Patterns require cases from at least two distinct Problems", async () => {
  process.env.AUTH_SIGNUP_MODE = "open";
  process.env.RAGFLOW_ASSIGN_BOOTSTRAP_DATASETS = "false";
  await resetDatabase();

  try {
    const passwordHash = await hashPassword("a strong integration password");
    const account = await createAccount({
      email: "phase4-recurrence@example.com",
      passwordHash,
    });
    const first = await createCase({
      desiredState: "Routine operating decisions move without me.",
      problemStatement: "Routine operating decisions wait for me.",
      userId: account.userId,
      workspaceId: account.workspaceId,
    });
    const secondSameProblem = await createReflection({
      expected: "The next routine decision would move without founder input.",
      goalId: first.goal.id,
      happened: "Another routine decision waited.",
      learning: "The same Problem persisted before a machine change.",
      problemId: first.problem.id,
      recurring: true,
      surprise: "The second case repeated the same wait.",
      userId: account.userId,
      workspaceId: account.workspaceId,
    });

    await persistLearningSuggestion({
      caseReflectionIds: [first.reflection.id, secondSameProblem.id],
      ...baseDraft,
      kind: "design_learning",
      modelName: "test-model",
      modelProvider: "test",
      principleRevision: null,
      requestedByUserId: account.userId,
      workspaceId: account.workspaceId,
    });
    const beforeInvalidEdit = await countPatterns(account.workspaceId);
    await assert.rejects(
      createLearningPattern({
        draft: { ...baseDraft, kind: "recurring_pattern" },
        userId: account.userId,
        workspaceId: account.workspaceId,
      }),
      /two distinct Problems|recurring/i
    );
    assert.equal(await countPatterns(account.workspaceId), beforeInvalidEdit);

    const secondProblem = await createCase({
      desiredState: "Routine client decisions move without me.",
      problemStatement: "Routine client decisions also wait for founder approval.",
      userId: account.userId,
      workspaceId: account.workspaceId,
    });
    await persistLearningSuggestion({
      caseReflectionIds: [first.reflection.id, secondProblem.reflection.id],
      ...baseDraft,
      kind: "recurring_pattern",
      modelName: "test-model",
      modelProvider: "test",
      principleRevision: null,
      requestedByUserId: account.userId,
      workspaceId: account.workspaceId,
    });
    const patternId = await createLearningPattern({
      draft: { ...baseDraft, kind: "recurring_pattern" },
      userId: account.userId,
      workspaceId: account.workspaceId,
    });
    assert.ok(patternId);
    assert.equal(await countPatterns(account.workspaceId), beforeInvalidEdit + 1);
  } finally {
    await resetDatabase();
    await closeDatabaseForTests();
  }
});
