import { z } from "zod";
import {
  peopleApiError,
  requirePeopleMutation,
} from "@/features/people/api";
import { commitGoal } from "@/features/people/repository";

const schema = z.object({
  acceptedTradeoffs: z.string().trim().min(1).max(1200),
  desiredState: z.string().trim().min(3).max(1600),
  measures: z.string().max(1200),
  nonNegotiables: z.string().trim().min(1).max(1200),
  successConditions: z.string().trim().min(3).max(1600),
  whyItMatters: z.string().trim().min(3).max(1600),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleMutation(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { error: "Resolve the Goal before committing it." },
        { status: 400 }
      );
    }
    const goal = await commitGoal({
      draft: parsed.data,
      userId: context.user.id,
      workspaceId: context.workspace.id,
    });
    return Response.json({ goal }, { status: 201 });
  } catch (error) {
    return peopleApiError(error, "Could not commit Goal.");
  }
}
