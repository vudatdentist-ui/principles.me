import assert from "node:assert/strict";
import test from "node:test";
import { createAccount } from "../../features/auth/repository";
import { hashPassword } from "../../features/auth/password";
import { createAiSuggestion } from "../../features/kernel/repository";
import {
  createDesign,
  createDiagnosis,
  createOutcome,
  getDesign,
  setActionStatus,
} from "../../features/people/execution-repository";
import {
  commitGoal,
  createProblem,
  createRealityObservation,
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
  acceptedTradeoffs: "Deprioritize low-value work.",
  desiredState: "Build a company that does not depend on founder approval for routine work.",
  measures: "Two weeks without routine founder approvals.",
  nonNegotiables: "Protect trust and quality.",
  successConditions: "Routine decisions happen at the right level.",
  whyItMatters: "The organization should compound without founder bottlenecks.",
};

const diagnosisProposal = {
  alternativeHypotheses: "Workload or capability may also contribute.",
  confidence: 0.67,
  contradictingEvidence: "The team already understands the broad responsibilities.",
  proximateCause: "Default decision authority is ambiguous.",
  rootCauseHypothesis: "Routine decisions lack an explicit owner with default authority.",
  supportingEvidence: "Multiple routine cases waited for founder approval.",
  symptom: "Routine operating decisions wait for the founder.",
  uncertainty: "The current sample is small enough that alternatives remain plausible.",
};

const designProposal = {
  actions: [
    "Name the default decision owner.",
    "Define the authority boundary.",
  ],
  expectedResult: "Routine decisions proceed without founder approval.",
  machineChange: "Give one named owner default authority for routine operating decisions.",
  rationale: "The change removes the ambiguity identified by the Diagnosis.",
  successSignal: "Routine decisions proceed for two weeks without founder intervention.",
};

test("Phase 3 rejects cross-workspace Design/Outcome and records revised Designs distinctly", async () => {
  process.env.AUTH_SIGNUP_MODE = "open";
  process.env.RAGFLOW_ASSIGN_BOOTSTRAP_DATASETS = "false";
  await resetDatabase();

  try {
    const passwordHash = await hashPassword("a strong phase3 boundary password");
    const accountA = await createAccount({ email: "phase3-boundary-a@example.com", passwordHash });
    const accountB = await createAccount({ email: "phase3-boundary-b@example.com", passwordHash });

    const goalA = await commitGoal({
      draft: goalDraft,
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    const goalB = await commitGoal({
      draft: { ...goalDraft, desiredState: "A private desired reality in workspace B." },
      userId: accountB.userId,
      workspaceId: accountB.workspaceId,
    });
    const realityA = await createRealityObservation({
      goalId: goalA.id,
      statement: "Routine decisions repeatedly waited for founder approval.",
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    const realityB = await createRealityObservation({
      goalId: goalB.id,
      statement: "Private Reality B.",
      userId: accountB.userId,
      workspaceId: accountB.workspaceId,
    });
    const problemA = await createProblem({
      evidenceIds: [realityA.evidenceId],
      goalId: goalA.id,
      statement: "Founder approval remains a routine bottleneck.",
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    const problemB = await createProblem({
      evidenceIds: [realityB.evidenceId],
      goalId: goalB.id,
      statement: "A private Problem B.",
      userId: accountB.userId,
      workspaceId: accountB.workspaceId,
    });

    await createAiSuggestion({
      evidenceIds: [realityA.evidenceId],
      kind: "diagnosis_candidate",
      modelName: "test-model",
      modelProvider: "test",
      payload: { ...diagnosisProposal, goalId: goalA.id, problemId: problemA.id },
      requestedByUserId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    const diagnosisA = await createDiagnosis({
      ...diagnosisProposal,
      evidenceIds: [realityA.evidenceId],
      goalId: goalA.id,
      problemId: problemA.id,
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });

    await createAiSuggestion({
      evidenceIds: diagnosisA.evidenceIds,
      kind: "design_candidate",
      modelName: "test-model",
      modelProvider: "test",
      payload: {
        ...designProposal,
        diagnosisId: diagnosisA.id,
        goalId: goalA.id,
        problemId: problemA.id,
      },
      requestedByUserId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    const revised = await createDesign({
      ...designProposal,
      diagnosisId: diagnosisA.id,
      goalId: goalA.id,
      machineChange:
        "Give one named owner default authority, with an explicit escalation boundary for exceptional cases.",
      problemId: problemA.id,
      userId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });
    assert.equal(revised.design.acceptanceState, "revised");
    assert.match(revised.design.machineChange, /escalation boundary/i);

    await createAiSuggestion({
      evidenceIds: [realityB.evidenceId],
      kind: "design_candidate",
      modelName: "test-model",
      modelProvider: "test",
      payload: {
        ...designProposal,
        diagnosisId: diagnosisA.id,
        goalId: goalB.id,
        problemId: problemB.id,
      },
      requestedByUserId: accountB.userId,
      workspaceId: accountB.workspaceId,
    });
    const designsBBefore = await countRows("designs", accountB.workspaceId);
    const actionsBBefore = await countRows("execution_actions", accountB.workspaceId);
    await assert.rejects(
      createDesign({
        ...designProposal,
        diagnosisId: diagnosisA.id,
        goalId: goalB.id,
        problemId: problemB.id,
        userId: accountB.userId,
        workspaceId: accountB.workspaceId,
      })
    );
    assert.equal(await countRows("designs", accountB.workspaceId), designsBBefore);
    assert.equal(await countRows("execution_actions", accountB.workspaceId), actionsBBefore);

    const outcomesBBefore = await countRows("outcomes", accountB.workspaceId);
    const evidenceBBefore = await countRows("evidence_records", accountB.workspaceId);
    await assert.rejects(
      createOutcome({
        actualResult: "A foreign Design must never produce Reality in workspace B.",
        comparison: "unclear",
        designId: revised.design.id,
        userId: accountB.userId,
        workspaceId: accountB.workspaceId,
      })
    );
    assert.equal(await countRows("outcomes", accountB.workspaceId), outcomesBBefore);
    assert.equal(await countRows("evidence_records", accountB.workspaceId), evidenceBBefore);

    for (const action of revised.actions) {
      await setActionStatus({
        actionId: action.id,
        status: "completed",
        userId: accountA.userId,
        workspaceId: accountA.workspaceId,
      });
    }
    assert.equal(
      (await getDesign(accountA.workspaceId, revised.design.id))?.lifecycleState,
      "active",
      "completing Actions alone must not imply the Design worked"
    );

    const activities = await db()`
      SELECT event_type
      FROM activity_events
      WHERE workspace_id = ${accountA.workspaceId}::uuid
    `;
    assert.ok(activities.some((row) => row.event_type === "design.revised"));
  } finally {
    await resetDatabase();
    await closeDatabaseForTests();
  }
});
