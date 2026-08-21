import type { DecisionBrief } from "@/features/decision/contracts";
import type { DecisionStreamEvent } from "@/features/decision/stream-events";
import type { EvidenceReference } from "@/features/evidence/contracts";

export const decisionQuestion =
  "Should we launch the pilot this month or wait for another review cycle?";

export const evidenceFixture: EvidenceReference = {
  chunkId: "chunk-v2-001",
  datasetId: "dataset-v2-tests",
  documentId: "document-v2-001",
  key: "R1",
  observedAt: null,
  positions: [],
  provider: "deterministic-fixture",
  publishedAt: "2026-08-20T09:00:00.000Z",
  retrievedAt: "2026-08-21T09:00:00.000Z",
  score: 0.94,
  sourceType: "ragflow",
  text: "The pilot prerequisites are complete and the remaining risk is reversible.",
  title: "Pilot readiness review",
  url: "https://example.test/pilot-readiness",
};

export const decisionBriefFixture: DecisionBrief = {
  confidence: {
    explanation: "The known constraints are covered and the open risk is reversible.",
    level: "high",
  },
  counterCase:
    "Wait if the launch window becomes irreversible or a required dependency slips.",
  id: "decision-brief-v2-001",
  nextAction: "Run a two-week pilot with an explicit rollback threshold.",
  question: decisionQuestion,
  reasons: [
    {
      citationKeys: ["R1"],
      id: "reason-1",
      kind: "fact",
      text: "The documented pilot prerequisites are complete.",
    },
    {
      citationKeys: [],
      id: "reason-2",
      kind: "inference",
      text: "A reversible pilot creates faster learning than another planning cycle.",
    },
    {
      citationKeys: [],
      id: "reason-3",
      kind: "user-context",
      text: "The stated priority is to learn quickly without locking in the final rollout.",
    },
  ],
  recommendation: "Launch the pilot this month with a narrow reversible scope.",
  review: {
    suggestedAt: "2026-09-04T09:00:00.000Z",
    trigger: "Review after two weeks or immediately if the rollback threshold is hit.",
  },
  runId: "run-v2-001",
  schemaVersion: "1",
  sources: [evidenceFixture],
  unknowns: ["Whether demand changes materially during the pilot window."],
  validAsOf: "2026-08-21T09:00:00.000Z",
};

export const successfulDecisionEvents = [
  { runId: decisionBriefFixture.runId, type: "started" },
  {
    message: "Loading decision context",
    stage: "context",
    type: "status",
  },
  {
    message: "Collecting relevant evidence",
    stage: "retrieval",
    type: "status",
  },
  { references: [evidenceFixture], type: "evidence" },
  {
    message: "Analyzing the decision",
    stage: "analysis",
    type: "status",
  },
  {
    message: "Auditing the recommendation",
    stage: "audit",
    type: "status",
  },
  {
    message: "Saving the decision snapshot",
    stage: "persistence",
    type: "status",
  },
  { brief: decisionBriefFixture, type: "brief" },
  { type: "done" },
] satisfies readonly DecisionStreamEvent[];

export const retryableErrorEvents = [
  { runId: "run-v2-error-001", type: "started" },
  {
    message: "Analyzing the decision",
    stage: "analysis",
    type: "status",
  },
  {
    code: "temporary_failure",
    message: "The decision run could not be completed. Please retry.",
    retryable: true,
    type: "error",
  },
] satisfies readonly DecisionStreamEvent[];
