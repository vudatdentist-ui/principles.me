import assert from "node:assert/strict";
import test from "node:test";
import {
  DecisionModelOutputError,
  parseDecisionAudit,
} from "../decision-brief-parser";

test("ungrounded audits cannot accept the candidate", () => {
  assert.throws(
    () =>
      parseDecisionAudit({
        decision: "accept",
        issues: ["Material factual support is missing."],
        revisionInstructions: ["Remove or qualify unsupported claims."],
        verdict: "ungrounded",
      }),
    (error: unknown) => {
      assert.ok(error instanceof DecisionModelOutputError);
      assert.equal(error.code, "invalid_model_output");
      return true;
    }
  );
});

test("ungrounded audits may request the single revision pass", () => {
  const audit = parseDecisionAudit({
    decision: "revise",
    issues: ["Material factual support is missing."],
    revisionInstructions: ["Remove or qualify unsupported claims."],
    verdict: "ungrounded",
  });

  assert.equal(audit.decision, "revise");
  assert.equal(audit.verdict, "ungrounded");
});
