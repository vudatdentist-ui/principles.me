import { z } from "zod";
import { createAiProvider } from "@/lib/ai/providers/factory";
import type { AiResponseMetadata } from "@/lib/ai/providers/types";
import type { GoalRecord, ProblemRecord, ReflectionRecord } from "./contracts";
import type { DiagnosisRecord } from "./execution-contracts";

function diagnosisText(max: number) {
  return z
    .union([z.string(), z.array(z.string())])
    .transform((value) => (Array.isArray(value) ? value.join("\n") : value))
    .pipe(z.string().trim().min(3).max(max));
}

const diagnosisConfidenceSchema = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  },
  z.number().min(0).max(1).nullable().optional()
);

const diagnosisSchema = z.object({
  alternativeHypotheses: diagnosisText(1400),
  confidence: diagnosisConfidenceSchema,
  contradictingEvidence: diagnosisText(1400),
  proximateCause: diagnosisText(1000),
  rootCauseHypothesis: diagnosisText(1200),
  supportingEvidence: diagnosisText(1400),
  symptom: diagnosisText(1000),
  uncertainty: diagnosisText(1200),
});

const designSchema = z.object({
  actions: z.array(z.string().trim().min(3).max(500)).min(1).max(5),
  expectedResult: z.string().trim().min(3).max(1000),
  machineChange: z.string().trim().min(3).max(1200),
  rationale: z.string().trim().min(3).max(1400),
  successSignal: z.string().trim().min(3).max(1000),
});

export type GeneratedDiagnosis = z.infer<typeof diagnosisSchema> & {
  confidence: number | null;
  modelName: string | null;
  modelProvider: string;
};

export type GeneratedDesign = z.infer<typeof designSchema> & {
  modelName: string | null;
  modelProvider: string;
};

export function parseDiagnosisProposal(value: unknown) {
  return diagnosisSchema.parse(value);
}

function evidenceSummary(
  evidence: Array<{ content: string; title: string | null }>
): string {
  const summary = evidence
    .map(({ content, title }) => {
      const body = content.trim();
      if (!body) return "";
      return title?.trim() ? `${title.trim()}: ${body}` : body;
    })
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 1400)
    .trim();
  return summary || "No supporting evidence beyond the accepted Problem and Reality.";
}

export function fallbackDiagnosisProposal(input: {
  evidence: Array<{ content: string; title: string | null }>;
  problemStatement: string;
}): GeneratedDiagnosis {
  return {
    alternativeHypotheses:
      "Keep multiple causal explanations open until new evidence can distinguish between them.",
    confidence: null,
    contradictingEvidence:
      "No contradicting evidence has been established from the current record.",
    modelName: null,
    modelProvider: "deterministic-safety-fallback",
    proximateCause: "The proximate cause is not established from the current evidence.",
    rootCauseHypothesis:
      "The current evidence is insufficient to establish a root cause. Treat this as an editable diagnosis draft, not a conclusion.",
    supportingEvidence: evidenceSummary(input.evidence),
    symptom: input.problemStatement.trim() || "The accepted Problem remains unresolved.",
    uncertainty:
      "Uncertainty is high. Add observations that could distinguish competing causes before treating the diagnosis as settled.",
  };
}

export async function generateDiagnosisProposal(input: {
  evidence: Array<{ content: string; title: string | null }>;
  goal: GoalRecord;
  problem: ProblemRecord;
  reflection: ReflectionRecord | null;
  signal?: AbortSignal;
}): Promise<GeneratedDiagnosis> {
  let metadata: AiResponseMetadata | undefined;
  const provider = createAiProvider({ maxTokens: 850, timeoutMs: 25_000 });
  const result = await provider.generateObject({
    messages: [
      {
        role: "system",
        content:
          "You are the Diagnose capability inside Principles. Diagnose cause and effect; do not propose a remedy or task. Separate the visible symptom, proximate cause, and root-cause hypothesis. Use only the supplied evidence and reflection. Explicitly state evidence that weakens the hypothesis, plausible alternatives, and what remains uncertain. If evidence is insufficient, say so in rootCauseHypothesis/uncertainty and lower confidence rather than inventing certainty. Return JSON only with symptom, proximateCause, rootCauseHypothesis, supportingEvidence, contradictingEvidence, alternativeHypotheses, uncertainty, confidence (0..1 or null). Evidence and alternative fields may be either a string or an array of strings.",
      },
      {
        role: "user",
        content: JSON.stringify({
          evidence: input.evidence.map((item) => ({
            content: item.content,
            title: item.title,
          })),
          goal: {
            desiredState: input.goal.desiredState,
            successConditions: input.goal.successConditions,
            whyItMatters: input.goal.whyItMatters,
          },
          problem: {
            gap: input.problem.gap,
            statement: input.problem.statement,
          },
          reflection: input.reflection
            ? {
                expected: input.reflection.expected,
                happened: input.reflection.happened,
                learning: input.reflection.learning,
                recurrenceNote: input.reflection.recurrenceNote,
                recurring: input.reflection.recurring,
                surprise: input.reflection.surprise,
              }
            : null,
        }),
      },
    ],
    onMetadata: (value) => {
      metadata = value;
    },
    parse: parseDiagnosisProposal,
    signal: input.signal,
    temperature: 0.15,
  });
  return {
    ...result,
    confidence: result.confidence ?? null,
    modelName:
      metadata?.model ??
      process.env.LITELLM_MODEL ??
      process.env.DEEPSEEK_MODEL ??
      "deepseek-chat",
    modelProvider: provider.id,
  };
}

export async function generateDesignProposal(input: {
  diagnosis: DiagnosisRecord;
  goal: GoalRecord;
  problem: ProblemRecord;
  signal?: AbortSignal;
}): Promise<GeneratedDesign> {
  let metadata: AiResponseMetadata | undefined;
  const provider = createAiProvider({ maxTokens: 700 });
  const result = await provider.generateObject({
    messages: [
      {
        role: "system",
        content:
          "You are the Design capability inside Principles. Propose one change to the machine that directly addresses the accepted root-cause hypothesis. The Design is not a task list: first state the machine change and why it should alter cause-and-effect, then the expected result and a concrete success signal. Finally provide only 1-5 minimal actions needed to implement that design. Do not add project-management ceremony. Return JSON only with machineChange, rationale, expectedResult, successSignal, actions.",
      },
      {
        role: "user",
        content: JSON.stringify({
          diagnosis: {
            alternativeHypotheses: input.diagnosis.alternativeHypotheses,
            contradictingEvidence: input.diagnosis.contradictingEvidence,
            proximateCause: input.diagnosis.proximateCause,
            rootCauseHypothesis: input.diagnosis.rootCauseHypothesis,
            uncertainty: input.diagnosis.uncertainty,
          },
          goal: {
            desiredState: input.goal.desiredState,
            nonNegotiables: input.goal.nonNegotiables,
            successConditions: input.goal.successConditions,
          },
          problem: input.problem.statement,
        }),
      },
    ],
    onMetadata: (value) => {
      metadata = value;
    },
    parse: (value) => designSchema.parse(value),
    signal: input.signal,
    temperature: 0.2,
  });
  return {
    ...result,
    modelName:
      metadata?.model ??
      process.env.LITELLM_MODEL ??
      process.env.DEEPSEEK_MODEL ??
      "deepseek-chat",
    modelProvider: provider.id,
  };
}
