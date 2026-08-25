import assert from "node:assert/strict";
import test from "node:test";
import { createAccount } from "../../features/auth/repository";
import { hashPassword } from "../../features/auth/password";
import { createAiSuggestion } from "../../features/kernel/repository";
import {
  applyLearningPrincipleRevision,
  createLearningPattern,
  loadLearningCases,
  loadLearningState,
  persistLearningSuggestion,
  rejectLatestLearningProposal,
} from "../../features/learning/repository";
import {
  createDesign,
  createDiagnosis,
  createOutcome,
  createOutcomeReview,
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
  acceptedTradeoffs: "Deprioritize low-value side projects.",
  desiredState: "Build a company that operates without depending on me day to day.",
  measures: "Two weeks of normal operation without my intervention.",
  nonNegotiables: "Protect health and family time.",
  successConditions: "Routine operating decisions happen without waiting for me.",
  whyItMatters: "The company should compound without making me the bottleneck.",
};

const diagnosisProposal = {
  alternativeHypotheses: "Capability or workload could also contribute.",
  confidence: 0.68,
  contradictingEvidence: "Responsibilities were already discussed.",
  proximateCause: "Default authority is not explicit.",
  rootCauseHypothesis:
    "Routine decisions have no explicit default owner with authority to act without founder approval.",
  supportingEvidence: "Routine decisions repeatedly waited for founder input.",
  symptom: "Routine operating decisions wait for the founder.",
  uncertainty: "The dominant mechanism still needs more real-world tests.",
};

const designProposal = {
  actions: [
    "Name the decision owner and authority boundary.",
    "Publish the authority rule.",
    "Run the next three routine decisions under the rule.",
  ],
  expectedResult: "Routine decisions are made without waiting for founder approval.",
  machineChange: "Create an explicit default owner and authority boundary.",
  rationale: "The machine change removes approval ambiguity.",
  successSignal: "The next routine decisions proceed without founder intervention.",
};

const learningDraft = {
  confidence: 0.78,
  contradictingEvidence:
    "This is one before/after cycle and does not prove a broad recurring trait.",
  implication:
    "Change default authority and observe behavior instead of relying on role discussion alone.",
  kind: "design_learning" as const,
  statement:
    "Explicit default authority changed behavior where discussing responsibilities alone had not.",
  supportingEvidence:
    "Before the change decisions waited; after the change routine decisions moved without waiting.",
  uncertainty: "The causal interpretation should be tested again in future cases.",
};

