import { isPromptInjectionLeak } from "@/lib/council/security";
import type {
  CortexClaimDraft,
  CortexCompleteDraft,
  CortexEvidence,
  CortexResult,
  CortexResultClaim,
  CortexRunInput,
} from "./types";

const PERSONA_PATTERN =
  /\b(?:ray\s+dalio|dalio|charlie\s+munger|munger|warren\s+buffett|buffett|marcus\s+aurelius|aurelius|ho\s+chi\s+minh)\s+(?:says?|said|argues?|believes?|writes?|thinks?)\b/i;

function safeText(value: string) {
  const text = value.trim();
  if (!text || isPromptInjectionLeak(text) || PERSONA_PATTERN.test(text)) {
    return null;
  }
  return text;
}

function sanitizeClaim(
  claim: CortexClaimDraft,
  allowedKeys: Set<string>,
  externalKeys: Set<string>
): CortexResultClaim | null {
  const text = safeText(claim.text);
  if (!text) {
    return null;
  }
  const evidenceKeys = [
    ...new Set(claim.evidenceKeys.map((key) => key.trim()).filter((key) => allowedKeys.has(key))),
  ];
  if (
    claim.layer !== "application" &&
    !evidenceKeys.some((key) => externalKeys.has(key))
  ) {
    return null;
  }
  return { evidenceKeys, text };
}

function sanitizeClaims(
  claims: CortexClaimDraft[],
  allowedKeys: Set<string>,
  externalKeys: Set<string>
) {
  return claims
    .map((claim) => sanitizeClaim(claim, allowedKeys, externalKeys))
    .filter((claim): claim is CortexResultClaim => Boolean(claim));
}

function allClaims(result: CortexResult) {
  return [
    result.framing,
    ...result.crux,
    ...result.conflicts,
    result.recommendation.summary,
    ...result.recommendation.actions,
    result.confidence.rationale,
    ...result.changeConditions,
  ];
}

export function buildNoEvidenceResult({
  input,
  evidence,
  reason,
}: {
  input: CortexRunInput;
  evidence: CortexEvidence[];
  reason: string;
}): CortexResult {
  return {
    framing: { evidenceKeys: [], text: input.input },
    crux: [
      {
        evidenceKeys: [],
        text: "External evidence is not available or not relevant enough to support a grounded recommendation.",
      },
    ],
    evidence,
    conflicts: [],
    recommendation: {
      summary: {
        evidenceKeys: [],
        text: "Do not treat the current analysis as source-backed until relevant external evidence is available.",
      },
      actions: [],
    },
    confidence: {
      level: "low",
      rationale: {
        evidenceKeys: [],
        text: `Cortex fail-closed because external retrieval ended with ${reason}. Personal memory remains user-owned context, not sourced evidence.`,
      },
    },
    changeConditions: [
      {
        evidenceKeys: [],
        text: "Re-run when relevant external evidence is available or the material facts change.",
      },
    ],
    grounded: false,
  };
}

export function sanitizeCortexResult({
  draft,
  evidence,
  input,
}: {
  draft: CortexCompleteDraft;
  evidence: CortexEvidence[];
  input: CortexRunInput;
}): CortexResult {
  const allowedKeys = new Set(evidence.map((item) => item.key));
  const externalKeys = new Set(
    evidence.filter((item) => item.kind === "external_evidence").map((item) => item.key)
  );
  const framing = sanitizeClaim(draft.framing, allowedKeys, externalKeys) ?? {
    evidenceKeys: [],
    text: input.input,
  };
  const recommendationSummary =
    sanitizeClaim(draft.recommendation.summary, allowedKeys, externalKeys) ?? {
      evidenceKeys: [],
      text: "Cortex could not form a grounded recommendation safely.",
    };
  const confidenceRationale =
    sanitizeClaim(draft.confidence.rationale, allowedKeys, externalKeys) ?? {
      evidenceKeys: [],
      text: "Confidence is limited because unsupported or unsafe claims were removed.",
    };

  const result: CortexResult = {
    framing,
    crux: sanitizeClaims(draft.crux, allowedKeys, externalKeys),
    evidence,
    conflicts: sanitizeClaims(draft.conflicts, allowedKeys, externalKeys),
    recommendation: {
      summary: recommendationSummary,
      actions: sanitizeClaims(draft.recommendation.actions, allowedKeys, externalKeys),
    },
    confidence: {
      level: draft.confidence.level,
      rationale: confidenceRationale,
    },
    changeConditions: sanitizeClaims(draft.changeConditions, allowedKeys, externalKeys),
    grounded: false,
  };
  result.grounded = allClaims(result).some((claim) =>
    claim.evidenceKeys.some((key) => externalKeys.has(key))
  );

  if (!result.grounded) {
    return buildNoEvidenceResult({
      evidence,
      input,
      reason: "MODEL_RETURNED_NO_VALID_EXTERNAL_ATTRIBUTION",
    });
  }
  return result;
}

export function sanitizeClarificationQuestions<T extends { question: string }>(questions: T[]) {
  return questions.filter((question) => Boolean(safeText(question.question)));
}
