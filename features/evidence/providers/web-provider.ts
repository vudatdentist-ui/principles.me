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

const DEFAULT_TIMEOUT_MS = 12_000;
const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function timeoutMs(env: Readonly<Record<string, string | undefined>>): number {
  const value = Number(env.WEB_RESEARCH_TIMEOUT_MS);
  return Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : DEFAULT_TIMEOUT_MS;
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

export class WebEvidenceProvider implements EvidenceProvider {
  readonly id = "web-search";

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

    const apiKey = this.env.TAVILY_API_KEY?.trim();
    if (!apiKey) {
      throw new EvidenceProviderError(this.id, "provider_error", {
        message: "The web evidence provider is not configured.",
      });
    }

    const abortScope = createProviderAbortScope(signal, timeoutMs(this.env));

    try {
      let response: Response;
      try {
        response = await this.fetchImpl(TAVILY_SEARCH_URL, {
          body: JSON.stringify({
            api_key: apiKey,
            include_answer: false,
            include_raw_content: false,
            max_results: 5,
            query: request.question,
            search_depth: "basic",
          }),
          headers: { "content-type": "application/json" },
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
      if (!isRecord(payload) || !Array.isArray(payload.results)) {
        throw new EvidenceProviderError(this.id, "invalid_response");
      }

      const retrievedAt = this.now().toISOString();
      const references = payload.results.flatMap((rawResult, index) => {
        if (!isRecord(rawResult)) {
          return [];
        }
        const reference = normalizeReference({
          chunkId: null,
          datasetId: null,
          documentId: null,
          index,
          keyPrefix: "W",
          positions: [],
          provider: this.id,
          publishedAt: rawResult.published_date,
          requireUrl: true,
          retrievedAt,
          score: rawResult.score,
          sourceType: "web",
          text: rawResult.content,
          title: rawResult.title,
          url: rawResult.url,
        });
        return reference ? [reference] : [];
      });

      return { references, retrievedAt };
    } finally {
      abortScope.dispose();
    }
  }
}
