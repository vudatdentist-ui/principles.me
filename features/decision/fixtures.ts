import type { DecisionBrief } from "@/features/decision/contracts";
import type { DecisionStreamEvent } from "@/features/decision/stream-events";
import {
  marketEvidenceFixture,
  ragflowEvidenceFixture,
  userContextEvidenceFixture,
  webEvidenceFixture,
} from "@/features/evidence/fixtures";

export const groundedDecisionBriefFixture = {
  confidence: {
    explanation:
      "The evidence covers the relevant principle, current context, market observation, and the user-provided portfolio constraint.",
    level: "medium",
  },
  counterCase:
    "A larger immediate purchase could outperform if the defensive-asset move accelerates and the user will not need the capital.",
  id: "decision-fixture-grounded",
  nextAction:
    "Confirm the amount of cash required during the next twelve months before choosing a position size.",
  question: "Should I buy gold today?",
  reasons: [
    {
      citationKeys: ["M1", "W1"],
      id: "reason-current-context",
      kind: "fact",
      text: "The current evidence packet contains both a recent market observation and current reporting on defensive demand.",
    },
    {
      citationKeys: ["C1"],
      id: "reason-user-context",
      kind: "user-context",
      text: "Gold already represents a meaningful share of the user's reported portfolio.",
    },
    {
      citationKeys: ["R1"],
      id: "reason-process",
      kind: "inference",
      text: "A staged decision better preserves room to update when important assumptions remain uncertain.",
    },
  ],
  recommendation:
    "Do not take the full intended position today. Use a staged purchase only after checking near-term liquidity needs.",
  review: {
    suggestedAt: "2026-09-21T00:00:00.000Z",
    trigger:
      "Review when the market observation, the local price premium, or the user's liquidity needs change materially.",
  },
  runId: "run-fixture-grounded",
  schemaVersion: "1",
  sources: [
    ragflowEvidenceFixture,
    webEvidenceFixture,
    marketEvidenceFixture,
    userContextEvidenceFixture,
  ],
  unknowns: [
    "The user's twelve-month cash requirement is not yet known.",
    "The fixture does not contain a production-grade local market premium.",
  ],
  validAsOf: "2026-08-21T03:15:00.000Z",
} satisfies DecisionBrief;

export const mixedEvidenceDecisionBriefFixture = {
  confidence: {
    explanation:
      "The source corpus supports a decision process, but current external context is incomplete.",
    level: "low",
  },
  counterCase:
    "Waiting may be costly if relevant market conditions move before better evidence is available.",
  id: "decision-fixture-mixed",
  nextAction: "Collect current market and Vietnam-specific evidence before acting.",
  question: "Should I buy gold today?",
  reasons: [
    {
      citationKeys: ["R1"],
      id: "reason-process-only",
      kind: "inference",
      text: "The available source supports a disciplined process but does not establish today's market conditions.",
    },
  ],
  recommendation:
    "Do not make a market-timing decision from the current evidence packet.",
  review: {
    suggestedAt: null,
    trigger: "Review immediately after current market evidence is available.",
  },
  runId: "run-fixture-mixed",
  schemaVersion: "1",
  sources: [ragflowEvidenceFixture],
  unknowns: [
    "Current gold prices are missing.",
    "Vietnam-specific pricing and policy context are missing.",
  ],
  validAsOf: "2026-08-21T03:15:00.000Z",
} satisfies DecisionBrief;

export const noEvidenceDecisionBriefFixture = {
  confidence: {
    explanation:
      "No source-backed facts are available, so the output is limited to a request for evidence.",
    level: "low",
  },
  counterCase:
    "The user may already possess decisive context that has not been supplied to the system.",
  id: "decision-fixture-no-evidence",
  nextAction: "Add relevant documents or enable an approved current-data provider.",
  question: "Should I make this decision now?",
  reasons: [
    {
      citationKeys: [],
      id: "reason-evidence-gap",
      kind: "inference",
      text: "A recommendation would be unreliable until the missing evidence is supplied.",
    },
  ],
  recommendation: "Delay the decision until minimum evidence is available.",
  review: {
    suggestedAt: null,
    trigger: "Review when the missing evidence is available.",
  },
  runId: "run-fixture-no-evidence",
  schemaVersion: "1",
  sources: [],
  unknowns: ["The system has no evidence packet for this question."],
  validAsOf: "2026-08-21T03:15:00.000Z",
} satisfies DecisionBrief;

export const groundedDecisionStreamFixture = [
  { runId: groundedDecisionBriefFixture.runId, type: "started" },
  {
    message: "Loading decision context.",
    stage: "context",
    type: "status",
  },
  {
    message: "Retrieving trusted sources.",
    stage: "retrieval",
    type: "status",
  },
  {
    references: groundedDecisionBriefFixture.sources,
    type: "evidence",
  },
  {
    message: "Building a structured Decision Brief.",
    stage: "analysis",
    type: "status",
  },
  { brief: groundedDecisionBriefFixture, type: "brief" },
  { type: "done" },
] satisfies DecisionStreamEvent[];

export const providerTimeoutDecisionStreamFixture = [
  { runId: "run-fixture-timeout", type: "started" },
  {
    message: "Retrieving trusted sources.",
    stage: "retrieval",
    type: "status",
  },
  {
    code: "EVIDENCE_PROVIDER_TIMEOUT",
    message: "The evidence provider did not respond before the deadline.",
    retryable: true,
    type: "error",
  },
  { type: "done" },
] satisfies DecisionStreamEvent[];

export const malformedDecisionStreamFixture =
  '{"type":"started","runId":"run-fixture-malformed"}\n{"type":';
