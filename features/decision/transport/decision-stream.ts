import {
  completedEvents,
  errorEvent,
  progressEvents,
  startedEvent,
  toSafeDecisionError,
  type DecisionTransportProgress,
  type DecisionTransportRunner,
} from "./event-adapter";
import { encodeDecisionStreamEvent } from "./ndjson-response";

export type DecisionStreamInput = {
  question: string;
  runner: DecisionTransportRunner;
  signal: AbortSignal;
  userId: string;
};

function writeFailureLog(runId: string, error: unknown): void {
  const safe = toSafeDecisionError(error);
  process.stderr.write(
    `${JSON.stringify({
      code: safe.code,
      event: "decision_run_failed",
      retryable: safe.retryable,
      runId: runId || null,
    })}\n`
  );
}

export function createDecisionStream({
  question,
  runner,
  signal,
  userId,
}: DecisionStreamInput): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let failureEmitted = false;
      let started = false;
      let startedRunId = "";

      const close = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      const enqueue = (chunk: Uint8Array) => {
        if (!closed) {
          controller.enqueue(chunk);
        }
      };

      const onStarted = (runId: string) => {
        if (started) {
          throw new Error("Decision run emitted started more than once.");
        }
        if (signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        started = true;
        startedRunId = runId;
        enqueue(encodeDecisionStreamEvent(startedEvent(runId)));
      };

      const onProgress = (progress: DecisionTransportProgress) => {
        if (!started) {
          throw new Error("Decision run emitted progress before started.");
        }
        if (signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        for (const event of progressEvents(progress)) {
          enqueue(encodeDecisionStreamEvent(event));
        }
      };

      try {
        const result = await runner({
          onProgress,
          onStarted,
          question,
          signal,
          userId,
        });
        if (signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        if (!started) {
          throw new Error("Decision run completed without a started event.");
        }
        if (result.runId.trim().length === 0) {
          throw new Error("Decision run completed without an id.");
        }
        if (result.runId !== startedRunId) {
          throw new Error("Decision run id changed during streaming.");
        }
        for (const event of completedEvents(result)) {
          enqueue(encodeDecisionStreamEvent(event));
        }
        close();
      } catch (error) {
        writeFailureLog(startedRunId, error);
        if (!failureEmitted && !closed) {
          failureEmitted = true;
          enqueue(encodeDecisionStreamEvent(errorEvent(error)));
        }
        close();
      }
    },
  });
}
