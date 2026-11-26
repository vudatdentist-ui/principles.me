import { z } from "zod";
import type { EvidenceReference } from "../contracts";

type Env = Readonly<Record<string, string | undefined>>;
export function libraryConfig(env: Env = process.env) {
  const base = env.ANYTHINGLLM_BASE_URL?.trim();
  const key = env.ANYTHINGLLM_API_KEY?.trim();
  const slug = env.ANYTHINGLLM_LIBRARY_WORKSPACE?.trim();
  if (!base && !key && !slug) return null;
  if (!base || !key || !slug || !/^[a-zA-Z0-9_-]+$/.test(slug))
    throw new Error("Invalid shared library configuration");
  const url = new URL(base);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash || url.pathname !== "/") throw new Error("Invalid library origin");
  return { key, slug, endpoint: url.origin + "/api/v1/workspace/" + slug };
}

const titleSchema = z.string().trim().min(1).max(512);
const catalogSchema = z.object({workspace: z.array(z.object({
  slug: z.string(),
  documents: z.array(z.object({metadata: z.unknown(), filename: z.string().optional()})),
})).length(1)});
const resultsSchema = z.object({results: z.array(z.object({
  text: z.string().nullish(), metadata: z.object({ title: z.unknown() }).nullish(),
}))});

function documentTitle(metadata: unknown, filename?: string) {
  let parsed = metadata;
  if (typeof metadata === "string") {
    try { parsed = JSON.parse(metadata); } catch { parsed = null; }
  }
  const title = z.object({title: titleSchema}).safeParse(parsed);
  return title.success ? title.data.title : filename?.split(/[\\/]/).pop();
}

export class SharedLibrary {
  constructor(private readonly config: NonNullable<ReturnType<typeof libraryConfig>>,
    private readonly transport: typeof fetch = fetch) {}

  private async request(path: string, signal?: AbortSignal, body?: object) {
    const timeout = AbortSignal.timeout(10_000);
    const response = await this.transport(this.config.endpoint + path, {
      method: body ? "POST" : "GET", cache: "no-store", redirect: "error",
      headers: {Authorization: "Bearer " + this.config.key, "Content-Type": "application/json"},
      body: body ? JSON.stringify(body) : undefined,
      signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
    });
    if (!response.ok) throw new Error("Library service unavailable");
    return response.json() as Promise<unknown>;
  }

  async books(signal?: AbortSignal) {
    const { workspace } = catalogSchema.parse(await this.request("", signal));
    const shared = workspace[0];
    if (shared?.slug !== this.config.slug) throw new Error("Library workspace unavailable");
    const titles = shared.documents.map(doc => documentTitle(doc.metadata, doc.filename))
      .filter((title): title is string => Boolean(title));
    return [...new Set(titles)].sort((a,b) => a.localeCompare(b, "vi"));
  }

  async search(query: string, signal?: AbortSignal): Promise<EvidenceReference[]> {
    const { results } = resultsSchema.parse(await this.request("/vector-search", signal, {query, topN: 8}));
    const retrievedAt = new Date().toISOString();
    const references: EvidenceReference[] = [];
    for (const hit of results.slice(0, 8)) {
      const title = titleSchema.safeParse(hit.metadata?.title);
      const text = hit.text?.trim();
      if (!text || !title.success) continue;
      references.push({
        key: "R" + (references.length + 1), text: text.slice(0, 3200), title: title.data,
        provider: "anythingllm", sourceType: "shared_library", retrievedAt,
        chunkId: null, datasetId: null, documentId: null, observedAt: null, positions: [],
        publishedAt: null, score: null, url: null,
      });
    }
    return references;
  }
}

export function sharedLibrary() {
  const config = libraryConfig();
  return config ? new SharedLibrary(config) : null;
}
