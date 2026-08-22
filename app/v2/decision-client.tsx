"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  createDecisionStreamDecoder,
  type DecisionStreamEvent,
} from "@/features/decision/stream-events";
import {
  createDecisionUiState,
  reduceDecisionUiState,
} from "@/features/decision/ui/decision-ui-state";
import { DecisionWorkspace } from "@/features/decision/ui/decision-workspace";

const DECISION_ENDPOINT = "/api/v2/decisions";

type ApiErrorPayload = {
  error?: {
    code?: unknown;
    message?: unknown;
  };
};

type DecisionEventHandler = (events: readonly DecisionStreamEvent[]) => void;
type DecisionStreamDecoder = ReturnType<typeof createDecisionStreamDecoder>;

function fallbackErrorEvent(
  code: string,
  message: string,
  retryable: boolean
): DecisionStreamEvent {
  return { code, message, retryable, type: "error" };
}

async function responseErrorEvent(response: Response): Promise<DecisionStreamEvent> {
  let payload: ApiErrorPayload | null = null;
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = null;
  }

  const code =
    typeof payload?.error?.code === "string" && payload.error.code.trim()
      ? payload.error.code.trim()
      : `http_${response.status}`;
  const message =
    typeof payload?.error?.message === "string" && payload.error.message.trim()
      ? payload.error.message.trim()
      : "The decision request could not be started.";

  return fallbackErrorEvent(
    code,
    message,
    response.status === 429 || response.status >= 500
  );
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

async function readDecisionChunks(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  textDecoder: TextDecoder,
  streamDecoder: DecisionStreamDecoder,
  applyEvents: DecisionEventHandler
): Promise<void> {
  const { done, value } = await reader.read();
  if (done) {
    return;
  }

  applyEvents(streamDecoder.push(textDecoder.decode(value, { stream: true })));
  return readDecisionChunks(reader, textDecoder, streamDecoder, applyEvents);
}

export function V2DecisionClient() {
  const [question, setQuestion] = useState("");
  const [state, dispatch] = useReducer(
    reduceDecisionUiState,
    undefined,
    createDecisionUiState
  );
  const activeRequestRef = useRef<AbortController | null>(null);
  const lastQuestionRef = useRef("");

  useEffect(
    () => () => {
      activeRequestRef.current?.abort();
    },
    []
  );

  const dispatchEvent = useCallback((event: DecisionStreamEvent) => {
    dispatch({ event, type: "stream-event" });
  }, []);

  const runDecision = useCallback(
    async (submittedQuestion: string) => {
      activeRequestRef.current?.abort();
      const controller = new AbortController();
      activeRequestRef.current = controller;
      lastQuestionRef.current = submittedQuestion;
      dispatch({ type: "submitted" });

      try {
        const response = await fetch(DECISION_ENDPOINT, {
          body: JSON.stringify({ question: submittedQuestion }),
          headers: { "content-type": "application/json" },
          method: "POST",
          signal: controller.signal,
        });

        if (!response.ok) {
          dispatchEvent(await responseErrorEvent(response));
          return;
        }

        if (!response.headers.get("content-type")?.includes("application/x-ndjson")) {
          dispatchEvent(
            fallbackErrorEvent(
              "invalid_response",
              "The decision service returned an unexpected response.",
              true
            )
          );
          return;
        }

        if (!response.body) {
          dispatchEvent(
            fallbackErrorEvent(
              "invalid_response",
              "The decision service returned an empty response.",
              true
            )
          );
          return;
        }

        const reader = response.body.getReader();
        const textDecoder = new TextDecoder();
        const streamDecoder = createDecisionStreamDecoder();
        let terminated = false;

        const applyEvents = (events: readonly DecisionStreamEvent[]) => {
          for (const event of events) {
            dispatchEvent(event);
            if (event.type === "done" || event.type === "error") {
              terminated = true;
            }
          }
        };

        await readDecisionChunks(reader, textDecoder, streamDecoder, applyEvents);

        const decoderTail = textDecoder.decode();
        if (decoderTail) {
          applyEvents(streamDecoder.push(decoderTail));
        }
        applyEvents(streamDecoder.finish());

        if (!terminated) {
          dispatchEvent(
            fallbackErrorEvent(
              "incomplete_stream",
              "The decision stream ended before completion.",
              true
            )
          );
        }
      } catch (error) {
        if (!isAbortError(error)) {
          dispatchEvent(
            fallbackErrorEvent(
              "network_error",
              "The decision service could not be reached.",
              true
            )
          );
        }
      } finally {
        if (activeRequestRef.current === controller) {
          activeRequestRef.current = null;
        }
      }
    },
    [dispatchEvent]
  );

  const handleSubmit = useCallback(
    (submittedQuestion: string) => runDecision(submittedQuestion),
    [runDecision]
  );

  const handleRetry = useCallback(() => {
    const lastQuestion = lastQuestionRef.current;
    return lastQuestion ? runDecision(lastQuestion) : Promise.resolve();
  }, [runDecision]);

  const handleEvidenceOpenChange = useCallback((open: boolean) => {
    dispatch({ open, type: "evidence-open-changed" });
  }, []);

  const handleAdjust = useCallback(() => {
    dispatch({ type: "reset" });
  }, []);

  return (
    <DecisionWorkspace
      onAdjust={handleAdjust}
      onEvidenceOpenChange={handleEvidenceOpenChange}
      onQuestionChange={setQuestion}
      onRetry={handleRetry}
      onSubmit={handleSubmit}
      question={question}
      state={state}
    />
  );
}
