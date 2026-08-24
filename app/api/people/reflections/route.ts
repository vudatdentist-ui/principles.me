import { z } from "zod";
import {
  peopleApiError,
  requirePeopleMutation,
} from "@/features/people/api";
import {
  createReflection,
  getGoal,
  getProblem,
} from "@/features/people/repository";

const schema = z.object({
  expected: z.string().trim().max(1600).optional().default(""),
  goalId: z.string().uuid(),
  happened: z.string().trim().min(3).max(2000),
  learning: z.string().trim().min(3).max(2000),
  problemId: z.string().uuid(),
  recurrenceNote: z.string().trim().max(1200).optional().default(""),
  recurring: z.boolean(),
  surprise: z.string().trim().max(1600).optional().default(""),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleMutation(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Reflection is incomplete." }, { status: 400 });
    }
    const [goal, problem] = await Promise.all([
      getGoal(context.workspace.id, parsed.data.goalId),
      getProblem(context.workspace.id, parsed.data.problemId),
    ]);
    if (!goal || !problem || problem.goalId !== goal.id) {
      return Response.json({ error: "Reflection context was not found." }, { status: 404 });
    }
    const reflection = await createReflection({
      expected: parsed.data.expected,
      goalId: goal.id,
      happened: parsed.data.happened,
      learning: parsed.data.learning,
      problemId: problem.id,
      recurrenceNote: parsed.data.recurrenceNote,
      recurring: parsed.data.recurring,
      surprise: parsed.data.surprise,
      userId: context.user.id,
      workspaceId: context.workspace.id,
    });
    return Response.json({ reflection }, { status: 201 });
  } catch (error) {
    return peopleApiError(error, "Could not save Reflection.");
  }
}
