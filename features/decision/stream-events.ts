import { z } from "zod";
import { decisionBriefSchema } from "@/features/decision/contracts";
import { evidenceReferenceSchema } from "@/features/evidence/contracts";

export const decisionStageSchema = z.enum([
  "context",
  "retrieval",
  "live-data",
  "analysis",
  "audit",
  "revision",
  "persistence",
]);

const startedEventSchema = z
  .object({
    runId: z.string().trim().min(1),
    type: z.literal("started"),
  })
  .strict();

const statusEventSchema = z
  .object({
    message: z.string().trim().min(1),
    stage: decisionStageSchema,
    type: z.literal("status"),
  })
  .strict();

const evidenceEventSchema = z
  .object({
    references: z.array(evidenceReferenceSchema),
    type: z.literal("evidence"),
  })
  .strict();

const briefEventSchema = z
  .object({
    brief: decisionBriefSchema,
    type: z.literal("brief"),
  })
  .strict();

const errorEventSchema = z
  .object({
    code: z.string().trim().min(1),
    message: z.string().trim().min(1),
    retryable: z.boolean(),
    type: z.literal("error"),
  })
  .strict();

const doneEventSchema = z.object({ type: z.literal("done") }).strict();

export const decisionStreamEventSchema = z.discriminatedUnion("type", [
  startedEventSchema,
  statusEventSchema,
  evidenceEventSchema,
  briefEventSchema,
  errorEventSchema,
  doneEventSchema,
]);

export type DecisionStage = z.infer<typeof decisionStageSchema>;
export type DecisionStreamEvent = z.infer<typeof decisionStreamEventSchema>;

type DecisionStreamProtocolErrorOptions = ErrorOptions & {
  line: string;
};

export class DecisionStreamProtocolError extends Error {
  readonly line: string;

  constructor(message: string, options: DecisionStreamProtocolErrorOptions) {
    super(message, { cause: options.cause });
    this.name = "DecisionStreamProtocolError";
    this.line = options.line;
  }
}

export function parseDecisionStreamLine(
  line: string
): DecisionStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(trimmed);
  } catch (error) {
    throw new DecisionStreamProtocolError(
      "Decision stream contained invalid JSON.",
      { cause: error, line: trimmed }
    );
  }

  const parsed = decisionStreamEventSchema.safeParse(payload);
  if (!parsed.success) {
    throw new DecisionStreamProtocolError(
      "Decision stream event did not match the v1 contract.",
      { cause: parsed.error, line: trimmed }
    );
  }

  return parsed.data;
}

export type DecisionStreamDecoder = {
  finish: () => DecisionStreamEvent[];
  push: (chunk: string) => DecisionStreamEvent[];
};

export function createDecisionStreamDecoder(): DecisionStreamDecoder {
  let buffer = "";

  const readLines = (flush: boolean): DecisionStreamEvent[] => {
    const rows = buffer.split(/\r?\n/);
    if (flush) {
      buffer = "";
    } else {
      buffer = rows.pop() ?? "";
    }
    return rows
      .map((row) => parseDecisionStreamLine(row))
      .filter((event): event is DecisionStreamEvent => event !== null);
  };

  return {
    finish() {
      return readLines(true);
    },
    push(chunk) {
      buffer += chunk;
      return readLines(false);
    },
  };
}
