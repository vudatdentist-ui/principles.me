import assert from "node:assert/strict";
import test from "node:test";
import {
  summarizeProductEvents,
  type ProductEvent,
} from "../product-insights";

function event(
  workspaceId: string,
  eventType: string,
  happenedAt: string,
): ProductEvent {
  return { eventType, happenedAt, workspaceId };
}

test("summarizes activation, return reflection and full learning loops without content", () => {
  const events = [
    event("a", "workspace.created", "2026-09-01T00:00:00.000Z"),
    event("a", "goal.chosen", "2026-09-01T00:10:00.000Z"),
    event("a", "reality.observed", "2026-09-01T00:20:00.000Z"),
    event("a", "problem.recognized", "2026-09-01T00:30:00.000Z"),
    event("a", "diagnosis.accepted", "2026-09-01T00:40:00.000Z"),
    event("a", "design.accepted", "2026-09-01T00:50:00.000Z"),
    event("a", "action.completed", "2026-09-02T00:00:00.000Z"),
    event("a", "outcome.recorded", "2026-09-03T00:00:00.000Z"),
    event("a", "outcome.reviewed", "2026-09-03T00:10:00.000Z"),
    event("a", "reflection.completed", "2026-09-03T00:10:00.000Z"),
    event("a", "reflection.completed", "2026-09-10T00:10:00.000Z"),
    event("a", "principle.accepted", "2026-09-10T00:20:00.000Z"),
    event("b", "workspace.created", "2026-09-02T00:00:00.000Z"),
    event("b", "goal.chosen", "2026-09-02T00:10:00.000Z"),
  ];

  const result = summarizeProductEvents(events, {
    from: "2026-09-01T00:00:00.000Z",
    to: "2026-09-30T00:00:00.000Z",
  });

  assert.equal(result.newWorkspaces, 2);
  assert.equal(result.activatedWorkspaces, 1);
  assert.equal(result.activationRate, 0.5);
  assert.equal(result.medianSecondsToFirstProblem, 1800);
  assert.equal(result.workspacesWithReflection, 1);
  assert.equal(result.repeatReflectionWorkspaces, 1);
  assert.equal(result.reflectionReturnRate, 1);
  assert.equal(result.fullLearningLoops, 1);
  assert.equal(result.learningLoopRate, 1);
  assert.equal(result.stageReach.problem, 1);
  assert.equal(result.stageReach.goal, 2);
});

test("does not count an out-of-order sequence as activation", () => {
  const result = summarizeProductEvents(
    [
      event("a", "workspace.created", "2026-09-01T00:00:00.000Z"),
      event("a", "reality.observed", "2026-09-01T00:10:00.000Z"),
      event("a", "goal.chosen", "2026-09-01T00:20:00.000Z"),
      event("a", "problem.recognized", "2026-09-01T00:30:00.000Z"),
    ],
    {
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-30T00:00:00.000Z",
    },
  );
  assert.equal(result.activatedWorkspaces, 0);
  assert.equal(result.activationRate, 0);
});
