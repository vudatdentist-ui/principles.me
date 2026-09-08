import assert from "node:assert/strict";
import test from "node:test";
import type { PeopleState } from "@/features/people/contracts";
import type { ExecutionState } from "@/features/people/execution-contracts";
import { projectEvolutionState } from "../projection";

function emptyPeopleState(): PeopleState {
  return {
    goals: [],
    principles: [],
    problems: [],
    reality: [],
    reflections: [],
  };
}

function emptyExecutionState(): ExecutionState {
  return {
    actions: [],
    designs: [],
    diagnoses: [],
    outcomeReviews: [],
    outcomes: [],
  };
}

function fullPeopleState(): PeopleState {
  return {
    goals: [
      {
        acceptedTradeoffs: "",
        desiredState: "Unrelated paused goal",
        id: "goal-other",
        measures: "",
        nonNegotiables: "",
        status: "paused",
        successConditions: "",
        whyItMatters: "",
        workspaceId: "workspace-private",
      },
      {
        acceptedTradeoffs: "Comfort",
        desiredState: "A life centered on meaningful work and community.",
        id: "goal-active",
        measures: "",
        nonNegotiables: "Protect relationships",
        status: "chosen",
        successConditions: "Community survives pressure",
        whyItMatters: "It is the life worth building.",
        workspaceId: "workspace-private",
      },
    ],
    principles: [
      {
        acceptanceState: "accepted",
        confidence: 0.7,
        evidenceIds: ["principle-evidence-private"],
        id: "principle-active",
        lifecycleState: "testing",
        originReflectionId: "reflection-outcome",
        rationale: "The machine should absorb pressure.",
        rule: "Change the machine before sacrificing the relationship.",
        trigger: "When financial pressure threatens community",
      },
    ],
    problems: [
      {
        evidenceIds: ["problem-evidence-other"],
        gap: "Unrelated gap",
        goalId: "goal-other",
        id: "problem-other",
        statement: "Unrelated problem",
        status: "recognized",
      },
      {
        evidenceIds: ["problem-evidence-private"],
        gap: "Pressure causes community to be deprioritized.",
        goalId: "goal-active",
        id: "problem-active",
        statement: "Community loses when financial pressure rises.",
        status: "recognized",
      },
    ],
    reality: [
      {
        evidenceId: "reality-evidence-other",
        goalId: "goal-other",
        observedAt: "2026-09-08T10:00:00.000Z",
        observationId: "observation-other",
        statement: "Unrelated reality",
      },
      {
        evidenceId: "reality-evidence-private",
        goalId: "goal-active",
        observedAt: "2026-09-08T09:00:00.000Z",
        observationId: "observation-active",
        statement: "Money still organizes important choices.",
      },
    ],
    reflections: [
      {
        expected: "Community would hold.",
        goalId: "goal-active",
        happened: "We withdrew under pressure.",
        id: "reflection-outcome",
        learning: "The machine created the trade-off.",
        problemId: "problem-active",
        recurrenceNote: null,
        recurring: true,
        status: "completed",
        surprise: "The same pattern returned.",
      },
    ],
  };
}

function fullExecutionState(): ExecutionState {
  return {
    actions: [
      {
        commitment: "Unrelated action",
        completedAt: null,
        designId: "design-other",
        id: "action-other",
        position: 0,
        status: "pending",
        workspaceId: "workspace-private",
      },
      {
        commitment: "Test a financial floor.",
        completedAt: "2026-09-08T09:30:00.000Z",
        designId: "design-active",
        id: "action-2",
        position: 1,
        status: "completed",
        workspaceId: "workspace-private",
      },
      {
        commitment: "Define the community boundary.",
        completedAt: "2026-09-08T09:20:00.000Z",
        designId: "design-active",
        id: "action-1",
        position: 0,
        status: "completed",
        workspaceId: "workspace-private",
      },
    ],
    designs: [
      {
        acceptanceState: "accepted",
        diagnosisId: "diagnosis-other",
        expectedResult: "Other result",
        goalId: "goal-other",
        id: "design-other",
        lifecycleState: "active",
        machineChange: "Other design",
        problemId: "problem-other",
        rationale: "Other rationale",
        successSignal: "Other signal",
        workspaceId: "workspace-private",
      },
      {
        acceptanceState: "accepted",
        diagnosisId: "diagnosis-active",
        expectedResult: "Community remains protected under pressure.",
        goalId: "goal-active",
        id: "design-active",
        lifecycleState: "evaluated",
        machineChange: "Build a financial floor that protects community commitments.",
        problemId: "problem-active",
        rationale: "It changes the cause instead of tolerating the symptom.",
        successSignal: "Financial setbacks no longer trigger withdrawal.",
        workspaceId: "workspace-private",
      },
    ],
    diagnoses: [
      {
        acceptanceState: "accepted",
        alternativeHypotheses: null,
        confidence: 0.4,
        contradictingEvidence: null,
        evidenceIds: ["diagnosis-evidence-other"],
        goalId: "goal-other",
        id: "diagnosis-other",
        problemId: "problem-other",
        proximateCause: "Other cause",
        rootCauseHypothesis: "Other root cause",
        supportingEvidence: null,
        symptom: "Other symptom",
        uncertainty: null,
        workspaceId: "workspace-private",
      },
      {
        acceptanceState: "accepted",
        alternativeHypotheses: "The stated Dream may also need refinement.",
        confidence: 0.72,
        contradictingEvidence: "One recent case held up better.",
        evidenceIds: ["diagnosis-evidence-private"],
        goalId: "goal-active",
        id: "diagnosis-active",
        problemId: "problem-active",
        proximateCause: "Short-term income pressure.",
        rootCauseHypothesis: "The current machine makes security compete with community.",
        supportingEvidence: "The same trade-off appears under pressure.",
        symptom: "Community is deprioritized.",
        uncertainty: "The evidence is still bounded.",
        workspaceId: "workspace-private",
      },
    ],
    outcomeReviews: [
      {
        expected: "Community remains protected under pressure.",
        goalId: "goal-active",
        happened: "The trade-off weakened but did not disappear.",
        id: "reflection-outcome",
        learning: "The financial design matters, but the rule needs testing again.",
        outcomeId: "outcome-active",
        problemId: "problem-active",
        surprise: "One withdrawal pattern still appeared.",
      },
    ],
    outcomes: [
      {
        actualResult: "Unrelated outcome",
        comparison: "unclear",
        designId: "design-other",
        diagnosisId: "diagnosis-other",
        evidenceId: "outcome-evidence-other",
        expectedResult: "Other result",
        goalId: "goal-other",
        id: "outcome-other",
        observationId: "outcome-observation-other",
        observedAt: "2026-09-08T11:00:00.000Z",
        problemId: "problem-other",
        workspaceId: "workspace-private",
      },
      {
        actualResult: "Community held better, with one repeated withdrawal.",
        comparison: "mixed",
        designId: "design-active",
        diagnosisId: "diagnosis-active",
        evidenceId: "outcome-evidence-private",
        expectedResult: "Community remains protected under pressure.",
        goalId: "goal-active",
        id: "outcome-active",
        observationId: "outcome-observation-private",
        observedAt: "2026-09-08T10:30:00.000Z",
        problemId: "problem-active",
        workspaceId: "workspace-private",
      },
    ],
  };
}

