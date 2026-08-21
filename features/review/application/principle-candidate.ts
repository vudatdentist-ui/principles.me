import {
  collectPrincipleCandidate,
  type PrincipleCandidateSignal,
} from "../../principles/candidate";
import { err, type Result } from "../../shared/result";
import { reviewApplicationError } from "./errors";
import type {
  PrincipleCandidateApplicationError,
  ReviewApplicationDependencies,
  SuggestedPrincipleCandidate,
  SuggestPrincipleCandidateInput,
} from "./types";

const defaultCandidateScanLimit = 100;

function normalizeScanLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) {
    return defaultCandidateScanLimit;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), defaultCandidateScanLimit);
}

export async function suggestPrincipleCandidate(
  input: SuggestPrincipleCandidateInput,
  dependencies: Pick<ReviewApplicationDependencies, "decisionRepository">
): Promise<
  Result<SuggestedPrincipleCandidate, PrincipleCandidateApplicationError>
> {
  const sourceDetail = await dependencies.decisionRepository.getDecision(
    input.decisionId,
    input.userId
  );

  if (!sourceDetail || sourceDetail.decision.userId !== input.userId) {
    return err(reviewApplicationError("not_found"));
  }

  const sourceOutcome = sourceDetail.outcomes.find(
    (outcome) =>
      outcome.id === input.outcomeId &&
      outcome.decisionId === input.decisionId &&
      outcome.userId === input.userId
  );

  if (!sourceOutcome) {
    return err(reviewApplicationError("invalid_review_relationship"));
  }

  const lesson = sourceOutcome.lessons?.trim() ?? "";
  if (!lesson) {
    return err({
      code: "insufficient_repeated_signal",
      requiredDistinctDecisions: 2,
      supportingDecisionCount: 0,
      supportingOutcomeCount: 0,
    });
  }

  const recent = await dependencies.decisionRepository.listRecent(
    input.userId,
    normalizeScanLimit(input.scanLimit)
  );
  const decisionIds = new Set(recent.map((decision) => decision.id));
  decisionIds.add(input.decisionId);

  const details = await Promise.all(
    [...decisionIds]
      .sort()
      .map((decisionId) =>
        dependencies.decisionRepository.getDecision(decisionId, input.userId)
      )
  );
  const signals: PrincipleCandidateSignal[] = [];

  for (const detail of details) {
    if (
      !detail ||
      detail.decision.userId !== input.userId ||
      detail.decision.status !== "reviewed" ||
      !detail.decision.reviewedAt
    ) {
      continue;
    }

    for (const outcome of detail.outcomes) {
      if (outcome.userId !== input.userId || !outcome.lessons?.trim()) {
        continue;
      }

      signals.push({
        decisionId: detail.decision.id,
        lesson: outcome.lessons,
        outcomeId: outcome.id,
        reviewedAt: detail.decision.reviewedAt,
      });
    }
  }

  return collectPrincipleCandidate({ lesson, signals });
}
