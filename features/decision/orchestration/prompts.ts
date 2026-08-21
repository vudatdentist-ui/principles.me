import type { JsonSnapshot } from "../persistence";
import type { EvidenceReference } from "../../evidence/contracts";
import type { AiMessage } from "../../../lib/ai/providers/types";
import type { DecisionAnalysis, DecisionAudit } from "./types";

const ANALYSIS_SYSTEM_PROMPT = "You are the decision application service for Principles. Produce structured decision content, not prose commentary. Use evidence, first-principles, inversion/risk, systems, and action lenses inside one analysis pass; do not create user-facing agents. Retrieved evidence is the only authority for factual claims. Never invent citation keys. If evidence is insufficient, use inference rather than unsupported facts, lower confidence, and state the evidence gap in unknowns. Return exactly three concise reasons. Return JSON only.";

const AUDIT_SYSTEM_PROMPT = "You are a strict evidence auditor. Check the proposed decision content against the supplied evidence only. Topical similarity is not support. Mark revise when a material factual claim is unsupported, when confidence exceeds the evidence, or when the candidate is not decision-useful. Do not add new facts or citations. Return JSON only.";

const REVISION_SYSTEM_PROMPT = "Revise decision content once using the audit instructions. Retrieved evidence remains the only authority for factual claims. Never invent citation keys or sources. Preserve useful content that passed audit, lower confidence when evidence is weak, and return exactly three concise reasons. Return JSON only.";

function serialize(value: unknown): string {
  return JSON.stringify(value);
}

function analysisShape(): string {
  return `Required JSON shape: {"recommendation":"...","reasons":[{"id":"r1","kind":"fact|inference|user-context","text":"...","citationKeys":["R1"]}],"counterCase":"...","nextAction":"...","confidence":{"level":"low|medium|high","explanation":"..."},"unknowns":["..."],"review":{"trigger":"...","suggestedAt":null}}. Exactly three reasons. Do not return id, runId, schemaVersion, sources, or validAsOf; the application owns those fields.`;
}

export function buildAnalysisMessages(input: {
  context: JsonSnapshot;
  evidence: readonly EvidenceReference[];
  question: string;
}): readonly AiMessage[] {
  return [
    { content: ANALYSIS_SYSTEM_PROMPT, role: "system" },
    {
      content: [
        `QUESTION:\n${input.question}`,
        `CONTEXT SNAPSHOT:\n${serialize(input.context)}`,
        `RETRIEVED EVIDENCE:\n${serialize(input.evidence)}`,
        analysisShape(),
      ].join("\n\n"),
      role: "user",
    },
  ];
}

export function buildAuditMessages(input: {
  analysis: DecisionAnalysis;
  evidence: readonly EvidenceReference[];
  question: string;
}): readonly AiMessage[] {
  return [
    { content: AUDIT_SYSTEM_PROMPT, role: "system" },
    {
      content: [
        `QUESTION:\n${input.question}`,
        `RETRIEVED EVIDENCE:\n${serialize(input.evidence)}`,
        `CANDIDATE:\n${serialize(input.analysis)}`,
        'Required JSON shape: {"verdict":"grounded|mixed|ungrounded","decision":"accept|revise","issues":["..."],"revisionInstructions":["..."]}.',
      ].join("\n\n"),
      role: "user",
    },
  ];
}

export function buildRevisionMessages(input: {
  analysis: DecisionAnalysis;
  audit: DecisionAudit;
  context: JsonSnapshot;
  evidence: readonly EvidenceReference[];
  question: string;
}): readonly AiMessage[] {
  return [
    { content: REVISION_SYSTEM_PROMPT, role: "system" },
    {
      content: [
        `QUESTION:\n${input.question}`,
        `CONTEXT SNAPSHOT:\n${serialize(input.context)}`,
        `RETRIEVED EVIDENCE:\n${serialize(input.evidence)}`,
        `ORIGINAL CANDIDATE:\n${serialize(input.analysis)}`,
        `AUDIT:\n${serialize(input.audit)}`,
        analysisShape(),
      ].join("\n\n"),
      role: "user",
    },
  ];
}