test("Evolution projection starts with Dream and a clear next action", () => {
  const state = projectEvolutionState(emptyPeopleState(), emptyExecutionState());

  assert.equal(state.stage, "dream");
  assert.equal(state.fiveSteps.current, "goal");
  assert.equal(state.nextAction.kind, "clarify_dream");
  assert.equal(state.nextAction.prompt, "What do you really want?");
});

test("Evolution projection keeps Reality outside the numbered 5 Steps", () => {
  const people = emptyPeopleState();
  people.goals.push({
    acceptedTradeoffs: "",
    desiredState: "Build a meaningful life.",
    id: "goal-1",
    measures: "",
    nonNegotiables: "",
    status: "chosen",
    successConditions: "",
    whyItMatters: "",
    workspaceId: "workspace-private",
  });

  const state = projectEvolutionState(people, emptyExecutionState());

  assert.equal(state.stage, "reality");
  assert.equal(state.fiveSteps.steps[0]?.status, "complete");
  assert.equal(state.fiveSteps.current, "problem");
  assert.equal(state.nextAction.kind, "observe_reality");
});

test("Evolution projection follows one coherent lineage and strips private identifiers", () => {
  const state = projectEvolutionState(fullPeopleState(), fullExecutionState());

  assert.equal(state.dream?.id, "goal-active");
  assert.equal(state.reality?.observationId, "observation-active");
  assert.equal(state.problem?.id, "problem-active");
  assert.equal(state.diagnosis?.id, "diagnosis-active");
  assert.equal(state.design?.id, "design-active");
  assert.deepEqual(
    state.actions.map((item) => item.id),
    ["action-1", "action-2"]
  );
  assert.equal(state.outcome?.id, "outcome-active");
  assert.equal(state.reflection?.id, "reflection-outcome");
  assert.equal(state.reflection?.kind, "outcome_review");
  assert.equal(state.principle?.id, "principle-active");
  assert.equal(state.stage, "principle");
  assert.equal(state.fiveSteps.current, null);
  assert.equal(state.nextAction.kind, "continue_cycle");
  assert.equal(state.attention[0]?.kind, "principle_under_test");

  const raw = JSON.stringify(state);
  assert.equal(raw.includes("workspace-private"), false);
  assert.equal(raw.includes("reality-evidence-private"), false);
  assert.equal(raw.includes("problem-evidence-private"), false);
  assert.equal(raw.includes("diagnosis-evidence-private"), false);
  assert.equal(raw.includes("outcome-evidence-private"), false);
  assert.equal(raw.includes("outcome-observation-private"), false);
});

test("Evolution projection requires Outcome reflection even when an older Reflection exists", () => {
  const execution = fullExecutionState();
  execution.outcomeReviews = [];

  const state = projectEvolutionState(fullPeopleState(), execution);

  assert.equal(state.stage, "reflection");
  assert.equal(state.nextAction.kind, "reflect_on_pain");
  assert.equal(state.attention[0]?.kind, "pain_needs_reflection");
  assert.equal(state.reflection?.kind, "reflection");
});

test("Evolution projection does not let legacy Reflection skip missing Diagnosis", () => {
  const execution = fullExecutionState();
  execution.diagnoses = [];
  execution.designs = [];
  execution.actions = [];
  execution.outcomes = [];
  execution.outcomeReviews = [];

  const state = projectEvolutionState(fullPeopleState(), execution);

  assert.equal(state.reflection?.id, "reflection-outcome");
  assert.equal(state.stage, "diagnosis");
  assert.equal(state.fiveSteps.current, "diagnosis");
  assert.equal(state.nextAction.kind, "diagnose_problem");
});
