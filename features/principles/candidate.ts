import { err, ok, type Result } from "../shared/result";

const requiredDistinctDecisions = 2;

export type PrincipleCandidateConfidence = "high" | "medium";

export interface PrincipleCandidate {
  readonly confidence: PrincipleCandidateConfidence;
  readonly rationale: string;
  readonly statement: string;
  readonly supportingDecisionIds: readonly string[];
  readonly supportingOutcomeIds: readonly string[];
}

export interface PrincipleCandidateSignal {
  readonly decisionId: string;
  readonly lesson: string;
  readonly outcomeId: string;
  readonly reviewedAt: Date | null;
}

export interface InsufficientPrincipleCandidateSignalError {
  readonly code: "insufficient_repeated_signal";
  readonly requiredDistinctDecisions: number;
  readonly supportingDecisionCount: number;
  readonly supportingOutcomeCount: number;
}

export interface CollectPrincipleCandidateInput {
  readonly lesson: string;
  readonly signals: readonly PrincipleCandidateSignal[];
}

function cleanStatement(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizePrincipleLesson(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function collectPrincipleCandidate(
  input: CollectPrincipleCandidateInput
): Result<PrincipleCandidate, InsufficientPrincipleCandidateSignalError> {
  const target = normalizePrincipleLesson(input.lesson);
  const matchingSignals = new Map<string, PrincipleCandidateSignal>();

  if (target) {
    for (const signal of input.signals) {
      if (
        signal.reviewedAt &&
        normalizePrincipleLesson(signal.lesson) === target
      ) {
        matchingSignals.set(`${signal.decisionId}\u0000${signal.outcomeId}`, signal);
      }
    }
  }

  const distinctDecisionIds = [
    ...new Set(
      [...matchingSignals.values()].map((signal) => signal.decisionId)
    ),
  ].sort();
  const distinctOutcomeIds = [
    ...new Set([...matchingSignals.values()].map((signal) => signal.outcomeId)),
  ].sort();

  if (
    distinctDecisionIds.length < requiredDistinctDecisions ||
    distinctOutcomeIds.length < requiredDistinctDecisions
  ) {
    return err({
      code: "insufficient_repeated_signal",
      requiredDistinctDecisions,
      supportingDecisionCount: distinctDecisionIds.length,
      supportingOutcomeCount: distinctOutcomeIds.length,
    });
  }

  const confidence: PrincipleCandidateConfidence =
    distinctDecisionIds.length >= 3 ? "high" : "medium";

  return ok({
    confidence,
    rationale: `Repeated review signal across ${distinctDecisionIds.length} distinct reviewed decisions and ${distinctOutcomeIds.length} outcomes.`,
    statement: cleanStatement(input.lesson),
    supportingDecisionIds: distinctDecisionIds,
    supportingOutcomeIds: distinctOutcomeIds,
  });
}
