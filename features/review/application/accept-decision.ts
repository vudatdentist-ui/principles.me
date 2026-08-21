import { err, ok, type Result } from "../../shared/result";
import { reviewApplicationError } from "./errors";
import type {
  AcceptDecisionInput,
  AcceptedDecision,
  ReviewApplicationDependencies,
  ReviewApplicationError,
} from "./types";

export async function acceptDecision(
  input: AcceptDecisionInput,
  dependencies: Pick<ReviewApplicationDependencies, "decisionRepository">
): Promise<Result<AcceptedDecision, ReviewApplicationError>> {
  const run = await dependencies.decisionRepository.getRun(
    input.runId,
    input.userId
  );

  if (!run || run.userId !== input.userId) {
    return err(reviewApplicationError("not_found"));
  }

  if (!run.completedAt || run.failedAt || !run.decisionBrief) {
    return err(reviewApplicationError("run_not_complete"));
  }

  const decision = await dependencies.decisionRepository.createDecision({
    objective: input.objective,
    reviewAt: input.reviewAt,
    runId: run.id,
    title: input.title,
    userId: input.userId,
  });

  return ok({
    decisionId: decision.id,
    reviewAt: decision.reviewAt,
    runId: run.id,
    status: decision.status,
  });
}
