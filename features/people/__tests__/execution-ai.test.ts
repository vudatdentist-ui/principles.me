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

test("Diagnosis fallback defaults to Vietnamese without inventing a root cause", () => {
  const proposal = fallbackDiagnosisProposal({
    evidence: [
      {
        content: "Ba quyết định vận hành thường ngày vẫn chờ người sáng lập phê duyệt.",
        title: "Thực tế đã xác nhận",
      },
    ],
    problemStatement: "Người sáng lập vẫn là nút thắt trong vận hành thường ngày.",
  });

  assert.equal(proposal.confidence, null);
  assert.equal(proposal.modelProvider, "deterministic-safety-fallback");
  assert.match(proposal.rootCauseHypothesis, /chưa đủ/i);
  assert.match(proposal.uncertainty, /chưa chắc chắn/i);
  assert.match(proposal.supportingEvidence, /Thực tế đã xác nhận/);
});

test("Diagnosis fallback preserves English when English is selected", () => {
  const proposal = fallbackDiagnosisProposal({
    evidence: [],
    locale: "en",
    problemStatement: "The founder remains a routine operating bottleneck.",
  });

  assert.match(proposal.rootCauseHypothesis, /insufficient/i);
  assert.match(proposal.uncertainty, /uncertainty is high/i);
  assert.match(proposal.supportingEvidence, /No supporting evidence/i);
});
