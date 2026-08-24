import assert from "node:assert/strict";
import test from "node:test";
import {
  fallbackGoalDiscovery,
  shouldUseGoalDiscoveryProvider,
} from "../ai";
import type { GoalDraft } from "../contracts";

const complete: GoalDraft = {
  acceptedTradeoffs: "I will deprioritize low-value side projects.",
  desiredState: "Build a company that can operate without depending on me day to day.",
  measures: "Two weeks of normal operation without my intervention.",
  nonNegotiables: "Do not sacrifice health or family time.",
  successConditions: "The team can make routine operating decisions without waiting for me.",
  whyItMatters: "I want the company to compound without making me its bottleneck.",
};

test("Goal Discovery asks exactly one highest-priority unresolved question", () => {
  const result = fallbackGoalDiscovery({
    ...complete,
    acceptedTradeoffs: "",
    successConditions: "",
  });
  assert.deepEqual(result, {
    field: "successConditions",
    kind: "question",
    question: "What would make you say this desired reality is genuinely true?",
  });
});

test("Goal Discovery is ready after required discovery fields even without a measure", () => {
  assert.deepEqual(fallbackGoalDiscovery({ ...complete, measures: "" }), {
    kind: "ready",
    summary: complete.desiredState,
  });
});

test("Goal Discovery does not call the provider after required fields are complete", () => {
  const previous = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "configured";
  try {
    assert.equal(
      shouldUseGoalDiscoveryProvider({ ...complete, measures: "" }),
      false
    );
  } finally {
    if (previous === undefined) {
      delete process.env.DEEPSEEK_API_KEY;
    } else {
      process.env.DEEPSEEK_API_KEY = previous;
    }
  }
});

test("Goal Discovery uses deterministic fallback without an API key", () => {
  const previous = process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  try {
    assert.equal(
      shouldUseGoalDiscoveryProvider({ ...complete, successConditions: "" }),
      false
    );
  } finally {
    if (previous === undefined) {
      delete process.env.DEEPSEEK_API_KEY;
    } else {
      process.env.DEEPSEEK_API_KEY = previous;
    }
  }
});
