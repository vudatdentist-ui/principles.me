import { z } from "zod";

export const MAX_DECISION_QUESTION_LENGTH = 4000;

export const decisionRequestSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(1, "Question is required.")
      .max(
        MAX_DECISION_QUESTION_LENGTH,
        `Question must be at most ${MAX_DECISION_QUESTION_LENGTH} characters.`
      ),
  })
  .strict();

export type DecisionRequest = z.infer<typeof decisionRequestSchema>;

export type DecisionRequestParseResult =
  | { data: DecisionRequest; ok: true }
  | { code: "invalid_json" | "invalid_request"; message: string; ok: false };

export async function parseDecisionRequest(
  request: Request
): Promise<DecisionRequestParseResult> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return {
      code: "invalid_json",
      message: "Request body must be valid JSON.",
      ok: false,
    };
  }

  const parsed = decisionRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      code: "invalid_request",
      message: "Request must contain only a non-empty question.",
      ok: false,
    };
  }

  return { data: parsed.data, ok: true };
}
