import { z } from "zod";

export const cortexRunRequestSchema = z
  .object({
    context: z.string().trim().max(12_000).optional(),
    decisionId: z.string().uuid().optional(),
    input: z.string().trim().min(3).max(4000),
  })
  .strict();

export const cortexContinueRequestSchema = z
  .object({
    answers: z.record(z.string(), z.string().trim().min(1).max(4000)),
  })
  .strict();
