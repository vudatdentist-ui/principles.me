import assert from "node:assert/strict";
import test from "node:test";
import { normalizeReference } from "../normalize-reference";

const RETRIEVED_AT = "2026-08-21T08:00:00.000Z";

test("normalizes provenance without losing provider identifiers", () => {
  const reference = normalizeReference({
    chunkId: "chunk-1",
    datasetId: "dataset-1",
    documentId: "document-1",
    index: 0,
    keyPrefix: "R",
    positions: [[1, 2, 3, 4]],
    provider: "ragflow",
    retrievedAt: RETRIEVED_AT,
    score: "0.91",
    sourceType: "ragflow",
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

test("citation and source identity are stable for the same provider-local item", () => {
  const input = {
    index: 3,
    keyPrefix: "W" as const,
    provider: "web-search",
    publishedAt: "2026-08-20T06:00:00.000Z",
    requireUrl: true,
    retrievedAt: RETRIEVED_AT,
    score: 0.7,
    sourceType: "web" as const,
    text: "A traceable source excerpt.",
    title: "Stable source",
    url: "https://example.com/source",
  };

  const first = normalizeReference(input);
  const second = normalizeReference(input);

  assert.deepEqual(first, second);
  assert.equal(first?.key, "W4");
  assert.equal(first?.url, "https://example.com/source");
  assert.equal(first?.title, "Stable source");
});

test("does not return untraceable web evidence", () => {
  assert.equal(
    normalizeReference({
      index: 0,
      keyPrefix: "W",
      provider: "web-search",
      requireUrl: true,
      retrievedAt: RETRIEVED_AT,
      sourceType: "web",
      text: "Excerpt with no source URL.",
      title: "Missing URL",
    }),
    null
  );
});
