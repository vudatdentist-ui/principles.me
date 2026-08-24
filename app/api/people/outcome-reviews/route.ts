import { z } from "zod";
import { peopleApiError, requirePeopleMutation } from "@/features/people/api";
import { createOutcomeReview } from "@/features/people/execution-repository";

const schema = z.object({
  learning: z.string().trim().min(3).max(2000),
  outcomeId: z.string().uuid(),
  surprise: z.string().trim().max(1600).optional().default(""),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleMutation(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Invalid Outcome Review." }, { status: 400 });
    }
    const review = await createOutcomeReview({
      learning: parsed.data.learning,
      outcomeId: parsed.data.outcomeId,
      surprise: parsed.data.surprise,
      userId: context.user.id,
      workspaceId: context.workspace.id,
    });
    return Response.json({ review }, { status: 201 });
  } catch (error) {
    return peopleApiError(error, "Could not save the Outcome Review.");
  }
}
