import assert from "node:assert/strict";
import test from "node:test";
import type { EvidenceReference } from "../contracts";
import { projectEvidenceForClient } from "../client-reference";

const reference: EvidenceReference = {
  chunkId: "private-chunk-id",
  datasetId: "private-dataset-id",
  documentId: "private-document-id",
  key: "R1",
  observedAt: null,
  positions: [[1, 2, 3, 4]],
  provider: "ragflow",
  publishedAt: null,
  retrievedAt: "2026-08-23T10:00:00.000Z",
  score: 0.92,
  sourceType: "ragflow",
  text: `secret ${"private evidence ".repeat(40)}`,
  title: "Internal source",
  url: "https://internal.example/document?token=private-token",
};

test("client evidence projection strips private retrieval metadata, URLs and full text", () => {
  const projected = projectEvidenceForClient(reference);
  const serialized = JSON.stringify(projected);

  assert.equal(projected.key, "R1");
  assert.equal(projected.title, "Internal source");
  assert.equal(projected.url, null);
  assert.ok(projected.snippet.length <= 360);
  assert.equal("text" in projected, false);
  assert.equal("datasetId" in projected, false);
  assert.equal("documentId" in projected, false);
  assert.equal("chunkId" in projected, false);
  assert.equal("positions" in projected, false);
  assert.equal("score" in projected, false);
  assert.equal(serialized.includes("private-dataset-id"), false);
  assert.equal(serialized.includes("private-document-id"), false);
  assert.equal(serialized.includes("private-chunk-id"), false);
  assert.equal(serialized.includes("private-token"), false);
  assert.equal(serialized.includes(reference.text), false);
});

test("client evidence projection preserves public live-search URLs", () => {
  const live = projectEvidenceForClient({
    ...reference,
    chunkId: null,
    datasetId: null,
    documentId: null,
    key: "W1",
    provider: "brave",
    sourceType: "live_web",
    url: "https://example.com/public",
  });
  assert.equal(live.url, "https://example.com/public");
});
