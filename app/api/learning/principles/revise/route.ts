import { z } from "zod";
import {
  learningApiError,
  requireLearningMutation,
} from "@/features/learning/api";
import { projectLearningState } from "@/features/learning/projection";
import {
  applyLearningPrincipleRevision,
  loadLearningState,
} from "@/features/learning/repository";

const schema = z.object({
  patternId: z.string().uuid(),
  principleId: z.string().uuid(),
  rationale: z.string().trim().min(3).max(1200),
  rule: z.string().trim().min(3).max(1000),
  trigger: z.string().trim().min(3).max(800),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requireLearningMutation(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Invalid Principle revision." }, { status: 400 });
    }
    await applyLearningPrincipleRevision({
      ...parsed.data,
      userId: context.user.id,
      workspaceId: context.workspace.id,
    });
    return Response.json(
      projectLearningState(await loadLearningState(context.workspace.id))
    );
  } catch (error) {
    return learningApiError(error, "Could not revise the Principle.");
  }
}
