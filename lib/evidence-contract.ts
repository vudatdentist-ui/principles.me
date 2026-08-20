import { z } from "zod";

export type EvidenceReference = {
  chunkId: string | null;
  datasetId: string | null;
  documentId: string | null;
  key: string;
  positions: unknown[];
  publishedAt?: string | null;
  score: number | null;
  sourceType: "ragflow" | "web";
  text: string;
  title: string;
  url?: string | null;
};

export type EvidenceAuditStatus =
  | "supported"
  | "partially_supported"
  | "unsupported"
  | "contradicted";

export type EvidenceAuditClaim = {
  claim: string;
  citations: string[];
  reason: string;
  status: EvidenceAuditStatus;
};

export type EvidenceAudit = {
  claims: EvidenceAuditClaim[];
  corrections: string[];
  decision: "accept" | "revise";
  missingEvidence: string[];
  qualityScore: number;
  revision: string;
  strengths: string[];
  verdict: "grounded" | "mixed" | "ungrounded";
};

const auditSchema = z.object({
  claims: z.array(
    z.object({
      citations: z.array(z.string()).catch([]),
      claim: z.string().catch(""),
      reason: z.string().catch(""),
      status: z
        .enum([
          "supported",
          "partially_supported",
          "unsupported",
          "contradicted",
        ])
        .catch("unsupported"),
    })
  ),
  corrections: z.array(z.string()).catch([]),
  decision: z.enum(["accept", "revise"]).catch("revise"),
  missingEvidence: z.array(z.string()).catch([]),
  qualityScore: z.number().min(0).max(10).catch(0),
  revision: z.string().catch(""),
  strengths: z.array(z.string()).catch([]),
  verdict: z.enum(["grounded", "mixed", "ungrounded"]).catch("mixed"),
});

function emptyAudit(reason: string): EvidenceAudit {
  return {
    claims: [],
    corrections: [reason],
    decision: "revise",
    missingEvidence: [reason],
    qualityScore: 0,
    revision: reason,
    strengths: [],
    verdict: "mixed",
  };
}

function parseJsonObject(value: string): unknown {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, "");
  const withoutFence = trimmed.replace(/\s*```$/, "");
  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start === -1 || end <= start) {
      return null;
    }
    try {
      return JSON.parse(withoutFence.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

export function parseEvidenceAudit(
  raw: string,
  allowedKeys: Set<string>
): EvidenceAudit {
  const parsed = parseJsonObject(raw);
  const result = auditSchema.safeParse(parsed);
  if (!result.success) {
    return emptyAudit("Evidence Judge returned an invalid audit record.");
  }
  const audit = result.data;
  const claims = audit.claims.map((claim) => ({
    citations: [
      ...new Set(
        claim.citations
          .map((citation) => citation.trim().toUpperCase())
          .filter((citation) => allowedKeys.has(citation))
      ),
    ],
    claim: claim.claim.trim(),
    reason: claim.reason.trim(),
    status: claim.status,
  }));
  const hasBadClaim = claims.some((claim) =>
    ["partially_supported", "unsupported", "contradicted"].includes(
      claim.status
    )
  );
  const verdict =
    audit.verdict === "grounded" && hasBadClaim ? "mixed" : audit.verdict;
  const qualityScore = Math.max(0, Math.min(10, audit.qualityScore));
  const decision =
    hasBadClaim || qualityScore < 8.5 ? "revise" : audit.decision;
  return {
    claims,
    corrections: audit.corrections.map((item) => item.trim()).filter(Boolean),
    decision,
    missingEvidence: audit.missingEvidence
      .map((item) => item.trim())
      .filter(Boolean),
    qualityScore,
    revision: audit.revision.trim(),
    strengths: audit.strengths.map((item) => item.trim()).filter(Boolean),
    verdict,
  };
}

export function formatEvidence(references: EvidenceReference[]): string {
  if (!references.length) {
    return "NO EVIDENCE WAS RETRIEVED. Do not fill this gap with general model knowledge.";
  }
  return references
    .slice(0, 10)
    .map((reference) => {
      const source = reference.sourceType === "web" ? "WEB" : "RAGFLOW";
      const provenance = [
        reference.datasetId && `dataset=${reference.datasetId}`,
        reference.documentId && `document=${reference.documentId}`,
        reference.chunkId && `chunk=${reference.chunkId}`,
        reference.positions.length &&
          `positions=${JSON.stringify(reference.positions).slice(0, 600)}`,
        reference.score !== null && `score=${reference.score.toFixed(3)}`,
      ]
        .filter(Boolean)
        .join(" · ");
      const url = reference.url ? `\nURL: ${reference.url}` : "";
      return [
        `[${reference.key}] ${source} · ${reference.title}`,
        provenance ? `PROVENANCE: ${provenance}` : "PROVENANCE: unavailable",
        url.trim(),
        `EXCERPT:\n${reference.text.slice(0, 2800)}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

export function citationKeys(
  answer: string,
  references: EvidenceReference[]
): string[] {
  const allowed = new Set(references.map((reference) => reference.key));
  return [
    ...new Set(
      [...answer.matchAll(/\[((?:R|W)\d+)\]/g)]
        .map((match) => match[1])
        .filter((key) => allowed.has(key))
    ),
  ];
}

export function sanitizeAnswer(
  answer: string,
  references: EvidenceReference[],
  audit?: EvidenceAudit
): { answer: string; citations: string[]; grounded: boolean } {
  const citations = citationKeys(answer, references);
  const allowed = new Set(references.map((reference) => reference.key));
  const withoutUnknown = answer
    .replace(/\[((?:R|W)\d+)\]/g, (full, key: string) =>
      allowed.has(key) ? full : ""
    )
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  const hasUnsupportedClaim = audit?.claims.some((claim) =>
    ["partially_supported", "unsupported", "contradicted"].includes(
      claim.status
    )
  );
  const grounded =
    references.length > 0 &&
    citations.length > 0 &&
    audit?.verdict === "grounded" &&
    !hasUnsupportedClaim;
  if (!references.length) {
    return {
      answer:
        withoutUnknown || "Chưa có evidence từ RAGFlow hoặc web research.",
      citations: [],
      grounded: false,
    };
  }
  if (!withoutUnknown) {
    return {
      answer: "Chưa có kết luận có căn cứ từ evidence đã thu thập.",
      citations: [],
      grounded: false,
    };
  }
  return { answer: withoutUnknown, citations, grounded };
}
