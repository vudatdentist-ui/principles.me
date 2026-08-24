import { z } from "zod";
import {
  peopleApiError,
  requirePeopleMutation,
} from "@/features/people/api";
import { projectProblem } from "@/features/people/projection";
import {
  createProblem,
  getGoal,
  getReality,
} from "@/features/people/repository";
import { assertProblemSuggestionContext } from "@/features/people/suggestions";

const schema = z.object({
  gap: z.string().trim().max(800).optional().default(""),
  goalId: z.string().uuid(),
  observationId: z.string().uuid(),
  statement: z.string().trim().min(3).max(800),
  suggestionId: z.string().uuid().nullable().optional(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleMutation(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Invalid Problem." }, { status: 400 });
    }
    const [goal, reality] = await Promise.all([
      getGoal(context.workspace.id, parsed.data.goalId),
      getReality(context.workspace.id, parsed.data.observationId),
    ]);
    if (!goal || !reality || reality.goalId !== goal.id) {
      return Response.json({ error: "Goal or Reality was not found." }, { status: 404 });
    }
    if (parsed.data.suggestionId) {
      await assertProblemSuggestionContext({
        evidenceId: reality.evidenceId,
        goalId: goal.id,
        suggestionId: parsed.data.suggestionId,
        workspaceId: context.workspace.id,
      });
    }
    const problem = await createProblem({
      evidenceIds: [reality.evidenceId],
      gap: parsed.data.gap,
      goalId: goal.id,
      statement: parsed.data.statement,
      suggestionId: parsed.data.suggestionId,
      userId: context.user.id,
      workspaceId: context.workspace.id,
    });
    return Response.json({ problem: projectProblem(problem) }, { status: 201 });
  } catch (error) {
    return peopleApiError(error, "Could not record Problem.");
  }
}
