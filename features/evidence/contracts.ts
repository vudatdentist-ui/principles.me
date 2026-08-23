import { z } from "zod";

export const citationKeySchema = z
  .string()
  .trim()
  .regex(/^R\d+$/, "Citation keys must use the R prefix.");

export const evidenceReferenceSchema = z
  .object({
    chunkId: z.string().trim().min(1).nullable(),
    datasetId: z.string().trim().min(1).nullable(),
    documentId: z.string().trim().min(1).nullable(),
    key: citationKeySchema,
    observedAt: z.string().trim().min(1).nullable(),
    positions: z.array(z.unknown()),
    provider: z.literal("ragflow"),
    publishedAt: z.string().trim().min(1).nullable(),
    retrievedAt: z.string().trim().min(1),
    score: z.number().finite().nullable(),
    sourceType: z.literal("ragflow"),
    text: z.string().trim().min(1),
    title: z.string().trim().min(1),
    url: z.string().url().nullable(),
  })
  .strict();

export const evidencePacketSchema = z
  .object({
    references: z.array(evidenceReferenceSchema),
    retrievedAt: z.string().trim().min(1),
  })
  .strict()
  .superRefine((packet, context) => {
    const seen = new Set<string>();
    for (const [index, reference] of packet.references.entries()) {
      if (seen.has(reference.key)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate evidence key: ${reference.key}`,
          path: ["references", index, "key"],
        });
      }
      seen.add(reference.key);
    }
  });

export type CitationKey = z.infer<typeof citationKeySchema>;
export type EvidencePacket = z.infer<typeof evidencePacketSchema>;
export type EvidenceReference = z.infer<typeof evidenceReferenceSchema>;
