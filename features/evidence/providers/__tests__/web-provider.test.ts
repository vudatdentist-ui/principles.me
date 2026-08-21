import assert from "node:assert/strict";
import test from "node:test";
import { EvidenceProviderError } from "../provider-error";
import { WebEvidenceProvider } from "../web-provider";

const NOW = new Date("2026-08-21T08:30:00.000Z");
const BASE_ENV = { TAVILY_API_KEY: "tavily-test-key" };

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    json: async () => payload,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

test("web success preserves URL, source title, retrieval time, and publication time", async () => {
  let requestedInit: RequestInit | undefined;
  const provider = new WebEvidenceProvider({
    env: BASE_ENV,
    fetch: async (input, init) => {
      assert.equal(String(input), "https://api.tavily.com/search");
      requestedInit = init;
      return jsonResponse({
        results: [
          {
            content: "A current, provider-returned excerpt.",
            published_date: "2026-08-20T02:00:00.000Z",
            score: 0.83,
            title: "Current source",
            url: "https://example.com/current-source",
          },
        ],
      });
    },
    now: () => NOW,
  });

  const result = await provider.retrieve(
    { question: "Current context" },
    new AbortController().signal
  );

  assert.deepEqual(JSON.parse(String(requestedInit?.body)), {
    api_key: "tavily-test-key",
    include_answer: false,
    include_raw_content: false,
    max_results: 5,
    query: "Current context",
    search_depth: "basic",
  });
  assert.deepEqual(result.references[0], {
    chunkId: null,
    datasetId: null,
    documentId: null,
    key: "W1",
    observedAt: null,
    positions: [],
    provider: "web-search",
    publishedAt: "2026-08-20T02:00:00.000Z",
    retrievedAt: NOW.toISOString(),
    score: 0.83,
    sourceType: "web",
    text: "A current, provider-returned excerpt.",
    title: "Current source",
    url: "https://example.com/current-source",
  });
});

test("web result without publication timestamp remains traceable", async () => {
  const provider = new WebEvidenceProvider({
    env: BASE_ENV,
    fetch: async () =>
      jsonResponse({
        results: [
          {
            content: "Excerpt without publication date.",
            title: "No date source",
            url: "https://example.com/no-date",
          },
        ],
      }),
    now: () => NOW,
  });

  const result = await provider.retrieve(
    { question: "No date" },
    new AbortController().signal
  );
  assert.equal(result.references[0]?.publishedAt, null);
  assert.equal(result.references[0]?.url, "https://example.com/no-date");
});

test("web rate limit is typed separately", async () => {
  const provider = new WebEvidenceProvider({
    env: BASE_ENV,
    fetch: async () => jsonResponse({ error: "limited" }, 429),
  });

  await assert.rejects(
    provider.retrieve(
      { question: "Rate limited" },
      new AbortController().signal
    ),
    (error: unknown) =>
      error instanceof EvidenceProviderError && error.code === "rate_limited"
  );
});

test("web provider HTTP failure is provider_error", async () => {
  const provider = new WebEvidenceProvider({
    env: BASE_ENV,
    fetch: async () => jsonResponse({ private: "raw payload" }, 503),
  });

  await assert.rejects(
    provider.retrieve(
      { question: "Provider error" },
      new AbortController().signal
    ),
    (error: unknown) => {
      assert.ok(error instanceof EvidenceProviderError);
      assert.equal(error.code, "provider_error");
      assert.equal(error.message.includes("raw payload"), false);
      return true;
    }
  );
});

test("web unauthorized response is typed without parsing a private body", async () => {
  let parsed = false;
  const provider = new WebEvidenceProvider({
    env: BASE_ENV,
    fetch: async () =>
      ({
        json: async () => {
          parsed = true;
          throw new Error("private response body");
        },
        ok: false,
        status: 401,
      }) as unknown as Response,
  });

  await assert.rejects(
    provider.retrieve(
      { question: "Unauthorized" },
      new AbortController().signal
    ),
    (error: unknown) =>
      error instanceof EvidenceProviderError && error.code === "unauthorized"
  );
  assert.equal(parsed, false);
});
