import assert from "node:assert/strict";
import test from "node:test";
import type { DecisionBrief } from "@/features/decision/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { AskForm } from "../ask-form";
import { DecisionBriefView } from "../decision-brief-view";
import { EvidenceDrawerContent } from "../evidence-drawer-content";

const source: DecisionBrief["sources"][number] = {
  chunkId: "secret-chunk-id",
  datasetId: "secret-dataset-id",
  documentId: "secret-document-id",
  key: "W1",
  observedAt: null,
  positions: [{ page: 3 }],
  provider: "web-search",
  publishedAt: "2026-08-20T08:00:00.000Z",
  retrievedAt: "2026-08-21T08:00:00.000Z",
  score: 0.91,
  sourceType: "web",
  text: "A normalized excerpt that directly supports the factual reason.",
  title: "Relevant source",
  url: "https://www.example.com/source?article=1",
};

const ignoreQuestionChange = (_question: string): undefined => undefined;
const ignoreSubmit = (_question: string): undefined => undefined;
const ignoreAccept = (_brief: DecisionBrief): undefined => undefined;

function makeBrief(sources: DecisionBrief["sources"] = [source]): DecisionBrief {
  return {
    confidence: {
      explanation: sources.length
        ? "The evidence supports the recommendation with one remaining unknown."
        : "No source-backed facts are available.",
      level: sources.length ? "medium" : "low",
    },
    counterCase: "A new constraint could make the recommendation wrong.",
    id: "decision-render",
    nextAction: "Resolve the remaining unknown before committing fully.",
    question: "Should we proceed with the plan?",
    reasons: sources.length
      ? [
          {
            citationKeys: ["W1"],
            id: "reason-1",
            kind: "fact",
            text: "The current source supports the primary factual constraint.",
          },
          {
            citationKeys: [],
            id: "reason-2",
            kind: "inference",
            text: "A reversible first step reduces downside.",
          },
          {
            citationKeys: [],
            id: "reason-3",
            kind: "user-context",
            text: "The user's stated preference favors flexibility.",
          },
        ]
      : [
          {
            citationKeys: [],
            id: "reason-low",
            kind: "inference",
            text: "A firm recommendation would be unreliable without evidence.",
          },
        ],
    recommendation: sources.length
      ? "Proceed with a small, reversible first step."
      : "Wait until minimum evidence is available.",
    review: {
      suggestedAt: null,
      trigger: "Review when the missing information changes materially.",
    },
    runId: "run-render",
    schemaVersion: "1",
    sources,
    unknowns: ["One material variable is still unknown."],
    validAsOf: "2026-08-21T08:00:00.000Z",
  };
}

test("DecisionBrief renders memo content, citations, and required actions", () => {
  const html = renderToStaticMarkup(<DecisionBriefView brief={makeBrief()} />);

  assert.match(html, /Proceed with a small, reversible first step\./);
  assert.match(html, /Medium confidence/);
  assert.match(html, /What could make this wrong/);
  assert.match(html, /Next action/);
  assert.match(html, /Unknowns/);
  assert.match(html, /Review when/);
  assert.match(html, /W1/);
  assert.match(html, />Accept</);
  assert.match(html, />Adjust</);
  assert.match(html, />View evidence</);
  assert.doesNotMatch(html, /thinker|agent|evidence judge|model selector|prompt/i);
});

test("Accept stays disabled until an integration callback is available", () => {
  const disabledHtml = renderToStaticMarkup(
    <DecisionBriefView brief={makeBrief()} />
  );
  const enabledHtml = renderToStaticMarkup(
    <DecisionBriefView brief={makeBrief()} onAccept={ignoreAccept} />
  );
  const disabledAccept = disabledHtml.match(/<button[^>]*>Accept<\/button>/)?.[0];
  const enabledAccept = enabledHtml.match(/<button[^>]*>Accept<\/button>/)?.[0];

  assert.ok(disabledAccept);
  assert.match(disabledAccept, /disabled=""/);
  assert.ok(enabledAccept);
  assert.doesNotMatch(enabledAccept, /disabled=""/);
});

test("no-source low-confidence brief remains explicit and disables evidence action", () => {
  const html = renderToStaticMarkup(
    <DecisionBriefView brief={makeBrief([])} />
  );

  assert.match(html, /Low confidence/);
  assert.match(html, /View evidence/);
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /W1/);
});

test("evidence content shows normalized provenance and hides provider internals", () => {
  const html = renderToStaticMarkup(
    <EvidenceDrawerContent sources={[source]} />
  );

  assert.match(html, /Relevant source/);
  assert.match(html, /Web source/);
  assert.match(html, /Web Search/);
  assert.match(html, /Retrieved/);
  assert.match(html, /Published/);
  assert.match(html, /example\.com/);
  assert.match(html, /normalized excerpt/i);
  assert.doesNotMatch(
    html,
    /secret-chunk-id|secret-dataset-id|secret-document-id|0\.91/
  );
});

test("empty evidence state is concise", () => {
  const html = renderToStaticMarkup(<EvidenceDrawerContent sources={[]} />);
  assert.match(html, /No evidence attached\./);
});

test("AskForm is semantic and makes plain Enter available for textarea input", () => {
  const html = renderToStaticMarkup(
    <AskForm
      onQuestionChange={ignoreQuestionChange}
      onSubmit={ignoreSubmit}
      question="Should we proceed?"
    />
  );

  assert.match(html, /<form/);
  assert.match(html, /<label/);
  assert.match(html, /<textarea/);
  assert.match(html, /required=""/);
  assert.match(html, /Ctrl\/⌘ \+ Enter/);
  assert.match(html, />Decide</);
});

test("pure rendering makes no network calls", () => {
  const previousFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = (() => {
    networkCalls += 1;
    throw new Error("Network access is forbidden in UI tests.");
  }) as typeof fetch;

  try {
    renderToStaticMarkup(<DecisionBriefView brief={makeBrief()} />);
    renderToStaticMarkup(<EvidenceDrawerContent sources={[source]} />);
    assert.equal(networkCalls, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
