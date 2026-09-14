import assert from "node:assert/strict";
import test from "node:test";
import type { PeopleState } from "@/features/people/contracts";
import type { ExecutionState } from "@/features/people/execution-contracts";
import { projectEvolutionState } from "../projection";

function peopleState(): PeopleState {
  return {
    goals: [
      {
        acceptedTradeoffs: "",
        desiredState: "A team that can run routine decisions without me.",
        id: "goal-1",
        measures: "",
        nonNegotiables: "Protect customer trust.",
        status: "chosen",
        successConditions: "Routine decisions no longer wait for me.",
        whyItMatters: "The company should not depend on one person.",
        workspaceId: "workspace-private",
      },
    ],
    principles: [],
    problems: [
      {
        evidenceIds: ["problem-evidence"],
        gap: "Routine decisions still wait for the founder.",
        goalId: "goal-1",
        id: "problem-1",
        statement: "The founder remains the routine decision bottleneck.",
        status: "recognized",
      },
    ],
    reality: [
      {
        evidenceId: "reality-evidence",
        goalId: "goal-1",
        observedAt: "2026-09-14T09:00:00.000Z",
        observationId: "observation-1",
        statement: "Three routine decisions waited for founder approval this week.",
      },
    ],
    reflections: [],
  };
}

function executionState(statuses: Array<"completed" | "pending" | "cancelled">): ExecutionState {
  return {
    actions: statuses.map((status, position) => ({
      commitment: `Action ${position + 1}`,
      completedAt: status === "completed" ? "2026-09-14T10:00:00.000Z" : null,
      designId: "design-1",
      id: `action-${position + 1}`,
      position,
      status,
      workspaceId: "workspace-private",
    })),
    designs: [
      {
        acceptanceState: "accepted",
        diagnosisId: "diagnosis-1",
        expectedResult: "Routine decisions move without founder approval.",
        goalId: "goal-1",
        id: "design-1",
        lifecycleState: "active",
        machineChange: "Give routine decisions explicit owners and thresholds.",
        problemId: "problem-1",
        rationale: "Decision rights remove the bottleneck at its cause.",
        successSignal: "Routine decisions close without founder intervention.",
        workspaceId: "workspace-private",
      },
    ],
    diagnoses: [
      {
        acceptanceState: "accepted",
        alternativeHypotheses: null,
        confidence: 0.7,
        contradictingEvidence: null,
        evidenceIds: ["diagnosis-evidence"],
        goalId: "goal-1",
        id: "diagnosis-1",
        problemId: "problem-1",
        proximateCause: "Decision rights are unclear.",
        rootCauseHypothesis: "The operating system routes routine decisions to the founder.",
        supportingEvidence: "The same decisions repeatedly escalate.",
        symptom: "Routine work stalls.",
        uncertainty: "A few decisions may still require founder judgment.",
        workspaceId: "workspace-private",
      },
    ],
    outcomeReviews: [],
    outcomes: [],
  };
}

test("Evolution stays in Do when every execution action is cancelled", () => {
  const state = projectEvolutionState(peopleState(), executionState(["cancelled", "cancelled"]));

  assert.equal(state.stage, "do");
  assert.equal(state.fiveSteps.current, "do");
  assert.equal(state.nextAction.kind, "do_design");
});

test("Evolution can evaluate an outcome after at least one action was completed", () => {
  const state = projectEvolutionState(peopleState(), executionState(["completed", "cancelled"]));

  assert.equal(state.stage, "outcome");
  assert.equal(state.fiveSteps.current, null);
  assert.equal(state.nextAction.kind, "record_outcome");
});
