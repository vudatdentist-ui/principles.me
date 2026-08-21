import type { EvidenceReference } from "@/features/evidence/contracts";

const RETRIEVED_AT = "2026-08-21T03:15:00.000Z";

export const ragflowEvidenceFixture = {
  chunkId: "chunk-diversification-001",
  datasetId: "dataset-principles-primary",
  documentId: "document-principles-001",
  key: "R1",
  observedAt: null,
  positions: [[12, 0, 12, 480]],
  provider: "ragflow",
  publishedAt: null,
  retrievedAt: RETRIEVED_AT,
  score: 0.91,
  sourceType: "ragflow",
  text: "A decision should begin with the objective, the available evidence, and the risks that could make the preferred option fail.",
  title: "Principles source excerpt",
  url: null,
} satisfies EvidenceReference;

export const webEvidenceFixture = {
  chunkId: null,
  datasetId: null,
  documentId: null,
  key: "W1",
  observedAt: null,
  positions: [],
  provider: "web-search",
  publishedAt: "2026-08-21T01:00:00.000Z",
  retrievedAt: RETRIEVED_AT,
  score: 0.84,
  sourceType: "web",
  text: "Recent reporting describes higher demand for defensive assets amid policy uncertainty.",
  title: "Current market context",
  url: "https://example.com/current-market-context",
} satisfies EvidenceReference;

export const marketEvidenceFixture = {
  chunkId: null,
  datasetId: null,
  documentId: null,
  key: "M1",
  observedAt: "2026-08-21T03:10:00.000Z",
  positions: [],
  provider: "market-data",
  publishedAt: null,
  retrievedAt: RETRIEVED_AT,
  score: null,
  sourceType: "market",
  text: "Structured market observation captured for contract verification. The fixture is not production market data.",
  title: "Gold market snapshot fixture",
  url: "https://example.com/market-snapshot",
} satisfies EvidenceReference;

export const userContextEvidenceFixture = {
  chunkId: null,
  datasetId: null,
  documentId: null,
  key: "C1",
  observedAt: "2026-08-21T03:12:00.000Z",
  positions: [],
  provider: "personal-context",
  publishedAt: null,
  retrievedAt: RETRIEVED_AT,
  score: null,
  sourceType: "user-context",
  text: "The user reports that gold already represents fifteen percent of the current portfolio.",
  title: "User-provided portfolio context",
  url: null,
} satisfies EvidenceReference;

export const evidenceFixtures = [
  ragflowEvidenceFixture,
  webEvidenceFixture,
  marketEvidenceFixture,
  userContextEvidenceFixture,
] satisfies EvidenceReference[];
