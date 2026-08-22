import assert from "node:assert/strict";
import test from "node:test";
import type { DecisionOrchestrator } from "@/features/decision/orchestration";
import { createOrchestratorTransportRunner } from "@/features/decision/transport/orchestrator-runner";
import {
  decisionBriefFixture,
  evidenceFixture,
} from "@/tests/v2/fixtures/decision";

test("orchestrator adapter starts the stream before forwarding progress", async () => {
  const observed: string[] = [];
  const orchestrator: DecisionOrchestrator = {
    run: async (request) => {
      await request.onProgress?.({ runId: "run-v2-001", stage: "context" });
      await request.onProgress?.({ runId: "run-v2-001", stage: "retrieval" });
      await request.onProgress?.({
        references: [evidenceFixture],
        runId: "run-v2-001",
        stage: "analysis",
      });
      return {
        brief: decisionBriefFixture,
        evidence: [evidenceFixture],
        revisionApplied: false,
        runId: "run-v2-001",
      };
    },
  };

  const runner = createOrchestratorTransportRunner(orchestrator);
  const result = await runner({
    onProgress: (progress) => {
      observed.push(
        progress.references
          ? `${progress.stage}:evidence`
          : progress.stage
      );
    },
    onStarted: (runId) => {
      observed.push(`started:${runId}`);
    },
    question: decisionBriefFixture.question,
    signal: new AbortController().signal,
    userId: "user-v2-001",
  });

  assert.deepEqual(observed, [
    "started:run-v2-001",
    "context",
    "retrieval",
    "analysis:evidence",
  ]);
  assert.equal(result.runId, "run-v2-001");
  assert.equal(result.brief, decisionBriefFixture);
});

test("orchestrator adapter rejects run identity changes", async () => {
  const orchestrator: DecisionOrchestrator = {
    run: async (request) => {
      await request.onProgress?.({ runId: "run-a", stage: "context" });
      await request.onProgress?.({ runId: "run-b", stage: "retrieval" });
      return {
        brief: decisionBriefFixture,
        evidence: [],
        revisionApplied: false,
        runId: "run-b",
      };
    },
  };

  const runner = createOrchestratorTransportRunner(orchestrator);

  await assert.rejects(
    () =>
      runner({
        question: decisionBriefFixture.question,
        signal: new AbortController().signal,
        userId: "user-v2-001",
      }),
    (error: unknown) => {
      assert.equal(
        (error as { code?: string }).code,
        "internal_error"
      );
      return true;
    }
  );
});
