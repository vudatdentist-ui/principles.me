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

type ErrorPolicy = {
  message: string;
  retryable: boolean;
};

const SAFE_ERROR_POLICY = {
  aborted: {
    message: "Decision run was cancelled.",
    retryable: true,
  },
  evidence_provider_failed: {
    message: "Evidence retrieval failed.",
    retryable: true,
  },
  internal_error: {
    message: "Decision generation failed.",
    retryable: false,
  },
  invalid_model_output: {
    message: "Decision generation returned an invalid result.",
    retryable: false,
  },
  invalid_request: {
    message: "Decision request is invalid.",
    retryable: false,
  },
  invalid_response: {
    message: "A decision dependency returned an invalid response.",
    retryable: false,
  },
  model_failed: {
    message: "Decision model request failed.",
    retryable: true,
  },
  orchestrator_unavailable: {
    message: "Decision orchestration is temporarily unavailable.",
    retryable: true,
  },
  persistence_failed: {
    message: "Decision persistence failed.",
    retryable: true,
  },
  provider_error: {
    message: "A decision dependency is temporarily unavailable.",
    retryable: true,
  },
  rate_limited: {
    message: "A decision dependency is busy. Try again shortly.",
    retryable: true,
  },
  timeout: {
    message: "Decision generation timed out.",
    retryable: true,
  },
  unauthorized: {
    message: "A decision dependency could not be authorized.",
    retryable: false,
  },
  unsupported_citation: {
    message: "Decision generation referenced unsupported evidence.",
    retryable: false,
  },
} as const satisfies Record<string, ErrorPolicy>;

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function safeErrorCandidate(
  error: unknown
): { code?: string; retryable?: boolean } | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const candidate = error as { code?: unknown; retryable?: unknown };
  return {
    ...(typeof candidate.code === "string" ? { code: candidate.code } : {}),
    ...(typeof candidate.retryable === "boolean"
      ? { retryable: candidate.retryable }
      : {}),
  };
}

export function toSafeDecisionError(error: unknown): SafeDecisionError {
  if (isAbortError(error)) {
    return {
      code: "aborted",
      message: SAFE_ERROR_POLICY.aborted.message,
      retryable: SAFE_ERROR_POLICY.aborted.retryable,
    };
  }

  const candidate = safeErrorCandidate(error);
  if (candidate?.code) {
    const policy = SAFE_ERROR_POLICY[
      candidate.code as keyof typeof SAFE_ERROR_POLICY
    ] as ErrorPolicy | undefined;
    if (policy) {
      return {
        code: candidate.code,
        message: policy.message,
        retryable: candidate.retryable ?? policy.retryable,
      };
    }
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
