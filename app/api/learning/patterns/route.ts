import { z } from "zod";
import {
  learningApiError,
  requireLearningMutation,
} from "@/features/learning/api";
import { projectLearningState } from "@/features/learning/projection";
import {
  createLearningPattern,
  loadLearningState,
} from "@/features/learning/repository";

const schema = z.object({
  confidence: z.number().min(0).max(1).nullable(),
  contradictingEvidence: z.string().trim().min(3).max(1600),
  implication: z.string().trim().min(3).max(1200),
  kind: z.enum([
    "recurring_pattern",
    "design_learning",
    "principle_effectiveness",
    "constraint_hypothesis",
  ]),
  statement: z.string().trim().min(3).max(1200),
  supportingEvidence: z.string().trim().min(3).max(1800),
  uncertainty: z.string().trim().min(3).max(1400),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requireLearningMutation(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Invalid Learning Pattern." }, { status: 400 });
    }

    await createLearningPattern({
      draft: parsed.data,
      userId: context.user.id,
      workspaceId: context.workspace.id,
    });
    return Response.json(
      projectLearningState(await loadLearningState(context.workspace.id))
    );
  } catch (error) {
    return learningApiError(error, "Could not save the Learning Pattern.");
  }
}
