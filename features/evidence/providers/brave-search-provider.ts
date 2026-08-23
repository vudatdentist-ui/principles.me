import type {
  EvidenceProvider,
  EvidenceProviderDependencies,
  EvidenceProviderResult,
  EvidenceQuery,
} from "./evidence-provider";
import { runtimeEnvironment } from "./evidence-provider";
import {
  createProviderAbortScope,
  EvidenceProviderError,
  providerHttpError,
  providerInvalidResponseError,
  providerTransportError,
} from "./provider-error";
import type { CitationKey, EvidenceReference } from "../contracts";
import { publicSearchQuery } from "../live-search-policy";

const DEFAULT_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_COUNT = 5;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return normalized || null;
}

function url(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) {
    return null;
  }
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? candidate
      : null;
  } catch {
    return null;
  }
}

function integerEnv(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
  fallback: number
): number {
  const value = Number(env[name]);
  return Number.isFinite(value) && value >= 1 ? Math.trunc(value) : fallback;
}

function extractResults(payload: unknown): unknown[] | null {
  if (!isRecord(payload) || !isRecord(payload.web)) {
    return null;
  }
  return Array.isArray(payload.web.results) ? payload.web.results : null;
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    throw providerInvalidResponseError("brave", cause);
  }
}

export class BraveSearchEvidenceProvider implements EvidenceProvider {
  readonly id = "brave";

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

    const apiKey = this.env.BRAVE_SEARCH_API_KEY?.trim();
    if (!apiKey) {
      throw new EvidenceProviderError(this.id, "provider_error", {
        message: "The live search provider is not configured.",
      });
    }

    const query = publicSearchQuery(request.question);
    if (!query) {
      return { references: [], retrievedAt: this.now().toISOString() };
    }

    const endpoint = this.env.BRAVE_SEARCH_BASE_URL?.trim() || DEFAULT_ENDPOINT;
    const count = Math.min(
      integerEnv(this.env, "BRAVE_SEARCH_COUNT", DEFAULT_COUNT),
      10
    );
    const timeoutMs = integerEnv(
      this.env,
      "BRAVE_SEARCH_TIMEOUT_MS",
      DEFAULT_TIMEOUT_MS
    );
    const params = new URLSearchParams({ count: String(count), q: query });
    const country = this.env.BRAVE_SEARCH_COUNTRY?.trim();
    const language = this.env.BRAVE_SEARCH_LANGUAGE?.trim();
    if (country) {
      params.set("country", country);
    }
    if (language) {
      params.set("search_lang", language);
    }

    const abortScope = createProviderAbortScope(signal, timeoutMs);
    try {
      let response: Response;
      try {
        response = await this.fetchImpl(`${endpoint}?${params.toString()}`, {
          headers: {
            accept: "application/json",
            "x-subscription-token": apiKey,
          },
          method: "GET",
          signal: abortScope.signal,
        });
      } catch (cause) {
        throw providerTransportError(this.id, abortScope.kind(), cause);
      }

      if (!response.ok) {
        throw providerHttpError(this.id, response.status);
      }

      const results = extractResults(await parseJson(response));
      if (!results) {
        throw new EvidenceProviderError(this.id, "invalid_response");
      }

      const retrievedAt = this.now().toISOString();
      const seenUrls = new Set<string>();
      const references: EvidenceReference[] = [];

      for (const result of results) {
        if (!isRecord(result)) {
          continue;
        }
        const resultUrl = url(result.url);
        const title = text(result.title);
        const description = text(result.description);
        if (!resultUrl || !title || !description || seenUrls.has(resultUrl)) {
          continue;
        }
        seenUrls.add(resultUrl);
        references.push({
          chunkId: null,
          datasetId: null,
          documentId: null,
          key: `W${references.length + 1}` as CitationKey,
          observedAt: null,
          positions: [],
          provider: "brave",
          publishedAt: text(result.age),
          retrievedAt,
          score: null,
          sourceType: "live_web",
          text: description,
          title,
          url: resultUrl,
        });
      }

      return { references, retrievedAt };
    } finally {
      abortScope.dispose();
    }
  }
}
