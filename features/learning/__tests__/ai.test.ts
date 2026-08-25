import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveLearningModelResult,
  type LearningModelResult,
} from "../ai";
import type { LearningCaseRecord } from "../contracts";

function learningCase(input: {
  problemId: string;
  reflectionId: string;
}): LearningCaseRecord {
  return {
    diagnosis: null,
    design: null,
    expected: "Work should move without waiting.",
    goal: "Build an independent company.",
    goalId: "goal-1",
    happened: "Work waited.",
    learning: "Authority may be ambiguous.",
    outcome: null,
    phase: "reflection",
    problem: "Routine work waits for me.",
    problemId: input.problemId,
    recurrenceNote: null,
    recurring: true,
    reflectionId: input.reflectionId,
    surprise: "Discussion did not change behavior.",
  };
}

const principles = [
  {
    id: "principle-1",
    rationale: "Waiting suggests ambiguous authority.",
    rule: "Make authority explicit.",
    trigger: "When routine work waits",
  },
];

function modelResult(
  overrides: Partial<LearningModelResult> = {}
): LearningModelResult {
  return {
    caseKeys: ["C1", "C2"],
    confidence: 0.7,
    contradictingEvidence: "Only two cases are available.",
    implication: "Test explicit authority again.",
    kind: "design_learning",
    principleRevision: {
      principleKey: "P1",
      proposedRationale: "Observed history supports a sharper rule.",
      proposedRule: "Name the owner and authority, then verify the outcome.",
      proposedTrigger: "When routine work waits after ownership discussion",
    },
    statement: "Explicit authority changed behavior more than discussion alone.",
    supportingEvidence: "The before/after cases changed after the machine rule.",
    uncertainty: "The hypothesis needs another real-world test.",
    ...overrides,
  };
}

test("Learning model resolves only supplied ephemeral case and Principle keys", () => {
  const cases = [
    learningCase({ problemId: "problem-1", reflectionId: "reflection-1" }),
    learningCase({ problemId: "problem-1", reflectionId: "reflection-2" }),
  ];
  const resolved = resolveLearningModelResult({
    cases,
    principles,
    result: modelResult(),
  });
  assert.deepEqual(resolved.caseReflectionIds, ["reflection-1", "reflection-2"]);
  assert.equal(resolved.principleRevision?.principleId, "principle-1");

  assert.throws(
    () =>
      resolveLearningModelResult({
        cases,
        principles,
        result: modelResult({ caseKeys: ["C1", "C99"] }),
      }),
    /unknown case/i
  );
  assert.throws(
    () =>
      resolveLearningModelResult({
        cases,
        principles,
        result: modelResult({ caseKeys: ["C1", "C1"] }),
      }),
    /two distinct cases/i
  );
  assert.throws(
    () =>
      resolveLearningModelResult({
        cases,
        principles,
        result: modelResult({
          principleRevision: {
            principleKey: "P9",
            proposedRationale: "Unknown Principle must fail.",
            proposedRule: "Unknown Principle must fail.",
            proposedTrigger: "Unknown Principle must fail.",
          },
        }),
      }),
    /unknown Principle/i
  );
});

test("recurring_pattern requires at least two distinct Problems", () => {
  const sameProblemCases = [
    learningCase({ problemId: "problem-1", reflectionId: "reflection-1" }),
    learningCase({ problemId: "problem-1", reflectionId: "reflection-2" }),
  ];
  assert.throws(
    () =>
      resolveLearningModelResult({
        cases: sameProblemCases,
        principles,
        result: modelResult({ kind: "recurring_pattern" }),
      }),
    /two distinct Problems/i
  );

  const distinctProblemCases = [
    learningCase({ problemId: "problem-1", reflectionId: "reflection-1" }),
    learningCase({ problemId: "problem-2", reflectionId: "reflection-2" }),
  ];
  const resolved = resolveLearningModelResult({
    cases: distinctProblemCases,
    principles,
    result: modelResult({ kind: "recurring_pattern" }),
  });
  assert.equal(resolved.kind, "recurring_pattern");
});
