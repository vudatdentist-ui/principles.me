import assert from "node:assert/strict";
import test from "node:test";
import type { EvidenceProvider } from "../evidence-provider";
import { createBestEffortEvidenceProvider } from "../best-effort-provider";
import { EvidenceProviderError } from "../provider-error";

const NOW = new Date("2026-08-23T03:00:00.000Z");

test("degrades provider failures to an empty evidence packet", async () => {
  const provider: EvidenceProvider = {
    id: "ragflow",
    retrieve() {
      return Promise.reject(new EvidenceProviderError("ragflow", "timeout"));
    },
  };
  const wrapped = createBestEffortEvidenceProvider(provider, { now: () => NOW });

  const result = await wrapped.retrieve(
    { question: "Should we pilot this change?" },
    new AbortController().signal
  );

  assert.deepEqual(result, { references: [], retrievedAt: NOW.toISOString() });
});

test("never swallows caller cancellation", async () => {
  const controller = new AbortController();
  const provider: EvidenceProvider = {
    id: "ragflow",
    retrieve(_request, signal) {
      controller.abort(new DOMException("Cancelled", "AbortError"));
      return Promise.reject(
        new EvidenceProviderError("ragflow", "aborted", { cause: signal.reason })
      );
    },
  };
  const wrapped = createBestEffortEvidenceProvider(provider, { now: () => NOW });

  await assert.rejects(
    wrapped.retrieve({ question: "Should we pilot this change?" }, controller.signal),
    (error: unknown) =>
      error instanceof EvidenceProviderError && error.code === "aborted"
  );
});
