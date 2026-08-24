import { z } from "zod";
import {
  peopleApiError,
  requirePeopleMutation,
} from "@/features/people/api";
import { projectReality } from "@/features/people/projection";
import {
  createRealityObservation,
  getGoal,
} from "@/features/people/repository";

const schema = z.object({
  goalId: z.string().uuid(),
  statement: z.string().trim().min(3).max(2400),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleMutation(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Reality context is required." }, { status: 400 });
    }
    const goal = await getGoal(context.workspace.id, parsed.data.goalId);
    if (!goal) {
      return Response.json({ error: "Goal was not found." }, { status: 404 });
    }
    const reality = await createRealityObservation({
      goalId: goal.id,
      statement: parsed.data.statement,
      userId: context.user.id,
      workspaceId: context.workspace.id,
    });
    return Response.json({ reality: projectReality(reality) }, { status: 201 });
  } catch (error) {
    return peopleApiError(error, "Could not record Reality.");
  }
}
