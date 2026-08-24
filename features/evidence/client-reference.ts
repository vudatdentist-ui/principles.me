import type { EvidenceReference } from "./contracts";

export interface ClientEvidenceReference {
  readonly key: string;
  readonly provider: "brave" | "ragflow";
  readonly publishedAt: string | null;
  readonly retrievedAt: string;
  readonly snippet: string;
  readonly sourceType: "live_web" | "ragflow";
  readonly title: string;
  readonly url: string | null;
}

function snippet(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length <= 360 ? compact : `${compact.slice(0, 357)}…`;
}

export function projectEvidenceForClient(
  reference: EvidenceReference
): ClientEvidenceReference {
  return {
    key: reference.key,
    provider: reference.provider,
    publishedAt: reference.publishedAt,
    retrievedAt: reference.retrievedAt,
    snippet: snippet(reference.text),
    sourceType: reference.sourceType,
    title: reference.title,
    // Live-search URLs are already public. RAG URLs can contain private hosts,
    // signed query parameters or internal document paths, so keep them server-side.
    url: reference.sourceType === "live_web" ? reference.url : null,
  };
}
