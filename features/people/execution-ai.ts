import { z } from "zod";
import { createAiProvider } from "@/lib/ai/providers/factory";
import type { AiResponseMetadata } from "@/lib/ai/providers/types";
import type { GoalRecord, ProblemRecord, ReflectionRecord } from "./contracts";
import type { DiagnosisRecord } from "./execution-contracts";

const diagnosisSchema = z.object({
  alternativeHypotheses: z.string().trim().min(3).max(1400),
  confidence: z.number().min(0).max(1).nullable().optional(),
  contradictingEvidence: z.string().trim().min(3).max(1400),
  proximateCause: z.string().trim().min(3).max(1000),
  rootCauseHypothesis: z.string().trim().min(3).max(1200),
  supportingEvidence: z.string().trim().min(3).max(1400),
  symptom: z.string().trim().min(3).max(1000),
  uncertainty: z.string().trim().min(3).max(1200),
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

export async function generateDiagnosisProposal(input: {
  evidence: Array<{ content: string; title: string | null }>;
  goal: GoalRecord;
  problem: ProblemRecord;
  reflection: ReflectionRecord | null;
  signal?: AbortSignal;
}): Promise<GeneratedDiagnosis> {
  let metadata: AiResponseMetadata | undefined;
  const provider = createAiProvider({ maxTokens: 850 });
  const result = await provider.generateObject({
    messages: [
      {
        role: "system",
        content:
          "You are the Diagnose capability inside Principles. Diagnose cause and effect; do not propose a remedy or task. Separate the visible symptom, proximate cause, and root-cause hypothesis. Use only the supplied evidence and reflection. Explicitly state evidence that weakens the hypothesis, plausible alternatives, and what remains uncertain. If evidence is insufficient, say so in rootCauseHypothesis/uncertainty and lower confidence rather than inventing certainty. Return JSON only with symptom, proximateCause, rootCauseHypothesis, supportingEvidence, contradictingEvidence, alternativeHypotheses, uncertainty, confidence (0..1 or null).",
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
    parse: (value) => diagnosisSchema.parse(value),
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
