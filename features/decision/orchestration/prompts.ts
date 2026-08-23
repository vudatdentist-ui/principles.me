import type { JsonSnapshot } from "../persistence";
import type { EvidenceReference } from "../../evidence/contracts";
import type { AiMessage } from "../../../lib/ai/providers/types";
import type {
  DecisionAnalysis,
  DecisionAudit,
  DecisionCouncilLens,
  DecisionFitAudit,
  DecisionPerspective,
} from "./types";

const COUNCIL_SYSTEM_PROMPT =
  "You are one independent decision reasoner in the Principles council. You receive the same question, user context, and evidence as the other reasoners, but you must reason independently and you must not assume or imitate any other perspective. Focus only on your assigned lens. Retrieved evidence is the only authority for factual claims. User context may support preference or constraint judgments but not external facts. Do not synthesize a final council answer. Return JSON only.";

const SYNTHESIS_SYSTEM_PROMPT =
  "You are the synthesis layer for the Principles decision council. Compare the independent perspectives, identify agreements and conflicts, and produce one decision analysis. Do not average the perspectives mechanically; resolve tradeoffs explicitly. Retrieved evidence is the only authority for factual claims. User context may support user-context reasons but not external facts. Never invent citation keys. If evidence is insufficient, use inference rather than unsupported facts, lower confidence, and state the evidence gap in unknowns. Return exactly three concise reasons. Return JSON only.";

const EVIDENCE_AUDIT_SYSTEM_PROMPT =
  "You are a strict evidence auditor. Judge only whether the synthesized decision is grounded in the supplied evidence. You are intentionally not given personal context. Topical similarity is not support. Mark revise when a material factual claim is unsupported, when citation support is weak, or when confidence exceeds the evidence. Do not judge user preference fit and do not add new facts or citations. Return JSON only.";

const DECISION_FIT_AUDIT_SYSTEM_PROMPT =
  "You are a strict decision-fit auditor. Judge whether the synthesized decision is coherent, decision-useful, appropriately reversible, and aligned with explicit user context and constraints. Do not re-audit factual evidence and do not invent user preferences. If the context snapshot is empty, do not reject the answer merely because personalization is unavailable; instead check internal decision quality and whether important missing context is represented as uncertainty. Return JSON only.";

const REVISION_SYSTEM_PROMPT =
  "Revise the synthesized decision once using both audit reports. Preserve useful content that passed review, resolve conflicts between evidence-grounding and decision-fit requirements, and do not add unsupported facts. Retrieved evidence remains the only authority for factual claims. Never invent citation keys or sources. User context may support user-context reasons. Return exactly three concise reasons. Return JSON only.";

const LENS_INSTRUCTIONS: Record<DecisionCouncilLens, string> = {
  "first-principles":
    "First-principles lens: decompose the decision into goals, assumptions, constraints, and irreducible facts. Challenge inherited framing and identify what must be true for the option to work.",
  "risk-inversion":
    "Risk and inversion lens: reason backward from failure. Identify downside asymmetry, irreversible failure modes, hidden fragility, and ways to preserve optionality or cap loss.",
  systems:
    "Systems lens: examine dependencies, feedback loops, incentives, second-order effects, bottlenecks, and how the decision changes the surrounding system over time.",
  action:
    "Action lens: focus on practical execution, opportunity cost, reversible experiments, sequencing, measurable next steps, and what information can be learned cheaply before committing further.",
};

function serialize(value: unknown): string {
  return JSON.stringify(value);
}

function analysisShape(): string {
  return `Required JSON shape: {"recommendation":"...","reasons":[{"id":"r1","kind":"fact|inference|user-context","text":"...","citationKeys":["R1"]}],"counterCase":"...","nextAction":"...","confidence":{"level":"low|medium|high","explanation":"..."},"unknowns":["..."],"review":{"trigger":"...","suggestedAt":null}}. Exactly three reasons. Do not return id, runId, schemaVersion, sources, or validAsOf; the application owns those fields.`;
}

