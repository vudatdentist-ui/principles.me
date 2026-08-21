import assert from "node:assert/strict";
import test from "node:test";
import { RagflowEvidenceProvider } from "../ragflow-provider";
import { EvidenceProviderError } from "../provider-error";

const NOW = new Date("2026-08-21T08:15:00.000Z");
const BASE_ENV = {
  RAGFLOW_API_KEY: "test-key",
  RAGFLOW_DATASET_IDS: "dataset-a,dataset-b",
};

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    json: async () => payload,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

test("RAGFlow success normalizes multiple chunks and preserves legacy request conventions", async () => {
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  const fetchMock: typeof fetch = (input, init) => {
    requestedUrl = String(input);
    requestedInit = init;
    return Promise.resolve(
      jsonResponse({
        code: 0,
        data: {
          chunks: [
            {
              content: "First excerpt",
              dataset_id: "dataset-a",
              document_id: "doc-a",
              document_name: "Document A",
              id: "chunk-a",
              positions: [[12, 0, 12, 480]],
              similarity: 0.92,
            },
            {
              chunk_id: "chunk-b",
              content_with_weight: "Second excerpt",
              dataset_id: "dataset-b",
              doc_id: "doc-b",
              docnm_kwd: "Document B",
              similarity: "0.81",
            },
          ],
        },
      })
    );
  };

  const provider = new RagflowEvidenceProvider({
    env: {
      ...BASE_ENV,
      RAGFLOW_BASE_URL: "https://rag.example/api/v1/",
      RAGFLOW_KEYWORD_SEARCH: "false",
      RAGFLOW_SIMILARITY_THRESHOLD: "0.3",
      RAGFLOW_TOP_K: "7",
      RAGFLOW_VECTOR_SIMILARITY_WEIGHT: "0.4",
    },
    fetch: fetchMock,
    now: () => NOW,
  });

  const result = await provider.retrieve(
    { question: "What evidence matters?" },
    new AbortController().signal
  );

  assert.equal(requestedUrl, "https://rag.example/api/v1/retrieval");
  assert.equal(requestedInit?.method, "POST");
  assert.equal(
    (requestedInit?.headers as Record<string, string>).authorization,
    "Bearer test-key"
  );
  assert.deepEqual(JSON.parse(String(requestedInit?.body)), {
    dataset_ids: ["dataset-a", "dataset-b"],
    document_ids: [],
    highlight: false,
    keyword: false,
    page: 1,
    page_size: 7,
    question: "What evidence matters?",
    similarity_threshold: 0.3,
    top_k: 7,
    vector_similarity_weight: 0.4,
  });

  assert.equal(result.retrievedAt, NOW.toISOString());
  assert.deepEqual(
    result.references.map((reference) => ({
      chunkId: reference.chunkId,
      datasetId: reference.datasetId,
      documentId: reference.documentId,
      key: reference.key,
      score: reference.score,
      text: reference.text,
      title: reference.title,
    })),
    [
      {
        chunkId: "chunk-a",
        datasetId: "dataset-a",
        documentId: "doc-a",
        key: "R1",
        score: 0.92,
        text: "First excerpt",
        title: "Document A",
      },
      {
        chunkId: "chunk-b",
        datasetId: "dataset-b",
        documentId: "doc-b",
        key: "R2",
        score: 0.81,
        text: "Second excerpt",
        title: "Document B",
      },
    ]
  );
  assert.ok(result.references.every((reference) => reference.provider === "ragflow"));
  assert.ok(result.references.every((reference) => reference.sourceType === "ragflow"));
});

test("RAGFlow empty retrieval is a valid result", async () => {
  const provider = new RagflowEvidenceProvider({
    env: BASE_ENV,
    fetch: async () => jsonResponse({ code: 0, data: { chunks: [] } }),
    now: () => NOW,
  });

  const result = await provider.retrieve(
    { question: "No matches" },
    new AbortController().signal
  );
  assert.deepEqual(result, { references: [], retrievedAt: NOW.toISOString() });
});

test("RAGFlow timeout is distinct from provider failure", async () => {
  const fetchMock: typeof fetch = async (_input, init) =>
    await new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      signal?.addEventListener(
        "abort",
        () => reject(new DOMException("aborted", "AbortError")),
        { once: true }
      );
    });
  const provider = new RagflowEvidenceProvider({
    env: { ...BASE_ENV, RAGFLOW_TIMEOUT_MS: "5" },
    fetch: fetchMock,
  });

  await assert.rejects(
    provider.retrieve(
      { question: "Timeout please" },
      new AbortController().signal
    ),
    (error: unknown) =>
      error instanceof EvidenceProviderError && error.code === "timeout"
  );
});

test("RAGFlow distinguishes a caller abort while fetch is in flight", async () => {
  const fetchMock: typeof fetch = async (_input, init) =>
    await new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(new DOMException("aborted", "AbortError")),
        { once: true }
      );
    });
  const provider = new RagflowEvidenceProvider({
    env: { ...BASE_ENV, RAGFLOW_TIMEOUT_MS: "1000" },
    fetch: fetchMock,
  });
  const controller = new AbortController();
  const retrieval = provider.retrieve({ question: "Cancelled" }, controller.signal);
  controller.abort();

  await assert.rejects(
    retrieval,
    (error: unknown) =>
      error instanceof EvidenceProviderError && error.code === "aborted"
  );
});

test("RAGFlow respects an already-aborted caller signal without fetching", async () => {
  let called = false;
  const provider = new RagflowEvidenceProvider({
    env: BASE_ENV,
    fetch: () => {
      called = true;
      return Promise.resolve(jsonResponse({ code: 0, data: { chunks: [] } }));
    },
  });
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    provider.retrieve({ question: "Cancelled" }, controller.signal),
    (error: unknown) =>
      error instanceof EvidenceProviderError && error.code === "aborted"
  );
  assert.equal(called, false);
});

test("RAGFlow malformed response is invalid_response", async () => {
  const provider = new RagflowEvidenceProvider({
    env: BASE_ENV,
    fetch: async () => jsonResponse({ code: 0, data: { chunks: "bad" } }),
  });

  await assert.rejects(
    provider.retrieve(
      { question: "Malformed" },
      new AbortController().signal
    ),
    (error: unknown) =>
      error instanceof EvidenceProviderError && error.code === "invalid_response"
  );
});
