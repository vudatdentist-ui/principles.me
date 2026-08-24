import assert from "node:assert/strict";
import test from "node:test";
import { createAccount } from "../../features/auth/repository";
import { hashPassword } from "../../features/auth/password";
import { createAiSuggestion } from "../../features/kernel/repository";
import {
  createDesign,
  createDiagnosis,
  createOutcome,
  createOutcomeReview,
  getDesign,
  loadExecutionState,
  setActionStatus,
} from "../../features/people/execution-repository";
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

async function countRows(table: string, workspaceId: string): Promise<number> {
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

const diagnosisProposal = {
  alternativeHypotheses:
    "Workload or capability gaps could also delay decisions; current evidence does not rule them out.",
  confidence: 0.68,
  contradictingEvidence:
    "Responsibilities were discussed, so role awareness exists even though authority remains ambiguous.",
  proximateCause: "Decision ownership is discussed but default authority is not explicit.",
  rootCauseHypothesis:
    "Routine decisions have no explicit default owner with authority to act without founder approval.",
  supportingEvidence: "Repeated routine decisions waited for founder input across separate cases.",
  symptom: "Routine operating decisions wait for the founder.",
  uncertainty:
    "No direct measure yet proves which mechanism dominates; this is the strongest current hypothesis.",
};

const designProposal = {
  actions: [
    "Name the decision owner and authority boundary.",
    "Publish the rule where the team handles routine work.",
    "Run the next three routine decisions under the new rule.",
  ],
  expectedResult: "Routine operating decisions are made without waiting for founder approval.",
  machineChange:
    "Assign one explicit decision owner and a default authority boundary for routine operating decisions.",
  rationale:
    "The design removes ambiguity at the point where routine decisions currently wait for founder approval.",
  successSignal: "For two weeks, routine operating decisions proceed without founder intervention.",
};

test("Phase 3 changes a machine and preserves execution/outcome invariants", async () => {
  process.env.AUTH_SIGNUP_MODE = "open";
  process.env.RAGFLOW_ASSIGN_BOOTSTRAP_DATASETS = "false";
  await resetDatabase();

  try {
    const passwordHash = await hashPassword("a strong integration password");
    const accountA = await createAccount({ email: "phase3-a@example.com", passwordHash });
    const accountB = await createAccount({ email: "phase3-b@example.com", passwordHash });

    const goalA = await commitGoal({
      draft: goalDraft,
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    const goalAOther = await commitGoal({
      draft: { ...goalDraft, desiredState: "Build a distinct second desired reality." },
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    const goalB = await commitGoal({
      draft: { ...goalDraft, desiredState: "A private goal in another workspace." },
      userId: accountB.userId,
      workspaceId: accountB.workspaceId,
    });

    const realityA = await createRealityObservation({
      goalId: goalA.id,
      statement: "Three routine operating decisions waited for me this week.",
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    const realityB = await createRealityObservation({
      goalId: goalB.id,
      statement: "A private observation in workspace B.",
      userId: accountB.userId,
      workspaceId: accountB.workspaceId,
    });
    const problemA = await createProblem({
      evidenceIds: [realityA.evidenceId],
      gap: "Routine decisions still require the founder.",
      goalId: goalA.id,
      statement: "The founder remains a routine operating bottleneck.",
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    const problemB = await createProblem({
      evidenceIds: [realityB.evidenceId],
      gap: "A private gap in workspace B.",
      goalId: goalB.id,
      statement: "A different private problem.",
      userId: accountB.userId,
      workspaceId: accountB.workspaceId,
    });
    await createReflection({
      expected: "The team would make routine operating decisions without me.",
      goalId: goalA.id,
      happened: "Decisions waited until I answered.",
      learning: "Ownership may not be explicit enough.",
      problemId: problemA.id,
      recurrenceNote: "This happened in three separate decisions.",
      recurring: true,
      surprise: "The dependency persisted after responsibilities were discussed.",
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });

    const diagnosisSuggestion = await createAiSuggestion({
      evidenceIds: [realityA.evidenceId],
      kind: "diagnosis_candidate",
      modelName: "test-model",
      modelProvider: "test",
      payload: { ...diagnosisProposal, goalId: goalA.id, problemId: problemA.id },
      requestedByUserId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    assert.ok(diagnosisSuggestion);

    const diagnosis = await createDiagnosis({
      ...diagnosisProposal,
      evidenceIds: [realityA.evidenceId],
      goalId: goalA.id,
      problemId: problemA.id,
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    assert.equal(diagnosis.acceptanceState, "accepted");
    assert.equal(diagnosis.confidence, 0.68);
    assert.match(diagnosis.uncertainty ?? "", /strongest current hypothesis/i);

    const diagnosesBeforeReplay = await countRows("diagnoses", accountA.workspaceId);
    await assert.rejects(
      createDiagnosis({
        ...diagnosisProposal,
        evidenceIds: [realityA.evidenceId],
        goalId: goalA.id,
        problemId: problemA.id,
        userId: accountA.userId,
        workspaceId: accountA.workspaceId,
      })
    );
    assert.equal(await countRows("diagnoses", accountA.workspaceId), diagnosesBeforeReplay);

    await createAiSuggestion({
      evidenceIds: [realityA.evidenceId],
      kind: "diagnosis_candidate",
      modelName: "test-model",
      modelProvider: "test",
      payload: { ...diagnosisProposal, goalId: goalA.id, problemId: problemA.id },
      requestedByUserId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    const diagnosesBeforeWrongGoal = await countRows("diagnoses", accountA.workspaceId);
    await assert.rejects(
      createDiagnosis({
        ...diagnosisProposal,
        evidenceIds: [realityA.evidenceId],
        goalId: goalAOther.id,
        problemId: problemA.id,
        userId: accountA.userId,
        workspaceId: accountA.workspaceId,
      })
    );
    assert.equal(await countRows("diagnoses", accountA.workspaceId), diagnosesBeforeWrongGoal);

    await createAiSuggestion({
      evidenceIds: [realityB.evidenceId],
      kind: "diagnosis_candidate",
      modelName: "test-model",
      modelProvider: "test",
      payload: { ...diagnosisProposal, goalId: goalB.id, problemId: problemA.id },
      requestedByUserId: accountB.userId,
      workspaceId: accountB.workspaceId,
    });
    const diagnosesBeforeCrossWorkspace = await countRows("diagnoses", accountB.workspaceId);
    await assert.rejects(
      createDiagnosis({
        ...diagnosisProposal,
        evidenceIds: [realityB.evidenceId],
        goalId: goalB.id,
        problemId: problemA.id,
        userId: accountB.userId,
        workspaceId: accountB.workspaceId,
      })
    );
    assert.equal(
      await countRows("diagnoses", accountB.workspaceId),
      diagnosesBeforeCrossWorkspace
    );

    const revisionProblem = await createProblem({
      evidenceIds: [realityA.evidenceId],
      goalId: goalA.id,
      statement: "A second diagnostic case for revision semantics.",
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    await createAiSuggestion({
      evidenceIds: [realityA.evidenceId],
      kind: "diagnosis_candidate",
      modelName: "test-model",
      modelProvider: "test",
      payload: { ...diagnosisProposal, goalId: goalA.id, problemId: revisionProblem.id },
      requestedByUserId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    const revisedDiagnosis = await createDiagnosis({
      ...diagnosisProposal,
      evidenceIds: [realityA.evidenceId],
      goalId: goalA.id,
      problemId: revisionProblem.id,
      rootCauseHypothesis: "The user revised the root-cause hypothesis after review.",
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    assert.equal(revisedDiagnosis.acceptanceState, "revised");

    await createAiSuggestion({
      evidenceIds: diagnosis.evidenceIds,
      kind: "design_candidate",
      modelName: "test-model",
      modelProvider: "test",
      payload: { ...designProposal, diagnosisId: diagnosis.id, goalId: goalA.id, problemId: problemA.id },
      requestedByUserId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    const result = await createDesign({
      ...designProposal,
      diagnosisId: diagnosis.id,
      goalId: goalA.id,
      problemId: problemA.id,
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    assert.equal(result.design.acceptanceState, "accepted");
    assert.equal(result.actions.length, 3);
    assert.ok(result.actions.every((action) => action.status === "pending"));

    const designsBeforeReplay = await countRows("designs", accountA.workspaceId);
    const actionsBeforeReplay = await countRows("execution_actions", accountA.workspaceId);
    await assert.rejects(
      createDesign({
        ...designProposal,
        diagnosisId: diagnosis.id,
        goalId: goalA.id,
        problemId: problemA.id,
        userId: accountA.userId,
        workspaceId: accountA.workspaceId,
      })
    );
    assert.equal(await countRows("designs", accountA.workspaceId), designsBeforeReplay);
    assert.equal(await countRows("execution_actions", accountA.workspaceId), actionsBeforeReplay);

    await createAiSuggestion({
      evidenceIds: diagnosis.evidenceIds,
      kind: "design_candidate",
      modelName: "test-model",
      modelProvider: "test",
      payload: { ...designProposal, diagnosisId: diagnosis.id, goalId: goalA.id, problemId: problemA.id },
      requestedByUserId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    const designsBeforeSemanticFailure = await countRows("designs", accountA.workspaceId);
    const actionsBeforeSemanticFailure = await countRows("execution_actions", accountA.workspaceId);
    await assert.rejects(
      createDesign({
        ...designProposal,
        diagnosisId: diagnosis.id,
        goalId: goalAOther.id,
        problemId: problemA.id,
        userId: accountA.userId,
        workspaceId: accountA.workspaceId,
      })
    );
    assert.equal(await countRows("designs", accountA.workspaceId), designsBeforeSemanticFailure);
    assert.equal(
      await countRows("execution_actions", accountA.workspaceId),
      actionsBeforeSemanticFailure
    );

    await assert.rejects(
      setActionStatus({
        actionId: result.actions[0].id,
        status: "completed",
        userId: accountB.userId,
        workspaceId: accountB.workspaceId,
      })
    );

    const outcomesBeforePendingFailure = await countRows("outcomes", accountA.workspaceId);
    const evidenceBeforePendingFailure = await countRows("evidence_records", accountA.workspaceId);
    await assert.rejects(
      createOutcome({
        actualResult: "This must not persist while Actions are pending.",
        comparison: "improved",
        designId: result.design.id,
        userId: accountA.userId,
        workspaceId: accountA.workspaceId,
      })
    );
    assert.equal(await countRows("outcomes", accountA.workspaceId), outcomesBeforePendingFailure);
    assert.equal(
      await countRows("evidence_records", accountA.workspaceId),
      evidenceBeforePendingFailure
    );

    const completedOne = await setActionStatus({
      actionId: result.actions[0].id,
      status: "completed",
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    assert.ok(completedOne.completedAt);
    const completedTwo = await setActionStatus({
      actionId: result.actions[1].id,
      status: "completed",
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    assert.ok(completedTwo.completedAt);
    const cancelled = await setActionStatus({
      actionId: result.actions[2].id,
      status: "cancelled",
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    assert.equal(cancelled.completedAt, null);

    const outcome = await createOutcome({
      actualResult:
        "The next three routine operating decisions were made by the named owner without waiting for me.",
      comparison: "improved",
      designId: result.design.id,
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    assert.equal(outcome.expectedResult, designProposal.expectedResult);
    assert.equal(outcome.comparison, "improved");
    assert.equal((await getDesign(accountA.workspaceId, result.design.id))?.lifecycleState, "evaluated");

    const outcomesBeforeSecond = await countRows("outcomes", accountA.workspaceId);
    await assert.rejects(
      createOutcome({
        actualResult: "A second evaluation is not part of the Phase 3 v1 loop.",
        comparison: "unclear",
        designId: result.design.id,
        userId: accountA.userId,
        workspaceId: accountA.workspaceId,
      })
    );
    assert.equal(await countRows("outcomes", accountA.workspaceId), outcomesBeforeSecond);

    const outcomesBeforeWrongChain = await countRows("outcomes", accountA.workspaceId);
    await assert.rejects(
      db()`
        INSERT INTO outcomes (
          workspace_id, created_by_user_id, goal_id, problem_id, diagnosis_id,
          design_id, evidence_id, observation_id, expected_result, actual_result, comparison
        ) VALUES (
          ${accountA.workspaceId}::uuid,
          ${accountA.userId}::uuid,
          ${goalAOther.id}::uuid,
          ${problemA.id}::uuid,
          ${diagnosis.id}::uuid,
          ${result.design.id}::uuid,
          ${realityA.evidenceId}::uuid,
          ${realityA.observationId}::uuid,
          'wrong chain',
          'must roll back',
          'unclear'
        )
      `
    );
    assert.equal(await countRows("outcomes", accountA.workspaceId), outcomesBeforeWrongChain);

    const review = await createOutcomeReview({
      learning:
        "Changing default decision authority changed behavior; discussing responsibilities alone had not.",
      outcomeId: outcome.id,
      surprise: "A small authority rule removed more waiting than another discussion did.",
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    assert.equal(review.goalId, goalA.id);
    assert.equal(review.problemId, problemA.id);
    assert.equal(review.expected, designProposal.expectedResult);
    assert.equal(review.happened, outcome.actualResult);

    const reviewsBeforeDuplicate = await countRows("outcome_reflections", accountA.workspaceId);
    await assert.rejects(
      createOutcomeReview({
        learning: "A duplicate Outcome Review must not persist.",
        outcomeId: outcome.id,
        userId: accountA.userId,
        workspaceId: accountA.workspaceId,
      })
    );
    assert.equal(
      await countRows("outcome_reflections", accountA.workspaceId),
      reviewsBeforeDuplicate
    );

    const extraReflection = await createReflection({
      goalId: goalA.id,
      happened: "A separate reflection for FK auditing.",
      learning: "It should not be attachable with the wrong goal tuple.",
      problemId: problemA.id,
      recurring: false,
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    const linksBeforeWrongGoal = await countRows("outcome_reflections", accountA.workspaceId);
    await assert.rejects(
      db()`
        INSERT INTO outcome_reflections (
          workspace_id, reflection_id, outcome_id, goal_id, problem_id
        ) VALUES (
          ${accountA.workspaceId}::uuid,
          ${extraReflection.id}::uuid,
          ${outcome.id}::uuid,
          ${goalAOther.id}::uuid,
          ${problemA.id}::uuid
        )
      `
    );
    assert.equal(await countRows("outcome_reflections", accountA.workspaceId), linksBeforeWrongGoal);

    assert.equal(await countRows("outcomes", accountB.workspaceId), 0);
    assert.equal(await countRows("outcome_reflections", accountB.workspaceId), 0);
    assert.ok(problemB.id);

    const state = await loadExecutionState(accountA.workspaceId);
    assert.equal(state.diagnoses.find((item) => item.id === diagnosis.id)?.acceptanceState, "accepted");
    assert.equal(state.designs.find((item) => item.id === result.design.id)?.lifecycleState, "evaluated");
    assert.equal(
      state.actions.filter((item) => item.designId === result.design.id && item.status === "completed")
        .length,
      2
    );
    assert.equal(state.outcomes.find((item) => item.id === outcome.id)?.comparison, "improved");
    assert.equal(state.outcomeReviews.find((item) => item.id === review.id)?.outcomeId, outcome.id);

    const activities = await db()`
      SELECT event_type
      FROM activity_events
      WHERE workspace_id = ${accountA.workspaceId}::uuid
    `;
    for (const expected of [
      "diagnosis.accepted",
      "diagnosis.revised",
      "design.accepted",
      "action.completed",
      "action.cancelled",
      "outcome.recorded",
      "outcome.reviewed",
    ]) {
      assert.ok(activities.some((row) => row.event_type === expected), expected);
    }
  } finally {
    await resetDatabase();
    await closeDatabaseForTests();
  }
});
