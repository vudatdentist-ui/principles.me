import assert from "node:assert/strict";
import test from "node:test";
import { BraveSearchEvidenceProvider } from "../brave-search-provider";
import { EvidenceProviderError } from "../provider-error";

const NOW = new Date("2026-08-23T12:00:00.000Z");
const BASE_ENV = { BRAVE_SEARCH_API_KEY: "test-key" };

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    json: async () => payload,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

test("Brave search normalizes live web results with W citation keys", async () => {
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  const provider = new BraveSearchEvidenceProvider({
    env: {
      ...BASE_ENV,
      BRAVE_SEARCH_COUNT: "4",
      BRAVE_SEARCH_COUNTRY: "VN",
      BRAVE_SEARCH_LANGUAGE: "vi",
    },
    fetch: (input, init) => {
      requestedUrl = String(input);
      requestedInit = init;
      return Promise.resolve(
        jsonResponse({
          web: {
            results: [
              {
                age: "2026-08-23T10:30:00.000Z",
                description: "Current market information.",
                title: "Market update",
                url: "https://example.com/market",
              },
              {
                description: "Second current source.",
                title: "Second source",
                url: "https://example.com/second",
              },
            ],
          },
        })
      );
    },
    now: () => NOW,
  });

  const result = await provider.retrieve(
    { question: "Thị trường hiện nay thế nào?" },
    new AbortController().signal
  );

  const parsedUrl = new URL(requestedUrl);
  assert.equal(parsedUrl.origin + parsedUrl.pathname, "https://api.search.brave.com/res/v1/web/search");
  assert.equal(parsedUrl.searchParams.get("count"), "4");
  assert.equal(parsedUrl.searchParams.get("country"), "VN");
  assert.equal(parsedUrl.searchParams.get("search_lang"), "vi");
  assert.equal(requestedInit?.method, "GET");
  assert.equal(
    (requestedInit?.headers as Record<string, string>)["x-subscription-token"],
    "test-key"
  );
  assert.deepEqual(
    result.references.map((reference) => ({
      key: reference.key,
      provider: reference.provider,
      publishedAt: reference.publishedAt,
      sourceType: reference.sourceType,
      title: reference.title,
      url: reference.url,
    })),
    [
      {
        key: "W1",
        provider: "brave",
        publishedAt: "2026-08-23T10:30:00.000Z",
        sourceType: "live_web",
        title: "Market update",
        url: "https://example.com/market",
      },
      {
        key: "W2",
        provider: "brave",
        publishedAt: null,
        sourceType: "live_web",
        title: "Second source",
        url: "https://example.com/second",
      },
    ]
  );
});

test("Brave search deduplicates URLs and skips unusable results", async () => {
  const provider = new BraveSearchEvidenceProvider({
    env: BASE_ENV,
    fetch: async () =>
      jsonResponse({
        web: {
          results: [
            { description: "A", title: "One", url: "https://example.com/a" },
            { description: "Duplicate", title: "Again", url: "https://example.com/a" },
            { description: "Missing URL", title: "Bad" },
          ],
        },
      }),
    now: () => NOW,
  });

  const result = await provider.retrieve(
    { question: "latest" },
    new AbortController().signal
  );
  assert.deepEqual(result.references.map((reference) => reference.key), ["W1"]);
});

test("Brave search maps unauthorized responses", async () => {
  const provider = new BraveSearchEvidenceProvider({
    env: BASE_ENV,
    fetch: async () => jsonResponse({}, 401),
  });

  await assert.rejects(
    provider.retrieve({ question: "latest" }, new AbortController().signal),
    (error: unknown) =>
      error instanceof EvidenceProviderError && error.code === "unauthorized"
  );
});
