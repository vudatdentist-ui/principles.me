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
    url: reference.url,
  };
}
