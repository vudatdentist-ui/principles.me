import assert from "node:assert/strict";
import test from "node:test";
import type { DecisionBrief } from "@/features/decision/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { EvidenceDrawerContent } from "../evidence-drawer-content";

const baseSource: DecisionBrief["sources"][number] = {
  chunkId: "chunk-1",
  datasetId: "dataset-1",
  documentId: "document-1",
  key: "W1",
  observedAt: null,
  positions: [],
  provider: "web-search",
  publishedAt: null,
  retrievedAt: "2026-08-21T08:00:00.000Z",
  score: 0.9,
  sourceType: "web",
  text: "Evidence excerpt.",
  title: "Evidence source",
  url: "https://example.com/source",
};

test("evidence drawer renders only http and https source links", () => {
  const safeHtml = renderToStaticMarkup(
    <EvidenceDrawerContent sources={[baseSource]} />
  );
  assert.match(safeHtml, /href="https:\/\/example\.com\/source"/);

  const unsafeHtml = renderToStaticMarkup(
    <EvidenceDrawerContent
      sources={[{ ...baseSource, url: "javascript:alert(1)" }]}
    />
  );
  assert.doesNotMatch(unsafeHtml, /href=/);
  assert.doesNotMatch(unsafeHtml, /javascript:/i);
});
