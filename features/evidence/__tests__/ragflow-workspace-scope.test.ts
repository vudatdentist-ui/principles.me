import assert from "node:assert/strict";
import test from "node:test";
import { RagflowEvidenceProvider } from "../providers/ragflow-provider";

test("explicit empty workspace dataset scope never falls back to global RAG datasets", async () => {
  let fetched = false;
  const provider = new RagflowEvidenceProvider({
    env: {
      RAGFLOW_API_KEY: "configured",
      RAGFLOW_DATASET_IDS: "global-dataset-that-must-not-leak",
    },
    fetch: () => {
      fetched = true;
      throw new Error("fetch must not run for an empty workspace scope");
    },
    now: () => new Date("2026-08-23T10:00:00.000Z"),
  });

  const result = await provider.retrieve(
    { datasetIds: [], question: "What is private?" },
    new AbortController().signal
  );

  assert.equal(fetched, false);
  assert.deepEqual(result, {
    references: [],
    retrievedAt: "2026-08-23T10:00:00.000Z",
  });
});
