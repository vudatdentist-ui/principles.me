import { z } from "zod";
import { peopleApiError, requirePeopleMutation } from "@/features/people/api";
import { persistManualPrinciple } from "@/features/people/principle-persistence";
import { projectPrinciple } from "@/features/people/projection";

const schema = z.object({
  rationale: z.string().trim().max(1600).optional().nullable(),
  rule: z.string().trim().min(3).max(1600),
  trigger: z.string().trim().min(3).max(1200),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleMutation(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Write a trigger and a rule." }, { status: 400 });
    }
    const principle = await persistManualPrinciple({
      rationale: parsed.data.rationale,
      rule: parsed.data.rule,
      trigger: parsed.data.trigger,
      userId: context.user.id,
      workspaceId: context.workspace.id,
    });
    return Response.json({ principle: projectPrinciple(principle) }, { status: 201 });
  } catch (error) {
    return peopleApiError(error, "Could not create Principle.");
  }
}
