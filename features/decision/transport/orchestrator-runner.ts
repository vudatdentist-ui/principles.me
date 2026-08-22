import type { DecisionOrchestrator } from "@/features/decision/orchestration";
import type { DecisionTransportRunner } from "./event-adapter";

function runIdMismatch(): Error & { code: string; retryable: boolean } {
  return Object.assign(new Error("Decision run identity changed during streaming."), {
    code: "internal_error",
    retryable: false,
  });
}

export function createOrchestratorTransportRunner(
  orchestrator: DecisionOrchestrator
): DecisionTransportRunner {
  return async (input) => {
    let startedRunId: string | null = null;

    const result = await orchestrator.run({
      onProgress: async (progress) => {
        if (startedRunId === null) {
          startedRunId = progress.runId;
          await input.onStarted?.(progress.runId);
        } else if (startedRunId !== progress.runId) {
          throw runIdMismatch();
        }

        await input.onProgress?.({
          ...(progress.references === undefined
            ? {}
            : { references: progress.references }),
          stage: progress.stage,
        });
      },
      question: input.question,
      signal: input.signal,
      userId: input.userId,
    });

    if (startedRunId === null) {
      startedRunId = result.runId;
      await input.onStarted?.(result.runId);
    } else if (startedRunId !== result.runId) {
      throw runIdMismatch();
    }

    return {
      brief: result.brief,
      runId: result.runId,
    };
  };
}