async function buildCompletedHistory(input: {
  email: string;
  passwordHash: string;
}) {
  const account = await createAccount({
    email: input.email,
    passwordHash: input.passwordHash,
  });
  const goal = await commitGoal({
    draft: goalDraft,
    userId: account.userId,
    workspaceId: account.workspaceId,
  });
  const reality = await createRealityObservation({
    goalId: goal.id,
    statement: "Three routine decisions waited for me this week.",
    userId: account.userId,
    workspaceId: account.workspaceId,
  });
  const problem = await createProblem({
    evidenceIds: [reality.evidenceId],
    gap: "Routine decisions still require founder input.",
    goalId: goal.id,
    statement: "The founder remains a routine operating bottleneck.",
    userId: account.userId,
    workspaceId: account.workspaceId,
  });
  const reflection = await createReflection({
    expected: "The team would make routine decisions without me.",
    goalId: goal.id,
    happened: "Decisions waited until I answered.",
    learning: "Discussed ownership may still be too ambiguous.",
    problemId: problem.id,
    recurrenceNote: "This happened across three routine decisions.",
    recurring: true,
    surprise: "Responsibilities were discussed but waiting persisted.",
    userId: account.userId,
    workspaceId: account.workspaceId,
  });

  const principleRows = await db()`
    INSERT INTO principles (
      workspace_id,
      created_by_user_id,
      origin_reflection_id,
      trigger,
      rule,
      rationale,
      lifecycle_state,
      acceptance_state,
      confidence
    ) VALUES (
      ${account.workspaceId}::uuid,
      ${account.userId}::uuid,
      ${reflection.id}::uuid,
      'When routine decisions repeatedly wait for me',
      'Make the decision owner and default authority explicit before the next routine case.',
      'Repeated waiting suggests ownership is not explicit enough.',
      'testing',
      'accepted',
      0.72
    )
    RETURNING id, trigger, rule, rationale
  `;
  const principle = principleRows[0];
  assert.ok(principle);

  await createAiSuggestion({
    evidenceIds: [reality.evidenceId],
    kind: "diagnosis_candidate",
    modelName: "test-model",
    modelProvider: "test",
    payload: {
      ...diagnosisProposal,
      goalId: goal.id,
      problemId: problem.id,
    },
    requestedByUserId: account.userId,
    workspaceId: account.workspaceId,
  });
  const diagnosis = await createDiagnosis({
    ...diagnosisProposal,
    evidenceIds: [reality.evidenceId],
    goalId: goal.id,
    problemId: problem.id,
    userId: account.userId,
    workspaceId: account.workspaceId,
  });

  await createAiSuggestion({
    evidenceIds: diagnosis.evidenceIds,
    kind: "design_candidate",
    modelName: "test-model",
    modelProvider: "test",
    payload: {
      ...designProposal,
      diagnosisId: diagnosis.id,
      goalId: goal.id,
      problemId: problem.id,
    },
    requestedByUserId: account.userId,
    workspaceId: account.workspaceId,
  });
  const design = await createDesign({
    ...designProposal,
    diagnosisId: diagnosis.id,
    goalId: goal.id,
    problemId: problem.id,
    userId: account.userId,
    workspaceId: account.workspaceId,
  });
  for (const action of design.actions) {
    await setActionStatus({
      actionId: action.id,
      status: "completed",
      userId: account.userId,
      workspaceId: account.workspaceId,
    });
  }
  const outcome = await createOutcome({
    actualResult:
      "The next routine decisions were made by the named owner without waiting for me.",
    comparison: "improved",
    designId: design.design.id,
    userId: account.userId,
    workspaceId: account.workspaceId,
  });
  const outcomeReview = await createOutcomeReview({
    learning:
      "Changing default authority changed behavior; discussing responsibilities alone had not.",
    outcomeId: outcome.id,
    surprise: "A small authority rule removed more waiting than another discussion did.",
    userId: account.userId,
    workspaceId: account.workspaceId,
  });

  return {
    account,
    goal,
    outcomeReview,
    principle: {
      id: String(principle.id),
      rationale: String(principle.rationale),
      rule: String(principle.rule),
      trigger: String(principle.trigger),
    },
    problem,
    reflection,
  };
}

async function storeLearningProposal(input: {
  caseReflectionIds: string[];
  principleId: string;
  userId: string;
  workspaceId: string;
}) {
  return persistLearningSuggestion({
    caseReflectionIds: input.caseReflectionIds,
    ...learningDraft,
    modelName: "test-model",
    modelProvider: "test",
    principleRevision: {
      principleId: input.principleId,
      proposedRationale:
        "The before/after history supports encoding default authority and testing the next real outcome.",
      proposedRule:
        "Name the decision owner and default authority before the next routine case, then verify the next outcome.",
      proposedTrigger:
        "When routine decisions wait after responsibilities have already been discussed",
    },
    requestedByUserId: input.userId,
    workspaceId: input.workspaceId,
  });
}

