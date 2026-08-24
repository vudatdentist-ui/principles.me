import assert from "node:assert/strict";
import test from "node:test";
import { createAccount } from "../../features/auth/repository";
import { hashPassword } from "../../features/auth/password";
import { createAiSuggestion } from "../../features/kernel/repository";
import { persistAiPrincipleCandidate } from "../../features/people/principle-persistence";
import {
  commitGoal,
  createPrincipleCandidate,
  createProblem,
  createRealityObservation,
  createReflection,
  getGoal,
  loadPeopleState,
  reviewPrinciple,
} from "../../features/people/repository";
import { closeDatabaseForTests, db } from "../../lib/db/client";

async function resetDatabase() {
  await db()`TRUNCATE TABLE users, rate_limit_buckets RESTART IDENTITY CASCADE`;
}

async function countRows(
  table:
    | "ai_suggestions"
    | "evidence_records"
    | "principles"
    | "problems"
    | "reflections",
  workspaceId: string
): Promise<number> {
  const rows = await db().unsafe(
    `SELECT count(*)::int AS count FROM ${table} WHERE workspace_id = $1::uuid`,
    [workspaceId]
  );
  return Number(rows[0]?.count ?? 0);
}

const goalDraft = {
  acceptedTradeoffs: "I will deprioritize low-value side projects.",
  desiredState: "Build a company that operates without depending on me day to day.",
  measures: "Two weeks of normal operation without my intervention.",
  nonNegotiables: "Protect health and family time.",
  successConditions: "Routine operating decisions happen without waiting for me.",
  whyItMatters: "I want the company to compound without making me the bottleneck.",
};

