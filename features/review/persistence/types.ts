import type {
  DecisionOutcomeVerdict,
  DecisionReviewQuality,
  PersistedDecisionOutcome,
  ReasoningReviewQuality,
} from "@/features/decision/persistence/types";

export type AssumptionReviewVerdict = "correct" | "incorrect" | "unclear";
export type PrincipleReviewAction = "keep" | "retire" | "revise";

export interface PersistedAssumptionReview {
  readonly assumptionText: string;
  readonly createdAt: Date;
  readonly decisionId: string;
  readonly id: string;
  readonly note: string | null;
  readonly outcomeId: string;
  readonly updatedAt: Date;
  readonly userId: string;
  readonly verdict: AssumptionReviewVerdict;
}

export interface PersistedPrincipleReview {
  readonly action: PrincipleReviewAction;
  readonly createdAt: Date;
  readonly decisionId: string;
  readonly id: string;
  readonly outcomeId: string;
  readonly previousRevision: number;
  readonly previousStatement: string;
  readonly principleId: string;
  readonly resultingRevision: number;
  readonly resultingStatement: string;
  readonly userId: string;
}

export interface CreateDecisionOutcomeInput {
  readonly decisionId: string;
  readonly decisionQuality?: DecisionReviewQuality;
  readonly lessons?: string | null;
  readonly reasoningQuality?: ReasoningReviewQuality;
  readonly result: string;
  readonly userId: string;
  readonly verdict?: DecisionOutcomeVerdict;
}

export interface CreateAssumptionReviewInput {
  readonly assumptionText: string;
  readonly decisionId: string;
  readonly note?: string | null;
  readonly outcomeId: string;
  readonly userId: string;
  readonly verdict?: AssumptionReviewVerdict;
}

export interface CreatePrincipleReviewInput {
  readonly action: PrincipleReviewAction;
  readonly decisionId: string;
  readonly outcomeId: string;
  readonly previousRevision: number;
  readonly previousStatement: string;
  readonly principleId: string;
  readonly resultingRevision: number;
  readonly resultingStatement: string;
  readonly userId: string;
}

export interface ReviewRepository {
  createAssumptionReview(
    input: CreateAssumptionReviewInput
  ): Promise<PersistedAssumptionReview | null>;
  createOutcome(
    input: CreateDecisionOutcomeInput
  ): Promise<PersistedDecisionOutcome | null>;
  createPrincipleReview(
    input: CreatePrincipleReviewInput
  ): Promise<PersistedPrincipleReview | null>;
  listOutcomes(
    decisionId: string,
    userId: string
  ): Promise<PersistedDecisionOutcome[]>;
  markDecisionReviewed(
    decisionId: string,
    userId: string,
    reviewedAt?: Date
  ): Promise<boolean>;
}
