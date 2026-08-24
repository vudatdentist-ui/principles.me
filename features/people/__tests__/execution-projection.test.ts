import assert from "node:assert/strict";
import test from "node:test";
import { projectExecutionState } from "../execution-projection";

test("Phase 3 projection removes workspace, evidence and observation identifiers", () => {
  const projected = projectExecutionState({
    actions: [
      {
        commitment: "Change the machine.",
        completedAt: null,
        designId: "design-1",
        id: "action-1",
        position: 0,
        status: "pending",
        workspaceId: "private-workspace",
      },
    ],
    designs: [
      {
        acceptanceState: "accepted",
        diagnosisId: "diagnosis-1",
        expectedResult: "Reality changes.",
        goalId: "goal-1",
        id: "design-1",
        lifecycleState: "active",
        machineChange: "Change a decision rule.",
        problemId: "problem-1",
        rationale: "It addresses the cause.",
        successSignal: "The behavior changes.",
        workspaceId: "private-workspace",
      },
    ],
    diagnoses: [
      {
        acceptanceState: "accepted",
        alternativeHypotheses: "Another cause may exist.",
        confidence: 0.6,
        contradictingEvidence: "One case points elsewhere.",
        evidenceIds: ["private-evidence-id"],
        goalId: "goal-1",
        id: "diagnosis-1",
        problemId: "problem-1",
        proximateCause: "A proximate cause.",
        rootCauseHypothesis: "A root cause hypothesis.",
        supportingEvidence: "Repeated cases support it.",
        symptom: "A visible symptom.",
        uncertainty: "Evidence remains incomplete.",
        workspaceId: "private-workspace",
      },
    ],
    outcomeReviews: [
      {
        expected: "Reality changes.",
        goalId: "goal-1",
        happened: "Reality changed.",
        id: "reflection-1",
        learning: "The machine change mattered.",
        outcomeId: "outcome-1",
        problemId: "problem-1",
        surprise: null,
      },
    ],
    outcomes: [
      {
        actualResult: "Reality changed.",
        comparison: "improved",
        designId: "design-1",
        diagnosisId: "diagnosis-1",
        evidenceId: "private-outcome-evidence",
        expectedResult: "Reality changes.",
        goalId: "goal-1",
        id: "outcome-1",
        observationId: "private-observation-id",
        observedAt: "2026-08-24T00:00:00.000Z",
        problemId: "problem-1",
        workspaceId: "private-workspace",
      },
    ],
  });

  const raw = JSON.stringify(projected);
  assert.equal(raw.includes("private-workspace"), false);
  assert.equal(raw.includes("private-evidence-id"), false);
  assert.equal(raw.includes("private-outcome-evidence"), false);
  assert.equal(raw.includes("private-observation-id"), false);
  assert.equal(projected.diagnoses[0]?.rootCauseHypothesis, "A root cause hypothesis.");
  assert.equal(projected.outcomes[0]?.comparison, "improved");
});
