import type { DecisionBrief } from "@/features/decision/contracts";
import {
  type DecisionStage,
  type DecisionStreamEvent,
  decisionStreamEventSchema,
} from "@/features/decision/stream-events";
import type { EvidenceReference } from "@/features/evidence/contracts";

export type DecisionTransportProgress = {
  message?: string;
  references?: readonly EvidenceReference[];
  stage: DecisionStage;
};

export type DecisionTransportResult = {
  brief: DecisionBrief;
  runId: string;
};

export type DecisionTransportRunInput = {
  onProgress?: (progress: DecisionTransportProgress) => void | Promise<void>;
  onStarted?: (runId: string) => void | Promise<void>;
  question: string;
  signal: AbortSignal;
  userId: string;
};

export type DecisionTransportRunner = (
  input: DecisionTransportRunInput
) => Promise<DecisionTransportResult>;

const DEFAULT_STAGE_MESSAGES: Record<DecisionStage, string> = {
  analysis: "Analyzing the decision.",
  audit: "Auditing the recommendation.",
  context: "Preparing decision context.",
  "live-data": "Checking live data.",
  persistence: "Saving the run snapshot.",
  retrieval: "Retrieving relevant evidence.",
  revision: "Revising the recommendation.",
};

export function startedEvent(runId: string): DecisionStreamEvent {
  return decisionStreamEventSchema.parse({ runId, type: "started" });
}

export function progressEvents(
  progress: DecisionTransportProgress
): DecisionStreamEvent[] {
  const events: DecisionStreamEvent[] = [
    decisionStreamEventSchema.parse({
      message: progress.message?.trim() || DEFAULT_STAGE_MESSAGES[progress.stage],
      stage: progress.stage,
      type: "status",
    }),
  ];

  if (progress.references !== undefined) {
    events.push(
      decisionStreamEventSchema.parse({
        references: [...progress.references],
        type: "evidence",
      })
    );
  }

  return events;
}

export function completedEvents(
  result: DecisionTransportResult
): DecisionStreamEvent[] {
  return [
    decisionStreamEventSchema.parse({ brief: result.brief, type: "brief" }),
    decisionStreamEventSchema.parse({ type: "done" }),
  ];
}

export type SafeDecisionError = {
  code: string;
  message: string;
  retryable: boolean;
};

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export function toSafeDecisionError(error: unknown): SafeDecisionError {
  if (isAbortError(error)) {
    return {
      code: "aborted",
      message: "Decision run was cancelled.",
      retryable: true,
    };
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "retryable" in error
  ) {
    const candidate = error as { code?: unknown; retryable?: unknown };
    const code = typeof candidate.code === "string" ? candidate.code : "run_failed";
    const retryable =
      typeof candidate.retryable === "boolean" ? candidate.retryable : false;

    const knownMessages: Record<string, string> = {
      aborted: "Decision run was cancelled.",
      invalid_model_output: "Decision generation returned an invalid result.",
      invalid_response: "A decision dependency returned an invalid response.",
      orchestrator_unavailable: "Decision orchestration is temporarily unavailable.",
      provider_error: "A decision dependency is temporarily unavailable.",
      rate_limited: "A decision dependency is busy. Try again shortly.",
      timeout: "Decision generation timed out.",
      unauthorized: "A decision dependency could not be authorized.",
    };

    return {
      code: code in knownMessages ? code : "run_failed",
      message: knownMessages[code] ?? "Decision generation failed.",
      retryable,
    };
  }

  return {
    code: "run_failed",
    message: "Decision generation failed.",
    retryable: false,
  };
}

export function errorEvent(error: unknown): DecisionStreamEvent {
  const safe = toSafeDecisionError(error);
  return decisionStreamEventSchema.parse({
    code: safe.code,
    message: safe.message,
    retryable: safe.retryable,
    type: "error",
  });
}
