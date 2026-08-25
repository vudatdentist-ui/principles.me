import assert from "node:assert/strict";
import test from "node:test";
import { projectLearningState } from "../projection";

test("Learning projection removes workspace, AI provenance and semantic join IDs", () => {
  const projected = projectLearningState({
    historyCount: 2,
    patterns: [
      {
        acceptanceState: "accepted",
        appliedAt: null,
        appliedRevision: null,
        cases: [
          {
            diagnosis: "A root-cause hypothesis.",
            design: "A machine change.",
            expected: "Expected reality.",
            goal: "Desired reality.",
            goalId: "private-goal-id",
            happened: "Observed history.",
            learning: "A learning.",
            outcome: null,
            phase: "reflection",
            problem: "A Problem.",
            problemId: "private-problem-id",
            recurrenceNote: null,
            recurring: true,
            reflectionId: "reflection-1",
            surprise: null,
          },
          {
            diagnosis: "A root-cause hypothesis.",
            design: "A machine change.",
            expected: "Expected reality.",
            goal: "Desired reality.",
            goalId: "private-goal-id",
            happened: "Observed outcome.",
            learning: "A second learning.",
            outcome: {
              actualResult: "Observed outcome.",
              comparison: "improved",
              expectedResult: "Expected reality.",
            },
            phase: "outcome_review",
            problem: "A Problem.",
            problemId: "private-problem-id",
            recurrenceNote: null,
            recurring: false,
            reflectionId: "reflection-2",
            surprise: "A surprise.",
          },
        ],
        confidence: 0.7,
        contradictingEvidence: "Counter-evidence.",
        id: "pattern-1",
        implication: "Test the machine rule again.",
        kind: "design_learning",
        lifecycleState: "active",
        originSuggestionId: "private-ai-suggestion-id",
        principleRevisionProposal: {
          currentRationale: "Current rationale.",
          currentRule: "Current rule.",
          currentTrigger: "Current trigger.",
          principleId: "principle-1",
          proposedRationale: "Proposed rationale.",
          proposedRule: "Proposed rule.",
          proposedTrigger: "Proposed trigger.",
        },
        statement: "A correctable Pattern.",
        supportingEvidence: "Supporting evidence.",
        uncertainty: "Uncertainty.",
        workspaceId: "private-workspace-id",
      },
    ],
  });

  const raw = JSON.stringify(projected);
  assert.equal(raw.includes("private-workspace-id"), false);
  assert.equal(raw.includes("private-ai-suggestion-id"), false);
  assert.equal(raw.includes("private-goal-id"), false);
  assert.equal(raw.includes("private-problem-id"), false);
  assert.equal(projected.patterns[0]?.cases.length, 2);
  assert.equal(projected.patterns[0]?.principleRevisionProposal?.principleId, "principle-1");
});
