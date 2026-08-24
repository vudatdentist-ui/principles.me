import { z } from "zod";
import { DeepSeekProvider } from "@/lib/ai/providers/deepseek-provider";
import type { AiResponseMetadata } from "@/lib/ai/providers/types";
import type {
  LearningCaseRecord,
  LearningPatternKind,
} from "./contracts";
import type { LearningPrincipleOption } from "./repository";

const kindSchema = z.enum([
  "recurring_pattern",
  "design_learning",
  "principle_effectiveness",
  "constraint_hypothesis",
]);

const principleRevisionSchema = z
  .object({
    principleKey: z.string().trim().min(2).max(20),
    proposedRationale: z.string().trim().min(3).max(1200),
    proposedRule: z.string().trim().min(3).max(1000),
    proposedTrigger: z.string().trim().min(3).max(800),
  })
  .nullable();

const patternSchema = z.object({
  caseKeys: z.array(z.string().trim().min(2).max(20)).min(2).max(8),
  confidence: z.number().min(0).max(1).nullable().optional(),
  contradictingEvidence: z.string().trim().min(3).max(1600),
  implication: z.string().trim().min(3).max(1200),
  kind: kindSchema,
  principleRevision: principleRevisionSchema,
  statement: z.string().trim().min(3).max(1200),
  supportingEvidence: z.string().trim().min(3).max(1800),
  uncertainty: z.string().trim().min(3).max(1400),
});

export type LearningModelResult = z.infer<typeof patternSchema>;

type ResolvedLearningResult = Omit<
  LearningModelResult,
  "caseKeys" | "principleRevision"
> & {
  caseReflectionIds: string[];
  confidence: number | null;
  principleRevision: {
    principleId: string;
    proposedRationale: string;
    proposedRule: string;
    proposedTrigger: string;
  } | null;
};

export type GeneratedLearningPattern = ResolvedLearningResult & {
  modelName: string | null;
  modelProvider: string;
};

function clip(value: string | null, limit = 700): string | null {
  if (value === null) {
    return null;
  }
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

function safeCase(caseRecord: LearningCaseRecord, key: string) {
  return {
    diagnosis: clip(caseRecord.diagnosis),
    design: clip(caseRecord.design),
    expected: clip(caseRecord.expected),
    goal: clip(caseRecord.goal, 500),
    happened: clip(caseRecord.happened),
    key,
    learning: clip(caseRecord.learning),
    outcome: caseRecord.outcome
      ? {
          actualResult: clip(caseRecord.outcome.actualResult),
          comparison: caseRecord.outcome.comparison,
          expectedResult: clip(caseRecord.outcome.expectedResult),
        }
      : null,
    phase: caseRecord.phase,
    problem: clip(caseRecord.problem, 700),
    recurrenceNote: clip(caseRecord.recurrenceNote),
    recurring: caseRecord.recurring,
    surprise: clip(caseRecord.surprise),
  };
}

function learningCaseMap(cases: LearningCaseRecord[]): Map<string, LearningCaseRecord> {
  return new Map<string, LearningCaseRecord>(
    cases.map((item, index) => [`C${index + 1}`, item])
  );
}

function learningPrincipleMap(
  principles: LearningPrincipleOption[]
): Map<string, LearningPrincipleOption> {
  return new Map<string, LearningPrincipleOption>(
    principles.map((item, index) => [`P${index + 1}`, item])
  );
}

export function resolveLearningModelResult(input: {
  cases: LearningCaseRecord[];
  principles: LearningPrincipleOption[];
  result: LearningModelResult;
}): ResolvedLearningResult {
  const caseMap = learningCaseMap(input.cases);
  const principleMap = learningPrincipleMap(input.principles);

  const uniqueCaseKeys = [...new Set(input.result.caseKeys)];
  if (uniqueCaseKeys.length < 2) {
    throw new Error("Learning proposal must cite at least two distinct cases.");
  }
  const resolvedCases = uniqueCaseKeys.map((key) => {
    const item = caseMap.get(key);
    if (!item) {
      throw new Error("Learning proposal cited an unknown case.");
    }
    return item;
  });
  if (
    input.result.kind === "recurring_pattern" &&
    new Set(resolvedCases.map((item) => item.problemId)).size < 2
  ) {
    throw new Error(
      "A recurring pattern requires evidence from at least two distinct Problems."
    );
  }

  let principleRevision: ResolvedLearningResult["principleRevision"] = null;
  if (input.result.principleRevision) {
    const principle = principleMap.get(input.result.principleRevision.principleKey);
    if (!principle) {
      throw new Error("Learning proposal cited an unknown Principle.");
    }
    principleRevision = {
      principleId: principle.id,
      proposedRationale: input.result.principleRevision.proposedRationale,
      proposedRule: input.result.principleRevision.proposedRule,
      proposedTrigger: input.result.principleRevision.proposedTrigger,
    };
  }

  return {
    caseReflectionIds: resolvedCases.map((item) => item.reflectionId),
    confidence: input.result.confidence ?? null,
    contradictingEvidence: input.result.contradictingEvidence,
    implication: input.result.implication,
    kind: input.result.kind as LearningPatternKind,
    principleRevision,
    statement: input.result.statement,
    supportingEvidence: input.result.supportingEvidence,
    uncertainty: input.result.uncertainty,
  };
}

export async function generateLearningPattern(input: {
  cases: LearningCaseRecord[];
  principles: LearningPrincipleOption[];
  signal?: AbortSignal;
}): Promise<GeneratedLearningPattern> {
  if (input.cases.length < 2) {
    throw new Error("At least two completed Reflections are required.");
  }

  const caseMap = learningCaseMap(input.cases);
  const principleMap = learningPrincipleMap(input.principles);
  let metadata: AiResponseMetadata | undefined;
  const provider = new DeepSeekProvider({ maxTokens: 950 });
  const result = await provider.generateObject({
    messages: [
      {
        role: "system",
        content:
          "You are the Learning Pattern capability inside Principles. Compare the supplied historical cases and propose exactly one useful, revisable hypothesis about observed machine behavior. Never describe immutable identity, personality type, moral worth, demographics, or mental-health/clinical diagnosis. Use only supplied facts. A same-Problem before/after pair may support design_learning or principle_effectiveness, but it is not proof of recurrence across cases. Use recurring_pattern only when at least two distinct Problems show the same pattern. Preserve counter-evidence and uncertainty. Select 2-8 supplied case keys that directly support the hypothesis. Never invent a case key. If one supplied Principle is genuinely relevant, optionally propose a revision using exactly one supplied principle key; otherwise principleRevision must be null. A revised Principle is a hypothesis to test again, not truth. Return JSON only with kind, statement, implication, supportingEvidence, contradictingEvidence, uncertainty, confidence, caseKeys, principleRevision.",
      },
      {
        role: "user",
        content: JSON.stringify({
          cases: [...caseMap.entries()].map(([key, item]) => safeCase(item, key)),
          principles: [...principleMap.entries()].map(([key, item]) => ({
            key,
            rationale: clip(item.rationale),
            rule: clip(item.rule),
            trigger: clip(item.trigger),
          })),
        }),
      },
    ],
    onMetadata: (value) => {
      metadata = value;
    },
    parse: (value) => patternSchema.parse(value),
    signal: input.signal,
    temperature: 0.15,
  });
  const resolved = resolveLearningModelResult({
    cases: input.cases,
    principles: input.principles,
    result,
  });

  return {
    ...resolved,
    modelName: metadata?.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    modelProvider: provider.id,
  };
}
