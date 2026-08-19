import "server-only";

import { retrievalContextFromQuery } from "./lenses";
import type { CouncilPlan, RetrievedReference } from "./types";

type RawReference = Omit<RetrievedReference, "key" | "retrievalContexts">;

type RetrievalResponse = {
  configured: boolean;
  references: RetrievedReference[];
  reason: string;
  queryCount: number;
  successfulQueryCount: number;
};

function apiBaseUrl(): string {
  const configured = (
    process.env.RAGFLOW_BASE_URL || "http://localhost:9380"
  ).replace(/\/+$/, "");
  return configured.endsWith("/api/v1") ? configured : `${configured}/api/v1`;
}

function numeric(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeChunk(chunk: Record<string, unknown>): RawReference | null {
  const text = String(
    chunk.content ??
      chunk.content_with_weight ??
      chunk.highlight ??
      chunk.text ??
      ""
  ).trim();
  if (!text) {
    return null;
  }
  return {
    chunkId: String(chunk.id ?? chunk.chunk_id ?? "").trim() || null,
    datasetId: String(chunk.dataset_id ?? "").trim() || null,
    documentId: String(chunk.document_id ?? chunk.doc_id ?? "").trim() || null,
    positions: Array.isArray(chunk.positions)
      ? chunk.positions.slice(0, 20)
      : [],
    score: numeric(chunk.similarity),
    text: text.slice(0, 9000),
    title: String(
      chunk.document_name ??
        chunk.docnm_kwd ??
        chunk.document ??
        "RAGFlow document"
    ).trim(),
  };
}

function chunkIdentity(reference: RawReference) {
  if (reference.chunkId) {
    return `chunk:${reference.chunkId}`;
  }
  return `${reference.documentId ?? reference.title}:${reference.text.slice(0, 220)}`;
}

async function retrieveQuery(query: string): Promise<RawReference[]> {
  const apiKey = process.env.RAGFLOW_API_KEY?.trim();
  const datasetIds = (process.env.RAGFLOW_DATASET_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!apiKey || !datasetIds.length) {
    return [];
  }

  const configuredTopK = Number(process.env.RAGFLOW_TOP_K || 10);
  const perQueryTopK = Math.max(3, Math.min(8, configuredTopK));
  const response = await fetch(`${apiBaseUrl()}/retrieval`, {
    body: JSON.stringify({
      dataset_ids: datasetIds,
      document_ids: [],
      highlight: false,
      keyword: false,
      page: 1,
      page_size: perQueryTopK,
      question: query,
      similarity_threshold: Number(
        process.env.RAGFLOW_SIMILARITY_THRESHOLD || 0.15
      ),
      top_k: perQueryTopK,
      vector_similarity_weight: Number(
        process.env.RAGFLOW_VECTOR_SIMILARITY_WEIGHT || 0.7
      ),
    }),
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(
      Number(process.env.RAGFLOW_TIMEOUT_MS || 10_000)
    ),
  });
  const payload = await response.json().catch(() => ({}));
  if (
    !response.ok ||
    (payload.code !== undefined && Number(payload.code) !== 0)
  ) {
    throw new Error(`RAGFlow HTTP ${response.status}`);
  }

  const chunks = Array.isArray(payload?.data?.chunks)
    ? payload.data.chunks
    : Array.isArray(payload?.chunks)
      ? payload.chunks
      : Array.isArray(payload?.data)
        ? payload.data
        : [];
  return chunks
    .map((chunk: unknown) =>
      normalizeChunk((chunk ?? {}) as Record<string, unknown>)
    )
    .filter((reference: RawReference | null): reference is RawReference =>
      Boolean(reference)
    );
}

export async function retrieveCouncilEvidence(
  plan: CouncilPlan
): Promise<RetrievalResponse> {
  const apiKey = process.env.RAGFLOW_API_KEY?.trim();
  const datasetIds = (process.env.RAGFLOW_DATASET_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!apiKey || !datasetIds.length) {
    return {
      configured: false,
      queryCount: plan.retrievalQueries.length,
      reason: "NOT_CONFIGURED",
      references: [],
      successfulQueryCount: 0,
    };
  }

  const settled = await Promise.allSettled(
    plan.retrievalQueries.map(async (query) => ({
      context: retrievalContextFromQuery(query),
      references: await retrieveQuery(query.query),
    }))
  );
  const merged = new Map<
    string,
    RawReference & {
      retrievalContexts: RetrievedReference["retrievalContexts"];
    }
  >();
  let successfulQueryCount = 0;

  for (const result of settled) {
    if (result.status !== "fulfilled") {
      continue;
    }
    successfulQueryCount += 1;
    for (const reference of result.value.references) {
      const identity = chunkIdentity(reference);
      const existing = merged.get(identity);
      if (existing) {
        if (
          reference.score !== null &&
          (existing.score === null || reference.score > existing.score)
        ) {
          existing.score = reference.score;
        }
        if (
          !existing.retrievalContexts.some(
            (context) =>
              context.kind === result.value.context.kind &&
              context.id === result.value.context.id
          )
        ) {
          existing.retrievalContexts.push(result.value.context);
        }
      } else {
        merged.set(identity, {
          ...reference,
          retrievalContexts: [result.value.context],
        });
      }
    }
  }

  const maxReferences = Math.max(
    6,
    Math.min(24, Number(process.env.RAGFLOW_MAX_REFERENCES || 14))
  );
  const references = [...merged.values()]
    .sort((a, b) => {
      const aRank =
        (a.score ?? 0) + Math.min(3, a.retrievalContexts.length - 1) * 0.03;
      const bRank =
        (b.score ?? 0) + Math.min(3, b.retrievalContexts.length - 1) * 0.03;
      return bRank - aRank;
    })
    .slice(0, maxReferences)
    .map((reference, index) => ({
      ...reference,
      key: `R${index + 1}`,
    }));

  return {
    configured: true,
    queryCount: plan.retrievalQueries.length,
    reason: references.length
      ? successfulQueryCount === plan.retrievalQueries.length
        ? "RAGFLOW_RETRIEVED"
        : "PARTIAL_RETRIEVAL"
      : successfulQueryCount
        ? "NO_MATCHES"
        : "UNAVAILABLE",
    references,
    successfulQueryCount,
  };
}
