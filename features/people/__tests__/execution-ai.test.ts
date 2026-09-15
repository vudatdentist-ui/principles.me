import assert from "node:assert/strict";
import test from "node:test";
import {
  fallbackDiagnosisProposal,
  parseDiagnosisProposal,
} from "../execution-ai";

test("Diagnosis proposal normalizes array evidence and numeric confidence strings", () => {
  const proposal = parseDiagnosisProposal({
    alternativeHypotheses: ["Capability gap", "Competing priorities"],
    confidence: "0.64",
    contradictingEvidence: ["Responsibilities were discussed previously."],
    proximateCause: "Decision authority is still ambiguous.",
    rootCauseHypothesis:
      "Routine decisions do not have an explicit owner with default authority.",
    supportingEvidence: [
      "Three routine decisions waited for founder approval.",
      "The same pattern repeated after responsibilities were discussed.",
    ],
    symptom: "Routine operating decisions wait for the founder.",
    uncertainty: "The current evidence does not rule out a capability gap.",
  });

  assert.equal(proposal.confidence, 0.64);
  assert.equal(
    proposal.supportingEvidence,
    "Three routine decisions waited for founder approval.\nThe same pattern repeated after responsibilities were discussed."
  );
  assert.equal(
    proposal.alternativeHypotheses,
    "Capability gap\nCompeting priorities"
  );
});

test("Diagnosis fallback never invents a root cause when providers fail", () => {
  const proposal = fallbackDiagnosisProposal({
    evidence: [
      {
        content: "Three routine decisions waited for founder approval this week.",
        title: "Accepted reality",
      },
    ],
    problemStatement: "The founder remains a routine operating bottleneck.",
  });

  assert.equal(proposal.confidence, null);
  assert.equal(proposal.modelProvider, "deterministic-safety-fallback");
  assert.match(proposal.rootCauseHypothesis, /insufficient/i);
  assert.match(proposal.uncertainty, /high/i);
  assert.match(proposal.supportingEvidence, /Accepted reality/);
});
