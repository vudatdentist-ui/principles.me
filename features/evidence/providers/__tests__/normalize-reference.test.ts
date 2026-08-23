import assert from "node:assert/strict";
import test from "node:test";
import { normalizeReference } from "../normalize-reference";

const RETRIEVED_AT = "2026-08-21T08:00:00.000Z";

test("normalizes RAG provenance without losing identifiers", () => {
  const reference = normalizeReference({
    chunkId: "chunk-1",
    datasetId: "dataset-1",
    documentId: "document-1",
    index: 0,
    positions: [[1, 2, 3, 4]],
    retrievedAt: RETRIEVED_AT,
    score: "0.91",
    text: "  source excerpt  ",
    title: "  Source document  ",
  });

  assert.deepEqual(reference, {
    chunkId: "chunk-1",
    datasetId: "dataset-1",
    documentId: "document-1",
    key: "R1",
    observedAt: null,
    positions: [[1, 2, 3, 4]],
    provider: "ragflow",
    publishedAt: null,
    retrievedAt: RETRIEVED_AT,
    score: 0.91,
    sourceType: "ragflow",
    text: "source excerpt",
    title: "Source document",
    url: null,
  });
});

test("citation identity is stable for the same RAG chunk", () => {
  const input = {
    chunkId: "chunk-stable",
    documentId: "doc-stable",
    index: 3,
    retrievedAt: RETRIEVED_AT,
    score: 0.7,
    text: "A traceable source excerpt.",
    title: "Stable source",
  };

  const first = normalizeReference(input);
  const second = normalizeReference(input);

  assert.deepEqual(first, second);
  assert.equal(first?.key, "R4");
  assert.equal(first?.title, "Stable source");
});

test("uses document identity when a RAG chunk has no title", () => {
  const reference = normalizeReference({
    documentId: "document-without-title",
    index: 0,
    retrievedAt: RETRIEVED_AT,
    text: "Excerpt with a traceable document id.",
    title: null,
  });

  assert.equal(reference?.title, "Document document-wit");
});
