import assert from "node:assert/strict";
import test from "node:test";
import { projectPeopleState } from "../projection";

test("People browser state strips internal evidence and workspace identifiers", () => {
  const projected = projectPeopleState({
    goals: [
      {
        acceptedTradeoffs: "A trade-off",
        desiredState: "A desired reality",
        id: "goal-1",
        measures: "",
        nonNegotiables: "A boundary",
        status: "chosen",
        successConditions: "A success condition",
        whyItMatters: "A reason",
        workspaceId: "workspace-private",
      },
    ],
    principles: [
      {
        acceptanceState: "pending",
        confidence: 0.7,
        evidenceIds: ["evidence-private"],
        id: "principle-1",
        lifecycleState: "candidate",
        originReflectionId: "reflection-1",
        rationale: "Because.",
        rule: "Do the thing.",
        trigger: "When this happens",
      },
    ],
    problems: [
      {
        evidenceIds: ["evidence-private"],
        gap: "A gap",
        goalId: "goal-1",
        id: "problem-1",
        statement: "A problem",
        status: "recognized",
      },
    ],
    reality: [
      {
        evidenceId: "evidence-private",
        goalId: "goal-1",
        observationId: "observation-1",
        observedAt: "2026-08-24T00:00:00.000Z",
        statement: "Observed reality",
      },
    ],
    reflections: [],
  });

  const serialized = JSON.stringify(projected);
  assert.equal(serialized.includes("evidence-private"), false);
  assert.equal(serialized.includes("workspace-private"), false);
  assert.deepEqual(projected.reality[0], {
    goalId: "goal-1",
    observationId: "observation-1",
    observedAt: "2026-08-24T00:00:00.000Z",
    statement: "Observed reality",
  });
});