function perspectiveShape(): string {
  return 'Required JSON shape: {"position":"...","considerations":["..."],"risks":["..."],"unknowns":["..."]}. Include 2-6 considerations. Keep each item concise.';
}

export function buildCouncilPerspectiveMessages(input: {
  context: JsonSnapshot;
  evidence: readonly EvidenceReference[];
  lens: DecisionCouncilLens;
  question: string;
}): readonly AiMessage[] {
  return [
    {
      content: `${COUNCIL_SYSTEM_PROMPT}\n\n${LENS_INSTRUCTIONS[input.lens]}`,
      role: "system",
    },
    {
      content: [
        `QUESTION:\n${input.question}`,
        `CONTEXT SNAPSHOT:\n${serialize(input.context)}`,
        `RETRIEVED EVIDENCE:\n${serialize(input.evidence)}`,
        perspectiveShape(),
      ].join("\n\n"),
      role: "user",
    },
  ];
}

export function buildSynthesisMessages(input: {
  context: JsonSnapshot;
  evidence: readonly EvidenceReference[];
  perspectives: readonly DecisionPerspective[];
  question: string;
}): readonly AiMessage[] {
  return [
    { content: SYNTHESIS_SYSTEM_PROMPT, role: "system" },
    {
      content: [
        `QUESTION:\n${input.question}`,
        `CONTEXT SNAPSHOT:\n${serialize(input.context)}`,
        `RETRIEVED EVIDENCE:\n${serialize(input.evidence)}`,
        `INDEPENDENT PERSPECTIVES:\n${serialize(input.perspectives)}`,
        analysisShape(),
      ].join("\n\n"),
      role: "user",
    },
  ];
}

export function buildEvidenceAuditMessages(input: {
  analysis: DecisionAnalysis;
  evidence: readonly EvidenceReference[];
  question: string;
}): readonly AiMessage[] {
  return [
    { content: EVIDENCE_AUDIT_SYSTEM_PROMPT, role: "system" },
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

export function buildDecisionFitAuditMessages(input: {
  analysis: DecisionAnalysis;
  context: JsonSnapshot;
  question: string;
}): readonly AiMessage[] {
  return [
    { content: DECISION_FIT_AUDIT_SYSTEM_PROMPT, role: "system" },
    {
      content: [
        `QUESTION:\n${input.question}`,
        `CONTEXT SNAPSHOT:\n${serialize(input.context)}`,
        `CANDIDATE:\n${serialize(input.analysis)}`,
        'Required JSON shape: {"verdict":"fit|mixed|misfit","decision":"accept|revise","issues":["..."],"revisionInstructions":["..."]}.',
      ].join("\n\n"),
      role: "user",
    },
  ];
}

export function buildRevisionMessages(input: {
  analysis: DecisionAnalysis;
  context: JsonSnapshot;
  decisionFitAudit: DecisionFitAudit;
  evidence: readonly EvidenceReference[];
  evidenceAudit: DecisionAudit;
  perspectives: readonly DecisionPerspective[];
  question: string;
}): readonly AiMessage[] {
  return [
    { content: REVISION_SYSTEM_PROMPT, role: "system" },
    {
      content: [
        `QUESTION:\n${input.question}`,
        `CONTEXT SNAPSHOT:\n${serialize(input.context)}`,
        `RETRIEVED EVIDENCE:\n${serialize(input.evidence)}`,
        `INDEPENDENT PERSPECTIVES:\n${serialize(input.perspectives)}`,
        `SYNTHESIZED CANDIDATE:\n${serialize(input.analysis)}`,
        `EVIDENCE AUDIT:\n${serialize(input.evidenceAudit)}`,
        `DECISION-FIT AUDIT:\n${serialize(input.decisionFitAudit)}`,
        analysisShape(),
      ].join("\n\n"),
      role: "user",
    },
  ];
}
