export type CortexSourceKind =
  | "external_evidence"
  | "personal_memory"
  | "custom_principle"
  | "organization_memory";

export type CortexRunInput = {
  input: string;
  context?: string;
  decisionId?: string;
};

export type CortexAnswers = Record<string, string>;

export type CortexClarificationQuestion = {
  id: string;
  question: string;
  reason: string;
};

export type CortexClarification = {
  questions: CortexClarificationQuestion[];
};

export type CortexEvidence =
  | {
      kind: "external_evidence";
      key: string;
      title: string;
      excerpt: string;
      documentId: string | null;
      chunkId: string | null;
      score: number | null;
    }
  | {
      kind: "personal_memory";
      key: string;
      id: string;
      title: string;
      excerpt: string;
    }
  | {
      kind: "custom_principle";
      key: string;
      id: string;
      statement: string;
    }
  | {
      kind: "organization_memory";
      key: string;
      id: string;
      title: string;
      excerpt: string;
    };

export type CortexClaimLayer = "evidence" | "interpretation" | "application";

export type CortexClaimDraft = {
  text: string;
  layer: CortexClaimLayer;
  evidenceKeys: string[];
};

export type CortexResultClaim = {
  text: string;
  evidenceKeys: string[];
};

export type CortexCompleteDraft = {
  framing: CortexClaimDraft;
  crux: CortexClaimDraft[];
  conflicts: CortexClaimDraft[];
  recommendation: {
    summary: CortexClaimDraft;
    actions: CortexClaimDraft[];
  };
  confidence: {
    level: "low" | "medium" | "high";
    rationale: CortexClaimDraft;
  };
  changeConditions: CortexClaimDraft[];
};

export type CortexReasonerDecision =
  | {
      status: "clarify";
      clarification: CortexClarification;
    }
  | {
      status: "complete";
      result: CortexCompleteDraft;
    };

export type CortexResult = {
  framing: CortexResultClaim;
  crux: CortexResultClaim[];
  evidence: CortexEvidence[];
  conflicts: CortexResultClaim[];
  recommendation: {
    summary: CortexResultClaim;
    actions: CortexResultClaim[];
  };
  confidence: {
    level: "low" | "medium" | "high";
    rationale: CortexResultClaim;
  };
  changeConditions: CortexResultClaim[];
  grounded: boolean;
};

export type CortexClarifyResponse = {
  status: "clarify";
  runId: string;
  clarification: CortexClarification;
};

export type CortexCompleteResponse = {
  status: "complete";
  runId: string;
  result: CortexResult;
};

export type CortexResponse = CortexClarifyResponse | CortexCompleteResponse;

export type CortexMemoryBundle = {
  evidence: CortexEvidence[];
  contradictions: Array<{
    principleId: string;
    principleStatement: string;
    reason: string;
    prompt: string;
  }>;
};

export type CortexExternalBundle = {
  evidence: Extract<CortexEvidence, { kind: "external_evidence" }>[];
  lenses: Array<{
    id: string;
    label: string;
    description: string;
    retrievalHint: string;
    score: number;
  }>;
  reason:
    | "NOT_CONFIGURED"
    | "RAGFLOW_RETRIEVED"
    | "PARTIAL_RETRIEVAL"
    | "NO_MATCHES"
    | "UNAVAILABLE";
};

export type CortexRunRecord = {
  id: string;
  userId: string;
  input: CortexRunInput;
  answers: CortexAnswers;
  status: "clarify" | "complete";
  clarification: CortexClarification | null;
  result: CortexResult | null;
};

export interface CortexMemoryProvider {
  retrieve(args: {
    userId: string;
    input: CortexRunInput;
    answers: CortexAnswers;
  }): Promise<CortexMemoryBundle>;
}

export interface CortexExternalEvidenceProvider {
  retrieve(args: {
    input: CortexRunInput;
    answers: CortexAnswers;
  }): Promise<CortexExternalBundle>;
}

export interface CortexReasoner {
  reason(args: {
    input: CortexRunInput;
    answers: CortexAnswers;
    memory: CortexMemoryBundle;
    external: CortexExternalBundle;
    allowClarification: boolean;
  }): Promise<CortexReasonerDecision>;
}

export interface CortexRunStore {
  create(record: CortexRunRecord): Promise<void>;
  get(args: { runId: string; userId: string }): Promise<CortexRunRecord | null>;
  update(record: CortexRunRecord): Promise<void>;
}
