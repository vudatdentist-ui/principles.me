import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPrincipleCandidate,
  normalizePrincipleLesson,
  type PrincipleCandidateSignal,
} from "../candidate";

const reviewedAt = new Date("2026-08-21T10:00:00.000Z");
const lesson = "Preserve optionality when uncertainty is high.";

function signal(
  decisionId: string,
  outcomeId: string,
  value = lesson
): PrincipleCandidateSignal {
  return {
    decisionId,
    lesson: value,
    outcomeId,
    reviewedAt,
  };
}

test("normalizes equivalent lesson punctuation, case, and whitespace", () => {
  assert.equal(
    normalizePrincipleLesson("  Preserve OPTIONALITY, when uncertainty is high! "),
    normalizePrincipleLesson(lesson)
  );
});

test("one reviewed signal produces no Principle Candidate", () => {
  const result = collectPrincipleCandidate({
    lesson,
    signals: [signal("decision-1", "outcome-1")],
  });

  assert.deepEqual(result, {
    error: {
      code: "insufficient_repeated_signal",
      requiredDistinctDecisions: 2,
      supportingDecisionCount: 1,
      supportingOutcomeCount: 1,
    },
    ok: false,
  });
});

test("multiple outcomes from one decision are still insufficient", () => {
  const result = collectPrincipleCandidate({
    lesson,
    signals: [
      signal("decision-1", "outcome-1"),
      signal("decision-1", "outcome-2"),
    ],
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.supportingDecisionCount, 1);
    assert.equal(result.error.supportingOutcomeCount, 2);
  }
});

test("repeated reviewed signals across distinct decisions produce a candidate", () => {
  const signals = [
    signal("decision-2", "outcome-2", "preserve optionality when uncertainty is HIGH"),
    signal("decision-1", "outcome-1"),
    {
      ...signal("decision-3", "outcome-3"),
      reviewedAt: null,
    },
  ];
  const result = collectPrincipleCandidate({ lesson, signals });

  assert.deepEqual(result, {
    ok: true,
    value: {
      confidence: "medium",
      rationale:
        "Repeated review signal across 2 distinct reviewed decisions and 2 outcomes.",
      statement: lesson,
      supportingDecisionIds: ["decision-1", "decision-2"],
      supportingOutcomeIds: ["outcome-1", "outcome-2"],
    },
  });
  assert.equal(signals.length, 3);
});
