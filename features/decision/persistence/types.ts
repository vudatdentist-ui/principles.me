import type { DecisionBrief } from "@/features/decision/contracts";

export type JsonPrimitive = boolean | number | string | null;

export type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[];

export type JsonSnapshot = Exclude<JsonValue, null>;

export type DecisionStatus =
  | "archived"
  | "decided"
  | "draft"
  | "exploring"
  | "review_due"
  | "reviewed";

export type DecisionOutcomeVerdict =
  | "mixed"
  | "negative"
  | "positive"
  | "too_early";

export type DecisionReviewQuality = "no" | "unclear" | "yes";
export type ReasoningReviewQuality = "no" | "partially" | "yes";
export type PrincipleStatus = "active" | "retired" | "revised";

export interface DecisionRun {
  readonly analysisSnapshot: JsonSnapshot | null;
  readonly auditSnapshot: JsonSnapshot | null;
  readonly completedAt: Date | null;
  readonly contextSnapshot: JsonSnapshot;
  readonly decisionBrief: DecisionBrief | null;
  readonly decisionId: string | null;
  readonly errorCode: string | null;
  readonly evidenceSnapshot: JsonSnapshot | null;
  readonly failedAt: Date | null;
  readonly id: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly question: string;
  readonly retrievalPlan: JsonSnapshot;
  readonly startedAt: Date;
  readonly userId: string;
}

export interface PersistedDecision {
  readonly createdAt: Date;
  readonly decidedAt: Date | null;
  readonly id: string;
  readonly objective: string | null;
  readonly question: string;
  readonly reviewAt: Date | null;
  readonly reviewedAt: Date | null;
  readonly status: DecisionStatus;
  readonly title: string;
  readonly updatedAt: Date;
  readonly userId: string;
}

export interface DecisionSummary {
  readonly createdAt: Date;
  readonly decidedAt: Date | null;
  readonly id: string;
  readonly question: string;
  readonly reviewAt: Date | null;
  readonly status: DecisionStatus;
  readonly title: string;
  readonly updatedAt: Date;
}

export interface PersistedDecisionOutcome {
  readonly createdAt: Date;
  readonly decisionId: string;
  readonly decisionQuality: DecisionReviewQuality;
  readonly id: string;
  readonly lessons: string | null;
  readonly reasoningQuality: ReasoningReviewQuality;
  readonly result: string;
  readonly updatedAt: Date;
  readonly userId: string;
  readonly verdict: DecisionOutcomeVerdict;
}

export interface PersistedPrinciple {
  readonly createdAt: Date;
  readonly description: string | null;
  readonly id: string;
  readonly revision: number;
  readonly sourceDecisionId: string | null;
  readonly statement: string;
  readonly status: PrincipleStatus;
  readonly updatedAt: Date;
  readonly userId: string;
}

export interface DecisionDetail {
  readonly decision: PersistedDecision;
  readonly outcomes: readonly PersistedDecisionOutcome[];
  readonly principles: readonly PersistedPrinciple[];
  readonly run: DecisionRun | null;
}

export interface CreateDecisionRunInput {
  readonly contextSnapshot: JsonSnapshot;
  readonly model: string;
  readonly promptVersion: string;
  readonly question: string;
  readonly retrievalPlan: JsonSnapshot;
  readonly startedAt?: Date;
  readonly userId: string;
}

export interface CompleteDecisionRunInput {
  readonly analysisSnapshot: JsonSnapshot;
  readonly auditSnapshot: JsonSnapshot;
  readonly completedAt?: Date;
  readonly decisionBrief: DecisionBrief;
  readonly evidenceSnapshot: JsonSnapshot;
  readonly id: string;
  readonly userId: string;
}

export interface FailDecisionRunInput {
  readonly errorCode: string;
  readonly failedAt?: Date;
  readonly id: string;
  readonly userId: string;
}

export interface CreateDecisionInput {
  readonly context?: string | null;
  readonly objective?: string | null;
  readonly reviewAt?: Date | null;
  readonly runId: string;
  readonly title?: string;
  readonly userId: string;
}

export interface DecisionRepository {
  completeRun(input: CompleteDecisionRunInput): Promise<DecisionRun>;
  createDecision(input: CreateDecisionInput): Promise<PersistedDecision>;
  createRun(input: CreateDecisionRunInput): Promise<DecisionRun>;
  failRun(input: FailDecisionRunInput): Promise<void>;
  getDecision(id: string, userId: string): Promise<DecisionDetail | null>;
  getRun(id: string, userId: string): Promise<DecisionRun | null>;
  listDueForReview(userId: string): Promise<DecisionSummary[]>;
  listRecent(userId: string, limit: number): Promise<DecisionSummary[]>;
}