test("Phase 2 completes one durable People loop without crossing workspaces", async () => {
  process.env.AUTH_SIGNUP_MODE = "open";
  process.env.RAGFLOW_ASSIGN_BOOTSTRAP_DATASETS = "false";
  await resetDatabase();

  try {
    const passwordHash = await hashPassword("a strong integration password");
    const accountA = await createAccount({ email: "phase2-a@example.com", passwordHash });
    const accountB = await createAccount({ email: "phase2-b@example.com", passwordHash });

    const goalA = await commitGoal({
      draft: goalDraft,
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    const goalAOther = await commitGoal({
      draft: {
        ...goalDraft,
        desiredState: "Create a second distinct desired reality in the same workspace.",
      },
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    const goalB = await commitGoal({
      draft: { ...goalDraft, desiredState: "A different private desired reality." },
      userId: accountB.userId,
      workspaceId: accountB.workspaceId,
    });

    assert.equal(await getGoal(accountB.workspaceId, goalA.id), null);

    const realityA = await createRealityObservation({
      goalId: goalA.id,
      statement: "Three routine operating decisions waited for me this week.",
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    assert.equal(realityA.goalId, goalA.id);

    const evidenceBeforeCrossWorkspace = await countRows(
      "evidence_records",
      accountB.workspaceId
    );
    await assert.rejects(
      createRealityObservation({
        goalId: goalA.id,
        statement: "This cross-workspace Reality must roll back atomically.",
        userId: accountB.userId,
        workspaceId: accountB.workspaceId,
      })
    );
    assert.equal(
      await countRows("evidence_records", accountB.workspaceId),
      evidenceBeforeCrossWorkspace
    );

    const realityB = await createRealityObservation({
      goalId: goalB.id,
      statement: "A private observation in the other workspace.",
      userId: accountB.userId,
      workspaceId: accountB.workspaceId,
    });

    const problemSuggestionA = await createAiSuggestion({
      evidenceIds: [realityA.evidenceId],
      kind: "problem_candidate",
      modelName: "test-model",
      modelProvider: "test",
      payload: {
        gap: "Routine decisions still require the founder.",
        goalId: goalA.id,
        observationId: realityA.observationId,
        statement: "The founder remains a routine operating bottleneck.",
      },
      requestedByUserId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });

    const problemA = await createProblem({
      evidenceIds: [realityA.evidenceId],
      gap: "Routine decisions still require the founder.",
      goalId: goalA.id,
      statement: "The founder remains a routine operating bottleneck.",
      suggestionId: problemSuggestionA,
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });

    const problemsBeforeReplay = await countRows("problems", accountA.workspaceId);
    await assert.rejects(
      createProblem({
        evidenceIds: [realityA.evidenceId],
        gap: "Routine decisions still require the founder.",
        goalId: goalA.id,
        statement: "The founder remains a routine operating bottleneck.",
        suggestionId: problemSuggestionA,
        userId: accountA.userId,
        workspaceId: accountA.workspaceId,
      })
    );
    assert.equal(
      await countRows("problems", accountA.workspaceId),
      problemsBeforeReplay
    );

    const problemsBeforeCrossWorkspace = await countRows(
      "problems",
      accountB.workspaceId
    );
    await assert.rejects(
      createProblem({
        evidenceIds: [realityB.evidenceId],
        goalId: goalA.id,
        statement: "This cross-workspace Goal must be rejected.",
        userId: accountB.userId,
        workspaceId: accountB.workspaceId,
      })
    );
    await assert.rejects(
      createProblem({
        evidenceIds: [realityA.evidenceId],
        goalId: goalB.id,
        statement: "This cross-workspace evidence must be rejected.",
        userId: accountB.userId,
        workspaceId: accountB.workspaceId,
      })
    );
    assert.equal(
      await countRows("problems", accountB.workspaceId),
      problemsBeforeCrossWorkspace
    );

    const reflectionA = await createReflection({
      expected: "The team would make routine operating decisions without me.",
      goalId: goalA.id,
      happened: "Decisions waited until I answered.",
      learning: "If routine decisions still wait for me, ownership is not explicit enough.",
      problemId: problemA.id,
      recurrenceNote: "This happened in three separate operating decisions.",
      recurring: true,
      surprise: "The same dependency appeared after responsibilities were discussed.",
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });

    const reflectionsBeforeWrongGoal = await countRows(
      "reflections",
      accountA.workspaceId
    );
    await assert.rejects(
      createReflection({
        goalId: goalAOther.id,
        happened: "This Reflection points at the wrong Goal for its Problem.",
        learning: "It must not become durable.",
        problemId: problemA.id,
        recurring: false,
        userId: accountA.userId,
        workspaceId: accountA.workspaceId,
      })
    );
    assert.equal(
      await countRows("reflections", accountA.workspaceId),
      reflectionsBeforeWrongGoal
    );

    const reflectionsBeforeCrossWorkspace = await countRows(
      "reflections",
      accountB.workspaceId
    );
    await assert.rejects(
      createReflection({
        goalId: goalB.id,
        happened: "Cross-workspace reflection.",
        learning: "Must fail.",
        problemId: problemA.id,
        recurring: false,
        userId: accountB.userId,
        workspaceId: accountB.workspaceId,
      })
    );
    assert.equal(
      await countRows("reflections", accountB.workspaceId),
      reflectionsBeforeCrossWorkspace
    );

    const suggestionsBeforeAtomicFailure = await countRows(
      "ai_suggestions",
      accountA.workspaceId
    );
    const principlesBeforeAtomicFailure = await countRows(
      "principles",
      accountA.workspaceId
    );
    await assert.rejects(
      persistAiPrincipleCandidate({
        confidence: 0.71,
        evidenceIds: [realityA.evidenceId],
        modelName: "test-model",
        modelProvider: "test",
        rationale: "This transaction must roll back.",
        reflectionId: "00000000-0000-0000-0000-000000000001",
        rule: "Do not leave an orphan suggestion.",
        trigger: "When persistence fails",
        userId: accountA.userId,
        workspaceId: accountA.workspaceId,
      })
    );
    assert.equal(
      await countRows("ai_suggestions", accountA.workspaceId),
      suggestionsBeforeAtomicFailure
    );
    assert.equal(
      await countRows("principles", accountA.workspaceId),
      principlesBeforeAtomicFailure
    );

    const candidate = await persistAiPrincipleCandidate({
      confidence: 0.71,
      evidenceIds: [realityA.evidenceId],
      modelName: "test-model",
      modelProvider: "test",
      rationale: "Waiting reveals an ownership gap.",
      reflectionId: reflectionA.id,
      rule: "Make the decision owner and default authority explicit before the next case.",
      trigger: "When routine decisions repeatedly wait for me",
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    assert.equal(candidate.acceptanceState, "pending");
    assert.equal(candidate.lifecycleState, "candidate");

    const originRows = await db()`
      SELECT origin_ai_suggestion_id
      FROM principles
      WHERE id = ${candidate.id}::uuid
        AND workspace_id = ${accountA.workspaceId}::uuid
    `;
    const principleSuggestionA = String(originRows[0]?.origin_ai_suggestion_id);
    const principlesBeforeReplay = await countRows(
      "principles",
      accountA.workspaceId
    );
    await assert.rejects(
      createPrincipleCandidate({
        confidence: 0.71,
        evidenceIds: [realityA.evidenceId],
        rationale: "Waiting reveals an ownership gap.",
        reflectionId: reflectionA.id,
        rule: "Make the decision owner and default authority explicit before the next case.",
        suggestionId: principleSuggestionA,
        trigger: "When routine decisions repeatedly wait for me",
        userId: accountA.userId,
        workspaceId: accountA.workspaceId,
      })
    );
    assert.equal(
      await countRows("principles", accountA.workspaceId),
      principlesBeforeReplay
    );

    const accepted = await reviewPrinciple({
      action: "accept",
      principleId: candidate.id,
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    assert.equal(accepted.acceptanceState, "accepted");
    assert.equal(accepted.lifecycleState, "testing");
    assert.notEqual(accepted.lifecycleState, "trusted");

    const rejectedCandidate = await persistAiPrincipleCandidate({
      confidence: 0.44,
      evidenceIds: [realityA.evidenceId],
      modelName: "test-model",
      modelProvider: "test",
      rationale: "A weaker alternative should remain inspectable after rejection.",
      reflectionId: reflectionA.id,
      rule: "Escalate every routine choice to the founder.",
      trigger: "When a routine choice appears",
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    const rejected = await reviewPrinciple({
      action: "reject",
      principleId: rejectedCandidate.id,
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    assert.equal(rejected.acceptanceState, "rejected");
    assert.equal(rejected.lifecycleState, "candidate");

    const revisedCandidate = await persistAiPrincipleCandidate({
      confidence: 0.62,
      evidenceIds: [realityA.evidenceId],
      modelName: "test-model",
      modelProvider: "test",
      rationale: "The first wording is too broad.",
      reflectionId: reflectionA.id,
      rule: "Clarify ownership.",
      trigger: "When work waits",
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    const revised = await reviewPrinciple({
      action: "revise",
      principleId: revisedCandidate.id,
      rationale: "The revised wording is specific to repeated routine decisions.",
      rule: "Name one decision owner and their default authority before the next case.",
      trigger: "When the same routine decision waits for me more than once",
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    assert.equal(revised.acceptanceState, "revised");
    assert.equal(revised.lifecycleState, "revised");
    assert.equal(
      revised.trigger,
      "When the same routine decision waits for me more than once"
    );
    assert.equal(
      revised.rule,
      "Name one decision owner and their default authority before the next case."
    );
    assert.equal(
      revised.rationale,
      "The revised wording is specific to repeated routine decisions."
    );

    await assert.rejects(
      reviewPrinciple({
        action: "accept",
        principleId: candidate.id,
        userId: accountB.userId,
        workspaceId: accountB.workspaceId,
      }),
      /not found/i
    );

    const state = await loadPeopleState(accountA.workspaceId);
    assert.ok(state.goals.some((goal) => goal.id === goalA.id));
    assert.equal(state.reality[0]?.evidenceId, realityA.evidenceId);
    assert.equal(state.reality[0]?.goalId, goalA.id);
    assert.equal(state.problems[0]?.id, problemA.id);
    assert.equal(state.reflections[0]?.id, reflectionA.id);
    assert.equal(
      state.principles.find((principle) => principle.id === candidate.id)?.lifecycleState,
      "testing"
    );
    assert.equal(
      state.principles.find((principle) => principle.id === rejectedCandidate.id)
        ?.acceptanceState,
      "rejected"
    );
    assert.equal(
      state.principles.find((principle) => principle.id === revisedCandidate.id)?.rule,
      revised.rule
    );

    const trustedRows = await db()`
      SELECT count(*)::int AS count
      FROM principles
      WHERE workspace_id = ${accountA.workspaceId}::uuid
        AND lifecycle_state = 'trusted'
    `;
    assert.equal(Number(trustedRows[0]?.count ?? 0), 0);

    const activities = await db()`
      SELECT event_type
      FROM activity_events
      WHERE workspace_id = ${accountA.workspaceId}::uuid
    `;
    for (const expected of [
      "goal.chosen",
      "reality.observed",
      "problem.recognized",
      "reflection.completed",
      "principle.candidate_created",
      "principle.accepted",
      "principle.rejected",
      "principle.revised",
    ]) {
      assert.ok(activities.some((row) => row.event_type === expected), expected);
    }
  } finally {
    await resetDatabase();
    await closeDatabaseForTests();
  }
});
