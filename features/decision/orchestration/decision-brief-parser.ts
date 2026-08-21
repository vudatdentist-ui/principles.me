import {
  parseDecisionBrief,
  type DecisionBrief,
} from "../contracts";
import type { EvidenceReference } from "../../evidence/contracts";
import type { DecisionAnalysis, DecisionAudit } from "./types";

export type DecisionModelOutputErrorCode =
  | "invalid_model_output"
  | "unsupported_citation";

export class DecisionModelOutputError extends Error {
  readonly code: DecisionModelOutputErrorCode;

  constructor(code: DecisionModelOutputErrorCode, message: string) {
    super(message);
    this.name = "DecisionModelOutputError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw invalidOutput(`${field} must be an object.`);
  }
  return value;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw invalidOutput(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function stringArray(value: unknown, field: string, max: number): string[] {
  if (!Array.isArray(value) || value.length > max) {
    throw invalidOutput(`${field} must be an array with at most ${max} items.`);
  }
  return value.map((item, index) => requiredString(item, `${field}[${index}]`));
}

function invalidOutput(message: string): DecisionModelOutputError {
  return new DecisionModelOutputError("invalid_model_output", message);
}

export function parseDecisionAnalysis(value: unknown): DecisionAnalysis {
  const input = requiredRecord(value, "analysis");
  const confidence = requiredRecord(input.confidence, "confidence");
  const { level } = confidence;
  if (level !== "low" && level !== "medium" && level !== "high") {
    throw invalidOutput("confidence.level is invalid.");
  }

  if (!Array.isArray(input.reasons) || input.reasons.length !== 3) {
    throw invalidOutput("reasons must contain exactly 3 items.");
  }

  const reasons = input.reasons.map((item, index) => {
    const reason = requiredRecord(item, `reasons[${index}]`);
    const rawKind = reason.kind;
    if (rawKind !== "fact" && rawKind !== "inference" && rawKind !== "user-context") {
      throw invalidOutput(`reasons[${index}].kind is invalid.`);
    }

    return {
      citationKeys: stringArray(
        reason.citationKeys,
        `reasons[${index}].citationKeys`,
        8
      ),
      id: requiredString(reason.id, `reasons[${index}].id`),
      kind: rawKind as "fact" | "inference" | "user-context",
      text: requiredString(reason.text, `reasons[${index}].text`),
    };
  });

  const review = requiredRecord(input.review, "review");
  const { suggestedAt } = review;
  if (suggestedAt !== null && typeof suggestedAt !== "string") {
    throw invalidOutput("review.suggestedAt must be a string or null.");
  }

  return {
    confidence: {
      explanation: requiredString(confidence.explanation, "confidence.explanation"),
      level,
    },
    counterCase: requiredString(input.counterCase, "counterCase"),
    nextAction: requiredString(input.nextAction, "nextAction"),
    reasons,
    recommendation: requiredString(input.recommendation, "recommendation"),
    review: {
      suggestedAt:
        typeof suggestedAt === "string"
          ? requiredString(suggestedAt, "review.suggestedAt")
          : null,
      trigger: requiredString(review.trigger, "review.trigger"),
    },
    unknowns: stringArray(input.unknowns, "unknowns", 8),
  };
}

export function parseDecisionAudit(value: unknown): DecisionAudit {
  const input = requiredRecord(value, "audit");
  const { decision } = input;
  if (decision !== "accept" && decision !== "revise") {
    throw invalidOutput("audit.decision is invalid.");
  }
  const { verdict } = input;
  if (verdict !== "grounded" && verdict !== "mixed" && verdict !== "ungrounded") {
    throw invalidOutput("audit.verdict is invalid.");
  }

  return {
    decision,
    issues: stringArray(input.issues, "audit.issues", 12),
    revisionInstructions: stringArray(
      input.revisionInstructions,
      "audit.revisionInstructions",
      12
    ),
    verdict,
  };
}

export function validateAnalysisCitations(
  analysis: DecisionAnalysis,
  evidence: readonly EvidenceReference[]
): void {
  const allowedKeys = new Set(evidence.map((reference) => reference.key));

  for (const reason of analysis.reasons) {
    if (reason.kind === "fact" && reason.citationKeys.length === 0) {
      throw invalidOutput("Fact reasons require at least one evidence citation.");
    }
    for (const key of reason.citationKeys) {
      if (!allowedKeys.has(key)) {
        throw new DecisionModelOutputError(
          "unsupported_citation",
          `Model cited evidence key ${key} that was not retrieved.`
        );
      }
    }
  }
}

const EVIDENCE_GAP_UNKNOWN =
  "Insufficient retrieved evidence to support factual conclusions.";

export function enforceEvidencePolicy(
  analysis: DecisionAnalysis,
  evidence: readonly EvidenceReference[]
): DecisionAnalysis {
  if (evidence.length > 0) {
    return analysis;
  }

  const unknowns = analysis.unknowns.includes(EVIDENCE_GAP_UNKNOWN)
    ? [...analysis.unknowns]
    : analysis.unknowns.length < 8
      ? [...analysis.unknowns, EVIDENCE_GAP_UNKNOWN]
      : [...analysis.unknowns];

  return {
    ...analysis,
    confidence: {
      explanation: analysis.confidence.explanation,
      level: "low",
    },
    unknowns,
  };
}

export function buildDecisionBrief(input: {
  analysis: DecisionAnalysis;
  evidence: readonly EvidenceReference[];
  question: string;
  runId: string;
  validAsOf: string;
}): DecisionBrief {
  return parseDecisionBrief({
    confidence: input.analysis.confidence,
    counterCase: input.analysis.counterCase,
    id: `brief-${input.runId}`,
    nextAction: input.analysis.nextAction,
    question: input.question,
    reasons: input.analysis.reasons,
    recommendation: input.analysis.recommendation,
    review: input.analysis.review,
    runId: input.runId,
    schemaVersion: "1",
    sources: input.evidence,
    unknowns: input.analysis.unknowns,
    validAsOf: input.validAsOf,
  });
}
