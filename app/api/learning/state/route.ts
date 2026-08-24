import {
  learningApiError,
  requireLearningSession,
} from "@/features/learning/api";
import { projectLearningState } from "@/features/learning/projection";
import { loadLearningState } from "@/features/learning/repository";

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await requireLearningSession(request);
    const state = projectLearningState(
      await loadLearningState(context.workspace.id)
    );
    return Response.json(state, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return learningApiError(error, "Could not load Learning state.");
  }
}
