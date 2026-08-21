import { err, ok, type Result } from "../../shared/result";
import { reviewApplicationError } from "./errors";
import type {
  AssumptionReviewResult,
  GetReviewContextInput,
  MarkDecisionReviewedInput,
  MarkedDecisionReviewed,
  PrincipleReviewResult,
  RecordOutcomeInput,
  ReviewApplicationDependencies,
  ReviewApplicationError,
  ReviewAssumptionInput,
  ReviewContext,
  ReviewOutcomeResult,
  ReviewPrincipleInput,
} from "./types";

export async function getReviewContext(
  input: GetReviewContextInput,
  dependencies: Pick<ReviewApplicationDependencies, "decisionRepository">
): Promise<Result<ReviewContext, ReviewApplicationError>> {
  const detail = await dependencies.decisionRepository.getDecision(
    input.decisionId,
    input.userId
  );

  if (!detail || detail.decision.userId !== input.userId) {
    return err(reviewApplicationError("not_found"));
  }

  return ok({
    decision: {
      id: detail.decision.id,
      question: detail.decision.question,
      reviewAt: detail.decision.reviewAt,
      reviewedAt: detail.decision.reviewedAt,
      status: detail.decision.status,
      title: detail.decision.title,
    },
    linkedPrinciples: detail.principles.map((principle) => ({
      id: principle.id,
      revision: principle.revision,
      statement: principle.statement,
      status: principle.status,
    })),
    outcomes: detail.outcomes,
  });
}

export async function recordOutcome(
  input: RecordOutcomeInput,
  dependencies: ReviewApplicationDependencies
): Promise<Result<ReviewOutcomeResult, ReviewApplicationError>> {
  const detail = await dependencies.decisionRepository.getDecision(
    input.decisionId,
    input.userId
  );

  if (!detail || detail.decision.userId !== input.userId) {
    return err(reviewApplicationError("not_found"));
  }

  const outcome = await dependencies.reviewRepository.createOutcome({
    decisionId: input.decisionId,
    decisionQuality: input.decisionQuality,
    lessons: input.lessons,
    reasoningQuality: input.reasoningQuality,
    result: input.result,
    userId: input.userId,
    verdict: input.verdict,
  });

  return outcome
    ? ok(outcome)
    : err(reviewApplicationError("not_found"));
}

export async function reviewAssumption(
  input: ReviewAssumptionInput,
  dependencies: ReviewApplicationDependencies
): Promise<Result<AssumptionReviewResult, ReviewApplicationError>> {
  const detail = await dependencies.decisionRepository.getDecision(
    input.decisionId,
    input.userId
  );

  if (!detail || detail.decision.userId !== input.userId) {
    return err(reviewApplicationError("not_found"));
  }

  const ownsOutcome = detail.outcomes.some(
    (outcome) =>
      outcome.id === input.outcomeId &&
      outcome.decisionId === input.decisionId &&
      outcome.userId === input.userId
  );

  if (!ownsOutcome) {
    return err(reviewApplicationError("invalid_review_relationship"));
  }

  const review = await dependencies.reviewRepository.createAssumptionReview({
    assumptionText: input.assumptionText,
    decisionId: input.decisionId,
    note: input.note,
    outcomeId: input.outcomeId,
    userId: input.userId,
    verdict: input.verdict,
  });

  return review
    ? ok(review)
    : err(reviewApplicationError("invalid_review_relationship"));
}

export async function reviewPrinciple(
  input: ReviewPrincipleInput,
  dependencies: ReviewApplicationDependencies
): Promise<Result<PrincipleReviewResult, ReviewApplicationError>> {
  const detail = await dependencies.decisionRepository.getDecision(
    input.decisionId,
    input.userId
  );

  if (!detail || detail.decision.userId !== input.userId) {
    return err(reviewApplicationError("not_found"));
  }

  const outcome = detail.outcomes.find(
    (candidate) =>
      candidate.id === input.outcomeId &&
      candidate.decisionId === input.decisionId &&
      candidate.userId === input.userId
  );
  const principle = detail.principles.find(
    (candidate) => candidate.id === input.principleId
  );

  if (!outcome || !principle || principle.userId !== input.userId) {
    return err(reviewApplicationError("invalid_review_relationship"));
  }

  const proposedStatement = input.resultingStatement?.trim();
  if (input.action === "revise" && !proposedStatement) {
    return err(reviewApplicationError("invalid_review_relationship"));
  }

  const resultingStatement =
    input.action === "revise" && proposedStatement
      ? proposedStatement
      : principle.statement;
  const resultingRevision =
    input.action === "revise" ? principle.revision + 1 : principle.revision;

  const review = await dependencies.reviewRepository.createPrincipleReview({
    action: input.action,
    decisionId: input.decisionId,
    outcomeId: outcome.id,
    previousRevision: principle.revision,
    previousStatement: principle.statement,
    principleId: principle.id,
    resultingRevision,
    resultingStatement,
    userId: input.userId,
  });

  return review
    ? ok(review)
    : err(reviewApplicationError("invalid_review_relationship"));
}

export async function markDecisionReviewed(
  input: MarkDecisionReviewedInput,
  dependencies: ReviewApplicationDependencies
): Promise<Result<MarkedDecisionReviewed, ReviewApplicationError>> {
  const detail = await dependencies.decisionRepository.getDecision(
    input.decisionId,
    input.userId
  );

  if (!detail || detail.decision.userId !== input.userId) {
    return err(reviewApplicationError("not_found"));
  }

  const reviewedAt = input.reviewedAt ?? new Date();
  const marked = await dependencies.reviewRepository.markDecisionReviewed(
    input.decisionId,
    input.userId,
    reviewedAt
  );

  return marked
    ? ok({ decisionId: input.decisionId, reviewedAt })
    : err(reviewApplicationError("not_found"));
}
