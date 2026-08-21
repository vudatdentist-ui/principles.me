import { z } from "zod";
import {
  citationKeySchema,
  evidenceReferenceSchema,
} from "@/features/evidence/contracts";

export const decisionReasonKindSchema = z.enum([
  "fact",
  "inference",
  "user-context",
]);

export const decisionReasonSchema = z
  .object({
    citationKeys: z.array(citationKeySchema),
    id: z.string().trim().min(1),
    kind: decisionReasonKindSchema,
    text: z.string().trim().min(1),
  })
  .strict();

export const decisionConfidenceSchema = z
  .object({
    explanation: z.string().trim().min(1),
    level: z.enum(["low", "medium", "high"]),
  })
  .strict();

export const decisionReviewSchema = z
  .object({
    suggestedAt: z.string().trim().min(1).nullable(),
    trigger: z.string().trim().min(1),
  })
  .strict();

export const decisionBriefSchema = z
  .object({
    confidence: decisionConfidenceSchema,
    counterCase: z.string().trim().min(1),
    id: z.string().trim().min(1),
    nextAction: z.string().trim().min(1),
    question: z.string().trim().min(3),
    reasons: z.array(decisionReasonSchema).min(1).max(6),
    recommendation: z.string().trim().min(1),
    review: decisionReviewSchema,
    runId: z.string().trim().min(1),
    schemaVersion: z.literal("1"),
    sources: z.array(evidenceReferenceSchema),
    unknowns: z.array(z.string().trim().min(1)).max(8),
    validAsOf: z.string().trim().min(1),
  })
  .strict()
  .superRefine((brief, context) => {
    const sourceKeys = new Set(brief.sources.map((source) => source.key));
    if (sourceKeys.size !== brief.sources.length) {
      context.addIssue({
        code: "custom",
        message: "Decision Brief sources must use unique citation keys.",
        path: ["sources"],
      });
    }

    for (const [index, reason] of brief.reasons.entries()) {
      if (reason.kind === "fact" && reason.citationKeys.length === 0) {
        context.addIssue({
          code: "custom",
          message: "Factual reasons require at least one citation.",
          path: ["reasons", index, "citationKeys"],
        });
      }

      for (const citationKey of reason.citationKeys) {
        if (!sourceKeys.has(citationKey)) {
          context.addIssue({
            code: "custom",
            message: `Unknown citation key: ${citationKey}`,
            path: ["reasons", index, "citationKeys"],
          });
        }
      }
    }
  });

export type DecisionBrief = z.infer<typeof decisionBriefSchema>;
export type DecisionConfidence = z.infer<typeof decisionConfidenceSchema>;
export type DecisionReason = z.infer<typeof decisionReasonSchema>;
export type DecisionReasonKind = z.infer<typeof decisionReasonKindSchema>;
export type DecisionReview = z.infer<typeof decisionReviewSchema>;

export function parseDecisionBrief(input: unknown): DecisionBrief {
  return decisionBriefSchema.parse(input);
}