test("Phase 4 builds a correctable Self Model and preserves Principle revision history", async () => {
  process.env.AUTH_SIGNUP_MODE = "open";
  process.env.RAGFLOW_ASSIGN_BOOTSTRAP_DATASETS = "false";
  await resetDatabase();

  try {
    const passwordHash = await hashPassword("a strong integration password");
    const historyA = await buildCompletedHistory({
      email: "phase4-a@example.com",
      passwordHash,
    });
    const historyB = await buildCompletedHistory({
      email: "phase4-b@example.com",
      passwordHash,
    });

    const casesA = await loadLearningCases(historyA.account.workspaceId);
    assert.equal(casesA.length, 2);
    assert.equal(casesA[0]?.phase, "reflection");
    assert.equal(casesA[1]?.phase, "outcome_review");
    assert.ok(casesA.every((item) => item.goalId === historyA.goal.id));
    assert.ok(casesA.every((item) => item.problemId === historyA.problem.id));

    const patternsBeforeMinimumFailure = await countRows(
      "learning_patterns",
      historyA.account.workspaceId
    );
    await assert.rejects(
      db()`
        INSERT INTO learning_patterns (
          workspace_id, created_by_user_id, kind, statement, implication,
          supporting_evidence, contradicting_evidence, uncertainty,
          confidence, acceptance_state, lifecycle_state
        ) VALUES (
          ${historyA.account.workspaceId}::uuid,
          ${historyA.account.userId}::uuid,
          'design_learning',
          'A pattern with no cases must fail.',
          'It must never enter the Self Model.',
          'No support.',
          'No counter-evidence.',
          'No cases.',
          0.1,
          'accepted',
          'active'
        )
      `
    );
    assert.equal(
      await countRows("learning_patterns", historyA.account.workspaceId),
      patternsBeforeMinimumFailure
    );

    await storeLearningProposal({
      caseReflectionIds: [historyA.reflection.id, historyB.reflection.id],
      principleId: historyA.principle.id,
      userId: historyA.account.userId,
      workspaceId: historyA.account.workspaceId,
    });
    await assert.rejects(
      createLearningPattern({
        draft: learningDraft,
        userId: historyA.account.userId,
        workspaceId: historyA.account.workspaceId,
      }),
      /workspace|reflection/i
    );
    assert.equal(
      await countRows("learning_patterns", historyA.account.workspaceId),
      patternsBeforeMinimumFailure
    );

    await storeLearningProposal({
      caseReflectionIds: [historyA.reflection.id, historyA.outcomeReview.id],
      principleId: historyA.principle.id,
      userId: historyA.account.userId,
      workspaceId: historyA.account.workspaceId,
    });
    const patternId = await createLearningPattern({
      draft: learningDraft,
      userId: historyA.account.userId,
      workspaceId: historyA.account.workspaceId,
    });
    assert.ok(patternId);

    const stateAfterAccept = await loadLearningState(historyA.account.workspaceId);
    const acceptedPattern = stateAfterAccept.patterns.find(
      (item) => item.id === patternId
    );
    assert.ok(acceptedPattern);
    assert.equal(acceptedPattern.acceptanceState, "accepted");
    assert.equal(acceptedPattern.lifecycleState, "active");
    assert.equal(acceptedPattern.cases.length, 2);
    assert.equal(
      acceptedPattern.principleRevisionProposal?.principleId,
      historyA.principle.id
    );

    const wrongGoal = await commitGoal({
      draft: { ...goalDraft, desiredState: "A different same-workspace Goal." },
      userId: historyA.account.userId,
      workspaceId: historyA.account.workspaceId,
    });
    await assert.rejects(
      db()`
        UPDATE learning_pattern_cases
        SET goal_id = ${wrongGoal.id}::uuid
        WHERE workspace_id = ${historyA.account.workspaceId}::uuid
          AND pattern_id = ${patternId}::uuid
          AND reflection_id = ${historyA.reflection.id}::uuid
      `
    );

    const patternsBeforeReplay = await countRows(
      "learning_patterns",
      historyA.account.workspaceId
    );
    await assert.rejects(
      createLearningPattern({
        draft: learningDraft,
        userId: historyA.account.userId,
        workspaceId: historyA.account.workspaceId,
      })
    );
    assert.equal(
      await countRows("learning_patterns", historyA.account.workspaceId),
      patternsBeforeReplay
    );

    await storeLearningProposal({
      caseReflectionIds: [historyA.reflection.id, historyA.outcomeReview.id],
      principleId: historyA.principle.id,
      userId: historyA.account.userId,
      workspaceId: historyA.account.workspaceId,
    });
    const revisedPatternId = await createLearningPattern({
      draft: {
        ...learningDraft,
        statement:
          "I corrected the hypothesis: explicit authority appears more effective than role discussion in this observed cycle.",
      },
      userId: historyA.account.userId,
      workspaceId: historyA.account.workspaceId,
    });
    const revisedPattern = (await loadLearningState(historyA.account.workspaceId)).patterns.find(
      (item) => item.id === revisedPatternId
    );
    assert.equal(revisedPattern?.acceptanceState, "revised");

    const patternsBeforeReject = await countRows(
      "learning_patterns",
      historyA.account.workspaceId
    );
    const rejectedSuggestionId = await storeLearningProposal({
      caseReflectionIds: [historyA.reflection.id, historyA.outcomeReview.id],
      principleId: historyA.principle.id,
      userId: historyA.account.userId,
      workspaceId: historyA.account.workspaceId,
    });
    await rejectLatestLearningProposal({
      userId: historyA.account.userId,
      workspaceId: historyA.account.workspaceId,
    });
    assert.equal(
      await countRows("learning_patterns", historyA.account.workspaceId),
      patternsBeforeReject
    );
    const rejectedSuggestionRows = await db()`
      SELECT acceptance_state
      FROM ai_suggestions
      WHERE id = ${rejectedSuggestionId}::uuid
        AND workspace_id = ${historyA.account.workspaceId}::uuid
    `;
    assert.equal(rejectedSuggestionRows[0]?.acceptance_state, "rejected");

    const supersededSuggestionId = await storeLearningProposal({
      caseReflectionIds: [historyA.reflection.id, historyA.outcomeReview.id],
      principleId: historyA.principle.id,
      userId: historyA.account.userId,
      workspaceId: historyA.account.workspaceId,
    });
    await storeLearningProposal({
      caseReflectionIds: [historyA.reflection.id, historyA.outcomeReview.id],
      principleId: historyA.principle.id,
      userId: historyA.account.userId,
      workspaceId: historyA.account.workspaceId,
    });
    const supersededRows = await db()`
      SELECT acceptance_state
      FROM ai_suggestions
      WHERE id = ${supersededSuggestionId}::uuid
        AND workspace_id = ${historyA.account.workspaceId}::uuid
    `;
    assert.equal(supersededRows[0]?.acceptance_state, "rejected");

    await assert.rejects(
      applyLearningPrincipleRevision({
        patternId,
        principleId: historyB.principle.id,
        rationale: "Cross-workspace revision must fail.",
        rule: "Cross-workspace rule must fail.",
        trigger: "Cross-workspace trigger must fail.",
        userId: historyA.account.userId,
        workspaceId: historyA.account.workspaceId,
      })
    );

    const revisedTrigger =
      "When routine decisions wait after responsibilities have already been discussed";
    const revisedRule =
      "Name the decision owner and default authority before the next routine case, then verify the next outcome.";
    const revisedRationale =
      "The observed before/after cycle supports explicit authority, but the rule must be tested again.";
    await applyLearningPrincipleRevision({
      patternId,
      principleId: historyA.principle.id,
      rationale: revisedRationale,
      rule: revisedRule,
      trigger: revisedTrigger,
      userId: historyA.account.userId,
      workspaceId: historyA.account.workspaceId,
    });

    const revisionRows = await db()`
      SELECT previous_trigger, previous_rule, previous_rationale,
        revised_trigger, revised_rule, revised_rationale
      FROM principle_learning_revisions
      WHERE workspace_id = ${historyA.account.workspaceId}::uuid
        AND pattern_id = ${patternId}::uuid
    `;
    assert.equal(revisionRows.length, 1);
    assert.equal(revisionRows[0]?.previous_trigger, historyA.principle.trigger);
    assert.equal(revisionRows[0]?.previous_rule, historyA.principle.rule);
    assert.equal(revisionRows[0]?.revised_trigger, revisedTrigger);
    assert.equal(revisionRows[0]?.revised_rule, revisedRule);

    const principleRows = await db()`
      SELECT trigger, rule, rationale, acceptance_state, lifecycle_state
      FROM principles
      WHERE id = ${historyA.principle.id}::uuid
        AND workspace_id = ${historyA.account.workspaceId}::uuid
    `;
    assert.equal(principleRows[0]?.trigger, revisedTrigger);
    assert.equal(principleRows[0]?.rule, revisedRule);
    assert.equal(principleRows[0]?.rationale, revisedRationale);
    assert.equal(principleRows[0]?.acceptance_state, "revised");
    assert.equal(principleRows[0]?.lifecycle_state, "testing");
    assert.notEqual(principleRows[0]?.lifecycle_state, "trusted");

    const finalState = await loadLearningState(historyA.account.workspaceId);
    const appliedPattern = finalState.patterns.find((item) => item.id === patternId);
    assert.equal(appliedPattern?.lifecycleState, "applied");
    assert.ok(appliedPattern?.appliedAt);
    assert.equal(appliedPattern?.appliedRevision?.previousRule, historyA.principle.rule);
    assert.equal(appliedPattern?.appliedRevision?.revisedRule, revisedRule);

    await assert.rejects(
      applyLearningPrincipleRevision({
        patternId,
        principleId: historyA.principle.id,
        rationale: revisedRationale,
        rule: revisedRule,
        trigger: revisedTrigger,
        userId: historyA.account.userId,
        workspaceId: historyA.account.workspaceId,
      })
    );

    const activityRows = await db()`
      SELECT event_type
      FROM activity_events
      WHERE workspace_id = ${historyA.account.workspaceId}::uuid
    `;
    for (const eventType of [
      "learning.pattern_accepted",
      "learning.pattern_revised",
      "learning.proposal_rejected",
      "principle.revised_from_learning",
    ]) {
      assert.ok(
        activityRows.some((row) => row.event_type === eventType),
        eventType
      );
    }
  } finally {
    await resetDatabase();
    await closeDatabaseForTests();
  }
});
