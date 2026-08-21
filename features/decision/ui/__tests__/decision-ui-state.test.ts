import assert from "node:assert/strict";
import test from "node:test";
import type { DecisionBrief } from "@/features/decision/contracts";
import type { DecisionStreamEvent } from "@/features/decision/stream-events";
import {
  confidenceLabel,
  createDecisionUiState,
  decisionErrorDisplayMessage,
  invokeDecisionBriefAction,
  reduceDecisionStreamEvents,
  reduceDecisionUiState,
  safeStageStatus,
  visibleDecisionReasons,
} from "../decision-ui-state";

const source: DecisionBrief["sources"][number] = {
  chunkId: "chunk-1",
  datasetId: "dataset-1",
  documentId: "doc-1",
  key: "W1",
  observedAt: null,
  positions: [],
  provider: "web-search",
  publishedAt: "2026-08-20T08:00:00.000Z",
  retrievedAt: "2026-08-21T08:00:00.000Z",
  score: 0.9,
  sourceType: "web",
  text: "A concise source excerpt.",
  title: "Relevant source",
  url: "https://example.com/source",
};

const brief = {
  confidence: {
    explanation: "Evidence is useful but one important variable remains unknown.",
    level: "medium",
  },
  counterCase: "New information could reverse the recommendation.",
  id: "decision-1",
  nextAction: "Validate the remaining assumption before acting.",
  question: "Should we proceed with the plan?",
  reasons: [
    {
      citationKeys: ["W1"],
      id: "r1",
      kind: "fact",
      text: "Current evidence supports the first constraint.",
    },
    {
      citationKeys: [],
      id: "r2",
      kind: "inference",
      text: "A staged approach preserves optionality.",
    },
    {
      citationKeys: [],
      id: "r3",
      kind: "user-context",
      text: "The stated preference favors reversibility.",
    },
    {
      citationKeys: [],
      id: "r4",
      kind: "inference",
      text: "This fourth reason should not be primary UI copy.",
    },
  ],
  recommendation: "Proceed in a staged, reversible way.",
  review: {
    suggestedAt: null,
    trigger: "Review when the remaining assumption is resolved.",
  },
  runId: "run-1",
  schemaVersion: "1",
  sources: [source],
  unknowns: ["One material assumption is unresolved."],
  validAsOf: "2026-08-21T08:00:00.000Z",
} as DecisionBrief;

test("idle to submitting to result follows stream events", () => {
  let state = createDecisionUiState();
  assert.equal(state.phase, "idle");

  state = reduceDecisionUiState(state, { type: "submitted" });
  assert.equal(state.phase, "submitting");
  assert.equal(state.status, "Preparing your decision brief.");

  const events = [
    { runId: "run-1", type: "started" },
    {
      message: "Internal Evidence Judge pass",
      stage: "audit",
      type: "status",
    },
    { references: [source], type: "evidence" },
    { brief, type: "brief" },
    { type: "done" },
  ] satisfies DecisionStreamEvent[];

  state = reduceDecisionStreamEvents(events, state);
  assert.equal(state.phase, "result");
  assert.equal(state.brief, brief);
  assert.deepEqual(state.evidence, brief.sources);
  assert.equal(state.status, null);
});

test("stage status is calm and does not expose internal terminology", () => {
  const statuses = [
    safeStageStatus("context"),
    safeStageStatus("retrieval"),
    safeStageStatus("live-data"),
    safeStageStatus("analysis"),
    safeStageStatus("audit"),
    safeStageStatus("revision"),
    safeStageStatus("persistence"),
  ].join(" ");

  assert.doesNotMatch(statuses, /thinker|agent|evidence judge/i);
});

test("retryable error stays an error after done and renders safe copy", () => {
  const state = reduceDecisionStreamEvents([
    { runId: "run-error", type: "started" },
    {
      code: "PROVIDER_TIMEOUT",
      message: "Internal provider timeout detail",
      retryable: true,
      type: "error",
    },
    { type: "done" },
  ]);

  assert.equal(state.phase, "error");
  const error = state.error;
  assert.ok(error);
  assert.equal(error.retryable, true);
  const displayMessage = decisionErrorDisplayMessage(error);
  assert.equal(
    displayMessage,
    "We could not finish this decision brief. You can try again."
  );
  assert.doesNotMatch(displayMessage, /provider/i);
});

test("evidence open state is controlled and cannot open without evidence", () => {
  let state = createDecisionUiState();
  state = reduceDecisionUiState(state, {
    open: true,
    type: "evidence-open-changed",
  });
  assert.equal(state.evidenceOpen, false);

  state = reduceDecisionUiState(state, {
    event: { references: [source], type: "evidence" },
    type: "stream-event",
  });
  state = reduceDecisionUiState(state, {
    open: true,
    type: "evidence-open-changed",
  });
  assert.equal(state.evidenceOpen, true);

  state = reduceDecisionUiState(state, {
    open: false,
    type: "evidence-open-changed",
  });
  assert.equal(state.evidenceOpen, false);
});

test("primary view limits reasons to three and exposes textual confidence", () => {
  assert.equal(visibleDecisionReasons(brief).length, 3);
  assert.equal(confidenceLabel("low"), "Low confidence");
  assert.equal(confidenceLabel("medium"), "Medium confidence");
  assert.equal(confidenceLabel("high"), "High confidence");
});

test("Accept and Adjust dispatch the frozen DecisionBrief unchanged", () => {
  const calls: Array<[string, DecisionBrief]> = [];
  const callbacks = {
    onAccept: (value: DecisionBrief) => calls.push(["accept", value]),
    onAdjust: (value: DecisionBrief) => calls.push(["adjust", value]),
  };

  invokeDecisionBriefAction("accept", brief, callbacks);
  invokeDecisionBriefAction("adjust", brief, callbacks);

  assert.deepEqual(calls, [
    ["accept", brief],
    ["adjust", brief],
  ]);
});

test("done without a brief becomes a retryable incomplete-run error", () => {
  const state = reduceDecisionStreamEvents([
    { runId: "run-empty", type: "started" },
    { type: "done" },
  ]);
  assert.equal(state.phase, "error");
  assert.equal(state.error?.code, "INCOMPLETE_DECISION_RUN");
  assert.equal(state.error?.retryable, true);
});
