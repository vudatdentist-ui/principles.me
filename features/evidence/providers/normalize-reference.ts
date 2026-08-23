import type { CitationKey, EvidenceReference } from "../contracts";

export interface NormalizeReferenceInput {
  readonly chunkId?: unknown;
  readonly datasetId?: unknown;
  readonly documentId?: unknown;
  readonly index: number;
  readonly observedAt?: unknown;
  readonly positions?: unknown;
  readonly publishedAt?: unknown;
  readonly retrievedAt: string;
  readonly score?: unknown;
  readonly text: unknown;
  readonly title: unknown;
  readonly url?: unknown;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validUrl(value: unknown): string | null {
  const candidate = nonEmptyString(value);
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

function normalizedPositions(value: unknown): unknown[] {
  return Array.isArray(value) ? value.slice(0, 20) : [];
}

function traceableTitle(input: NormalizeReferenceInput, url: string | null) {
  const title = nonEmptyString(input.title);
  if (title) {
    return title;
  }
  if (url) {
    return url;
  }

  const documentId = nonEmptyString(input.documentId);
  if (documentId) {
    return `Document ${documentId.slice(0, 12)}`;
  }
  const chunkId = nonEmptyString(input.chunkId);
  if (chunkId) {
    return `Chunk ${chunkId.slice(0, 12)}`;
  }
  return null;
}

export function normalizeReference(
  input: NormalizeReferenceInput
): EvidenceReference | null {
  const text = nonEmptyString(input.text);
  if (!text) {
    return null;
  }

  const url = validUrl(input.url);
  const title = traceableTitle(input, url);
  if (!title) {
    return null;
  }

  return {
    chunkId: nonEmptyString(input.chunkId),
    datasetId: nonEmptyString(input.datasetId),
    documentId: nonEmptyString(input.documentId),
    key: `R${input.index + 1}` as CitationKey,
    observedAt: nonEmptyString(input.observedAt),
    positions: normalizedPositions(input.positions),
    provider: "ragflow",
    publishedAt: nonEmptyString(input.publishedAt),
    retrievedAt: input.retrievedAt,
    score: finiteNumber(input.score),
    sourceType: "ragflow",
    text,
    title,
    url,
  };
}
