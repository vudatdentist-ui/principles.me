import type {
  DecisionRepository,
  PersistedDecision,
  PersistedDecisionOutcome,
  PersistedPrinciple,
} from "../../decision/persistence/types";
import type {
  InsufficientPrincipleCandidateSignalError,
  PrincipleCandidate,
} from "../../principles/candidate";
import type {
  AssumptionReviewVerdict,
  PersistedAssumptionReview,
  PersistedPrincipleReview,
  PrincipleReviewAction,
  ReviewRepository,
} from "../persistence/types";

export type ReviewApplicationErrorCode =
  | "invalid_review_relationship"
  | "not_found"
  | "run_not_complete";

export interface ReviewApplicationError {
  readonly code: ReviewApplicationErrorCode;
}

export interface ReviewApplicationDependencies {
  readonly decisionRepository: DecisionRepository;
  readonly reviewRepository: ReviewRepository;
}

export interface AcceptDecisionInput {
  readonly objective?: string | null;
  readonly reviewAt?: Date | null;
  readonly runId: string;
  readonly title?: string;
  readonly userId: string;
}

export interface AcceptedDecision {
  readonly decisionId: string;
  readonly reviewAt: Date | null;
  readonly runId: string;
  readonly status: PersistedDecision["status"];
}

export interface GetReviewContextInput {
  readonly decisionId: string;
  readonly userId: string;
}

export interface ReviewContextDecision {
  readonly id: string;
  readonly question: string;
  readonly reviewAt: Date | null;
  readonly reviewedAt: Date | null;
  readonly status: PersistedDecision["status"];
  readonly title: string;
}

export interface ReviewContextPrinciple {
  readonly id: string;
  readonly revision: number;
  readonly statement: string;
  readonly status: PersistedPrinciple["status"];
}

export interface ReviewContext {
  readonly decision: ReviewContextDecision;
  readonly linkedPrinciples: readonly ReviewContextPrinciple[];
  readonly outcomes: readonly PersistedDecisionOutcome[];
}

export interface RecordOutcomeInput {
  readonly decisionId: string;
  readonly decisionQuality?: PersistedDecisionOutcome["decisionQuality"];
  readonly lessons?: string | null;
  readonly reasoningQuality?: PersistedDecisionOutcome["reasoningQuality"];
  readonly result: string;
  readonly userId: string;
  readonly verdict?: PersistedDecisionOutcome["verdict"];
}

export interface ReviewAssumptionInput {
  readonly assumptionText: string;
  readonly decisionId: string;
  readonly note?: string | null;
  readonly outcomeId: string;
  readonly userId: string;
  readonly verdict?: AssumptionReviewVerdict;
}

export interface ReviewPrincipleInput {
  readonly action: PrincipleReviewAction;
  readonly decisionId: string;
  readonly outcomeId: string;
  readonly principleId: string;
  readonly resultingStatement?: string;
  readonly userId: string;
}

export interface MarkDecisionReviewedInput {
  readonly decisionId: string;
  readonly reviewedAt?: Date;
  readonly userId: string;
}

export interface MarkedDecisionReviewed {
  readonly decisionId: string;
  readonly reviewedAt: Date;
}

export interface SuggestPrincipleCandidateInput {
  readonly decisionId: string;
  readonly outcomeId: string;
  readonly scanLimit?: number;
  readonly userId: string;
}

export type PrincipleCandidateApplicationError =
  | InsufficientPrincipleCandidateSignalError
  | ReviewApplicationError;

export type ReviewOutcomeResult = PersistedDecisionOutcome;
export type AssumptionReviewResult = PersistedAssumptionReview;
export type PrincipleReviewResult = PersistedPrincipleReview;
export type SuggestedPrincipleCandidate = PrincipleCandidate;
