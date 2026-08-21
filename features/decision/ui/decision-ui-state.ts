import type { DecisionBrief, DecisionReasonKind } from "@/features/decision/contracts";
import type {
  DecisionStage,
  DecisionStreamEvent,
} from "@/features/decision/stream-events";

export type DecisionUiPhase = "error" | "idle" | "result" | "submitting";

export type DecisionUiError = {
  code: string;
  message: string;
  retryable: boolean;
};

export type DecisionUiState = {
  brief: DecisionBrief | null;
  error: DecisionUiError | null;
  evidence: DecisionBrief["sources"];
  evidenceOpen: boolean;
  phase: DecisionUiPhase;
  runId: string | null;
  stage: DecisionStage | null;
  status: string | null;
};

export type DecisionUiAction =
  | { type: "evidence-open-changed"; open: boolean }
  | { type: "reset" }
  | { type: "stream-event"; event: DecisionStreamEvent }
  | { type: "submitted" };

export type DecisionBriefAction = "accept" | "adjust";

export type DecisionBriefActionCallbacks = {
  onAccept?: (brief: DecisionBrief) => void;
  onAdjust?: (brief: DecisionBrief) => void;
};

const STAGE_STATUS: Record<DecisionStage, string> = {
  analysis: "Weighing the tradeoffs.",
  audit: "Checking support and uncertainty.",
  context: "Reading your decision context.",
  "live-data": "Checking current context.",
  persistence: "Saving the decision record.",
  retrieval: "Gathering relevant evidence.",
  revision: "Refining the decision brief.",
};

export function createDecisionUiState(): DecisionUiState {
  return {
    brief: null,
    error: null,
    evidence: [],
    evidenceOpen: false,
    phase: "idle",
    runId: null,
    stage: null,
    status: null,
  };
}

export function safeStageStatus(stage: DecisionStage): string {
  return STAGE_STATUS[stage];
}

export function decisionErrorDisplayMessage(error: DecisionUiError): string {
  return error.retryable
    ? "We could not finish this decision brief. You can try again."
    : "We could not finish this decision brief. Review the question and try again when the required context is available.";
}

export function confidenceLabel(
  level: DecisionBrief["confidence"]["level"]
): string {
  switch (level) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence";
  }
}

export function reasonKindLabel(kind: DecisionReasonKind): string {
  switch (kind) {
    case "fact":
      return "Fact";
    case "inference":
      return "Inference";
    case "user-context":
      return "Your context";
  }
}

export function visibleDecisionReasons(
  brief: DecisionBrief
): DecisionBrief["reasons"] {
  return brief.reasons.slice(0, 3);
}

export function invokeDecisionBriefAction(
  action: DecisionBriefAction,
  brief: DecisionBrief,
  callbacks: DecisionBriefActionCallbacks
): void {
  if (action === "accept") {
    callbacks.onAccept?.(brief);
    return;
  }

  callbacks.onAdjust?.(brief);
}

function reduceStreamEvent(
  state: DecisionUiState,
  event: DecisionStreamEvent
): DecisionUiState {
  switch (event.type) {
    case "started":
      return {
        ...state,
        brief: null,
        error: null,
        evidence: [],
        evidenceOpen: false,
        phase: "submitting",
        runId: event.runId,
        stage: null,
        status: "Preparing your decision brief.",
      };
    case "status":
      return {
        ...state,
        phase: "submitting",
        stage: event.stage,
        status: safeStageStatus(event.stage),
      };
    case "evidence":
      return {
        ...state,
        evidence: event.references,
      };
    case "brief":
      return {
        ...state,
        brief: event.brief,
        error: null,
        evidence: event.brief.sources,
        phase: "result",
        runId: event.brief.runId,
        stage: null,
        status: null,
      };
    case "error":
      return {
        ...state,
        error: {
          code: event.code,
          message: event.message,
          retryable: event.retryable,
        },
        evidenceOpen: false,
        phase: "error",
        stage: null,
        status: null,
      };
    case "done":
      if (state.brief) {
        return { ...state, phase: "result", stage: null, status: null };
      }
      if (state.error) {
        return { ...state, phase: "error", stage: null, status: null };
      }
      return {
        ...state,
        error: {
          code: "INCOMPLETE_DECISION_RUN",
          message: "Decision run completed without a Decision Brief.",
          retryable: true,
        },
        evidenceOpen: false,
        phase: "error",
        stage: null,
        status: null,
      };
  }
}

export function reduceDecisionUiState(
  state: DecisionUiState,
  action: DecisionUiAction
): DecisionUiState {
  switch (action.type) {
    case "submitted":
      return {
        ...createDecisionUiState(),
        phase: "submitting",
        status: "Preparing your decision brief.",
      };
    case "stream-event":
      return reduceStreamEvent(state, action.event);
    case "evidence-open-changed":
      return {
        ...state,
        evidenceOpen: action.open && state.evidence.length > 0,
      };
    case "reset":
      return createDecisionUiState();
  }
}

export function reduceDecisionStreamEvents(
  events: readonly DecisionStreamEvent[],
  initialState: DecisionUiState = createDecisionUiState()
): DecisionUiState {
  return events.reduce(
    (state, event) =>
      reduceDecisionUiState(state, { event, type: "stream-event" }),
    initialState
  );
}
