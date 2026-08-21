import type {
  EvidenceProvider,
  EvidenceProviderDependencies,
  EvidenceProviderResult,
  EvidenceQuery,
} from "./evidence-provider";
import { runtimeEnvironment } from "./evidence-provider";
import { normalizeReference } from "./normalize-reference";
import {
  createProviderAbortScope,
  EvidenceProviderError,
  providerHttpError,
  providerTransportError,
} from "./provider-error";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_TOP_K = 10;
const DEFAULT_SIMILARITY_THRESHOLD = 0.2;
const DEFAULT_VECTOR_SIMILARITY_WEIGHT = 0.3;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function apiBaseUrl(env: Readonly<Record<string, string | undefined>>): string {
  const configured = (env.RAGFLOW_BASE_URL || "http://localhost:9380").replace(
    /\/+$/,
    ""
  );
  return configured.endsWith("/api/v1") ? configured : `${configured}/api/v1`;
}

function booleanEnv(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
  fallback: boolean
): boolean {
  const value = env[name]?.trim().toLowerCase();
  if (!value) {
    return fallback;
  }
  return !["0", "false", "no", "off"].includes(value);
}

function numberEnv(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
  fallback: number,
  options: { integer?: boolean; minimum?: number } = {}
): number {
  const candidate = Number(env[name]);
  if (!Number.isFinite(candidate)) {
    return fallback;
  }
  if (options.minimum !== undefined && candidate < options.minimum) {
    return fallback;
  }
  return options.integer ? Math.trunc(candidate) : candidate;
}

function extractChunks(payload: unknown): unknown[] | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (Array.isArray(payload.chunks)) {
    return payload.chunks;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (isRecord(payload.data) && Array.isArray(payload.data.chunks)) {
    return payload.data.chunks;
  }

  return null;
}

async function parseJson(
  response: Response,
  provider: string
): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    throw new EvidenceProviderError(provider, "invalid_response", { cause });
  }
}

export class RagflowEvidenceProvider implements EvidenceProvider {
  readonly id = "ragflow";

  private readonly env: Readonly<Record<string, string | undefined>>;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  constructor(dependencies: EvidenceProviderDependencies = {}) {
    this.env = dependencies.env ?? runtimeEnvironment();
    this.fetchImpl = dependencies.fetch ?? fetch;
    this.now = dependencies.now ?? (() => new Date());
  }

  async retrieve(
    request: EvidenceQuery,
    signal: AbortSignal
  ): Promise<EvidenceProviderResult> {
    if (signal.aborted) {
      throw new EvidenceProviderError(this.id, "aborted", {
        cause: signal.reason,
      });
    }

    const apiKey = this.env.RAGFLOW_API_KEY?.trim();
    const datasetIds = (this.env.RAGFLOW_DATASET_IDS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (!apiKey || datasetIds.length === 0) {
      throw new EvidenceProviderError(this.id, "provider_error", {
        message: "The RAGFlow evidence provider is not configured.",
      });
    }

    const topK = numberEnv(this.env, "RAGFLOW_TOP_K", DEFAULT_TOP_K, {
      integer: true,
      minimum: 1,
    });
    const timeoutMs = numberEnv(
      this.env,
      "RAGFLOW_TIMEOUT_MS",
      DEFAULT_TIMEOUT_MS,
      { integer: true, minimum: 0 }
    );
    const abortScope = createProviderAbortScope(signal, timeoutMs);

    try {
      let response: Response;
      try {
        response = await this.fetchImpl(`${apiBaseUrl(this.env)}/retrieval`, {
          body: JSON.stringify({
            dataset_ids: datasetIds,
            document_ids: [],
            highlight: false,
            keyword: booleanEnv(this.env, "RAGFLOW_KEYWORD_SEARCH", true),
            page: 1,
            page_size: topK,
            question: request.question,
            similarity_threshold: numberEnv(
              this.env,
              "RAGFLOW_SIMILARITY_THRESHOLD",
              DEFAULT_SIMILARITY_THRESHOLD
            ),
            top_k: topK,
            vector_similarity_weight: numberEnv(
              this.env,
              "RAGFLOW_VECTOR_SIMILARITY_WEIGHT",
              DEFAULT_VECTOR_SIMILARITY_WEIGHT
            ),
          }),
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          method: "POST",
          signal: abortScope.signal,
        });
      } catch (cause) {
        throw providerTransportError(this.id, abortScope.kind(), cause);
      }

      if (!response.ok) {
        throw providerHttpError(this.id, response.status);
      }
      const payload = await parseJson(response, this.id);

      if (
        isRecord(payload) &&
        payload.code !== undefined &&
        Number(payload.code) !== 0
      ) {
        throw new EvidenceProviderError(this.id, "provider_error", {
          status: response.status,
        });
      }

      const chunks = extractChunks(payload);
      if (!chunks) {
        throw new EvidenceProviderError(this.id, "invalid_response");
      }

      const retrievedAt = this.now().toISOString();
      const references = chunks.flatMap((rawChunk, index) => {
        if (!isRecord(rawChunk)) {
          return [];
        }

        const documentId = rawChunk.document_id ?? rawChunk.doc_id;
        const reference = normalizeReference({
          chunkId: rawChunk.id ?? rawChunk.chunk_id,
          datasetId: rawChunk.dataset_id,
          documentId,
          index,
          keyPrefix: "R",
          positions: rawChunk.positions,
          provider: this.id,
          retrievedAt,
          score: rawChunk.similarity,
          sourceType: "ragflow",
          text:
            rawChunk.content ??
            rawChunk.content_with_weight ??
            rawChunk.highlight ??
            rawChunk.text,
          title:
            rawChunk.document_name ??
            rawChunk.docnm_kwd ??
            rawChunk.document,
          url: rawChunk.url ?? rawChunk.document_url,
        });
        return reference ? [reference] : [];
      });

      return { references, retrievedAt };
    } finally {
      abortScope.dispose();
    }
  }
}
