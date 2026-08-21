import "server-only";

import type { PersistedDecisionOutcome } from "@/features/decision/persistence/types";
import {
  createAssumptionReviewRecord,
  createDecisionOutcomeRecord,
  createPrincipleReviewRecord,
  listDecisionOutcomeRecords,
  markDecisionReviewedRecord,
} from "@/lib/db/queries/reviews";
import type {
  DecisionAssumptionReview as DatabaseAssumptionReview,
  DecisionOutcome as DatabaseDecisionOutcome,
  DecisionPrincipleReview as DatabasePrincipleReview,
} from "@/lib/db/schema";
import type {
  PersistedAssumptionReview,
  PersistedPrincipleReview,
  ReviewRepository,
} from "./types";

function mapOutcome(
  outcome: DatabaseDecisionOutcome
): PersistedDecisionOutcome {
  return {
    createdAt: outcome.createdAt,
    decisionId: outcome.decisionId,
    decisionQuality: outcome.decisionQuality,
    id: outcome.id,
    lessons: outcome.lessons,
    reasoningQuality: outcome.reasoningQuality,
    result: outcome.result,
    updatedAt: outcome.updatedAt,
    userId: outcome.userId,
    verdict: outcome.verdict,
  };
}

function mapAssumptionReview(
  review: DatabaseAssumptionReview
): PersistedAssumptionReview {
  return {
    assumptionText: review.assumptionText,
    createdAt: review.createdAt,
    decisionId: review.decisionId,
    id: review.id,
    note: review.note,
    outcomeId: review.outcomeId,
    updatedAt: review.updatedAt,
    userId: review.userId,
    verdict: review.verdict,
  };
}

function mapPrincipleReview(
  review: DatabasePrincipleReview
): PersistedPrincipleReview {
  return {
    action: review.action,
    createdAt: review.createdAt,
    decisionId: review.decisionId,
    id: review.id,
    outcomeId: review.outcomeId,
    previousRevision: review.previousRevision,
    previousStatement: review.previousStatement,
    principleId: review.principleId,
    resultingRevision: review.resultingRevision,
    resultingStatement: review.resultingStatement,
    userId: review.userId,
  };
}

export const reviewRepository: ReviewRepository = {
  async createAssumptionReview(input) {
    const review = await createAssumptionReviewRecord(input);
    return review ? mapAssumptionReview(review) : null;
  },

  async createOutcome(input) {
    const outcome = await createDecisionOutcomeRecord(input);
    return outcome ? mapOutcome(outcome) : null;
  },

  async createPrincipleReview(input) {
    const review = await createPrincipleReviewRecord(input);
    return review ? mapPrincipleReview(review) : null;
  },

  async listOutcomes(decisionId, userId) {
    const outcomes = await listDecisionOutcomeRecords(decisionId, userId);
    return outcomes.map(mapOutcome);
  },

  markDecisionReviewed(decisionId, userId, reviewedAt = new Date()) {
    return markDecisionReviewedRecord(decisionId, userId, reviewedAt);
  },
};
