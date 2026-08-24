import { z } from "zod";
import { DeepSeekProvider } from "@/lib/ai/providers/deepseek-provider";
import type { AiResponseMetadata } from "@/lib/ai/providers/types";
import type {
  GoalDiscoveryResult,
  GoalDraft,
  GoalRecord,
  ProblemRecord,
  RealityRecord,
  ReflectionRecord,
} from "./contracts";

const goalFieldSchema = z.enum([
  "desiredState",
  "whyItMatters",
  "successConditions",
  "acceptedTradeoffs",
  "nonNegotiables",
  "measures",
]);

const goalDiscoverySchema = z.discriminatedUnion("kind", [
  z.object({
    field: goalFieldSchema,
    kind: z.literal("question"),
    question: z.string().trim().min(5).max(240),
  }),
  z.object({
    kind: z.literal("ready"),
    summary: z.string().trim().min(5).max(600),
  }),
]);

const problemSchema = z.object({
  gap: z.string().trim().min(3).max(800),
  statement: z.string().trim().min(3).max(800),
});

const principleSchema = z.object({
  confidence: z.number().min(0).max(1).nullable().optional(),
  rationale: z.string().trim().min(3).max(1000),
  rule: z.string().trim().min(3).max(800),
  trigger: z.string().trim().min(3).max(800),
});

const fallbackQuestions: Array<{
  field: keyof GoalDraft;
  question: string;
}> = [
  {
    field: "desiredState",
    question: "What reality do you actually want to create?",
  },
  {
    field: "whyItMatters",
    question: "Why does this matter enough to organize your attention around it?",
  },
  {
    field: "successConditions",
    question: "What would make you say this desired reality is genuinely true?",
  },
  {
    field: "acceptedTradeoffs",
    question: "What are you willing to give up or deprioritize for this goal?",
  },
  {
    field: "nonNegotiables",
    question: "What boundary must remain true while you pursue this goal?",
  },
];

function unresolvedQuestion(draft: GoalDraft) {
  return fallbackQuestions.find(({ field }) => !draft[field].trim()) ?? null;
}

export function fallbackGoalDiscovery(draft: GoalDraft): GoalDiscoveryResult {
  const unresolved = unresolvedQuestion(draft);
  if (unresolved) {
    return { kind: "question", ...unresolved };
  }
  return {
    kind: "ready",
    summary: draft.desiredState.trim(),
  };
}

export function shouldUseGoalDiscoveryProvider(draft: GoalDraft): boolean {
  return (
    fallbackGoalDiscovery(draft).kind !== "ready" &&
    Boolean(process.env.DEEPSEEK_API_KEY?.trim())
  );
}

export async function discoverGoalNext(
  draft: GoalDraft,
  signal?: AbortSignal
): Promise<GoalDiscoveryResult> {
  const deterministic = fallbackGoalDiscovery(draft);
  if (
    deterministic.kind === "ready" ||
    !process.env.DEEPSEEK_API_KEY?.trim()
  ) {
    return deterministic;
  }

  try {
    const provider = new DeepSeekProvider({ maxTokens: 350 });
    const result = await provider.generateObject({
      messages: [
        {
          role: "system",
          content:
            "You are the Goal Discovery capability inside Principles. Ask exactly one highest-value unresolved question. A Goal is a chosen desired reality, not a KPI. Distinguish meaning, success conditions, trade-offs, boundaries, and useful measures. Return JSON only. Never ask multiple questions in one string. If all important fields are adequately resolved, return kind=ready with a concise summary. Measures are optional and should only be asked when they clarify reality rather than redefine the goal.",
        },
        {
          role: "user",
          content: JSON.stringify(draft),
        },
      ],
      parse: (value) => goalDiscoverySchema.parse(value),
      signal,
      temperature: 0.2,
    });

    const unresolved = unresolvedQuestion(draft);
    if (unresolved && result.kind === "ready") {
      return { kind: "question", ...unresolved };
    }
    if (
      result.kind === "question" &&
      draft[result.field].trim() &&
      unresolved
    ) {
      return { kind: "question", ...unresolved };
    }
    return result;
  } catch {
    return deterministic;
  }
}

export type GeneratedProblem = z.infer<typeof problemSchema> & {
  modelName: string | null;
  modelProvider: string;
};

export async function generateProblemProposal(input: {
  goal: GoalRecord;
  reality: RealityRecord;
  signal?: AbortSignal;
}): Promise<GeneratedProblem> {
  let metadata: AiResponseMetadata | undefined;
  const provider = new DeepSeekProvider({ maxTokens: 450 });
  const result = await provider.generateObject({
    messages: [
      {
        role: "system",
        content:
          "You are the Diagnose capability inside Principles, but this phase only recognizes the Problem, not root cause. Given a chosen desired reality and one accepted observation, state the meaningful gap. Do not invent facts or causes. Return JSON with statement and gap only.",
      },
      {
        role: "user",
        content: JSON.stringify({
          goal: {
            desiredState: input.goal.desiredState,
            successConditions: input.goal.successConditions,
            whyItMatters: input.goal.whyItMatters,
          },
          reality: input.reality.statement,
        }),
      },
    ],
    onMetadata: (value) => {
      metadata = value;
    },
    parse: (value) => problemSchema.parse(value),
    signal: input.signal,
    temperature: 0.1,
  });
  return {
    ...result,
    modelName: metadata?.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    modelProvider: provider.id,
  };
}

export type GeneratedPrinciple = z.infer<typeof principleSchema> & {
  confidence: number | null;
  modelName: string | null;
  modelProvider: string;
};

export async function generatePrincipleProposal(input: {
  goal: GoalRecord;
  problem: ProblemRecord;
  reflection: ReflectionRecord;
  signal?: AbortSignal;
}): Promise<GeneratedPrinciple> {
  let metadata: AiResponseMetadata | undefined;
  const provider = new DeepSeekProvider({ maxTokens: 550 });
  const result = await provider.generateObject({
    messages: [
      {
        role: "system",
        content:
          "You are the Reflect capability inside Principles. Propose one revisable principle candidate from the user's completed reflection. The principle must be conditional and actionable, grounded only in the supplied case, and must not be phrased as a fixed personality trait or universal truth. Return JSON with trigger, rule, rationale and confidence from 0 to 1.",
      },
      {
        role: "user",
        content: JSON.stringify({
          goal: input.goal.desiredState,
          problem: input.problem.statement,
          reflection: {
            expected: input.reflection.expected,
            happened: input.reflection.happened,
            learning: input.reflection.learning,
            recurrenceNote: input.reflection.recurrenceNote,
            recurring: input.reflection.recurring,
            surprise: input.reflection.surprise,
          },
        }),
      },
    ],
    onMetadata: (value) => {
      metadata = value;
    },
    parse: (value) => principleSchema.parse(value),
    signal: input.signal,
    temperature: 0.2,
  });
  return {
    ...result,
    confidence: result.confidence ?? null,
    modelName: metadata?.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    modelProvider: provider.id,
  };
}
