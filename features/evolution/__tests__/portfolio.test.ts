import assert from "node:assert/strict";
import test from "node:test";
import type { PeopleState } from "@/features/people/contracts";
import type { ExecutionState } from "@/features/people/execution-contracts";
import { projectEvolutionState } from "../projection";

const people: PeopleState = {
  goals: [
    {
      acceptedTradeoffs: "",
      desiredState: "Build an independent company.",
      id: "goal-company",
      measures: "",
      nonNegotiables: "",
      status: "chosen",
      successConditions: "",
      whyItMatters: "",
      workspaceId: "workspace-private",
    },
    {
      acceptedTradeoffs: "",
      desiredState: "Build durable health.",
      id: "goal-health",
      measures: "",
      nonNegotiables: "",
      status: "chosen",
      successConditions: "",
      whyItMatters: "",
      workspaceId: "workspace-private",
    },
  ],
  principles: [],
  problems: [],
  reality: [],
  reflections: [],
};

const execution: ExecutionState = {
  actions: [],
  designs: [],
  diagnoses: [],
  outcomeReviews: [],
  outcomes: [],
};

test("Evolution projection exposes all active goals and lets the caller select one", () => {
  const state = projectEvolutionState(people, execution, { goalId: "goal-company" });

  assert.equal(state.goals.length, 2);
  assert.deepEqual(
    state.goals.map((goal) => goal.id),
    ["goal-company", "goal-health"]
  );
  assert.equal(state.selectedGoalId, "goal-company");
  assert.equal(state.dream?.desiredState, "Build an independent company.");
  assert.equal(state.stage, "reality");
  assert.equal(state.goals[1]?.stage, "reality");
  assert.equal(JSON.stringify(state).includes("workspace-private"), false);
});

test("New-goal mode preserves the portfolio while opening a blank evolution lane", () => {
  const state = projectEvolutionState(people, execution, { newGoal: true });

  assert.equal(state.goals.length, 2);
  assert.equal(state.selectedGoalId, null);
  assert.equal(state.dream, null);
  assert.equal(state.stage, "dream");
  assert.equal(state.nextAction.kind, "clarify_dream");
});
