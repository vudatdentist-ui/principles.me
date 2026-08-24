import {
  learningApiError,
  requireLearningMutation,
} from "@/features/learning/api";
import {
  rejectLatestLearningProposal,
} from "@/features/learning/repository";

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requireLearningMutation(request);
    await rejectLatestLearningProposal({
      userId: context.user.id,
      workspaceId: context.workspace.id,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return learningApiError(error, "Could not reject the Learning proposal.");
  }
}
