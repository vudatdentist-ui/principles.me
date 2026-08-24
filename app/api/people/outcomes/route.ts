import { z } from "zod";
import { peopleApiError, requirePeopleMutation } from "@/features/people/api";
import { projectOutcome } from "@/features/people/execution-projection";
import { createOutcome } from "@/features/people/execution-repository";

const schema = z.object({
  actualResult: z.string().trim().min(3).max(2000),
  comparison: z.enum(["improved", "mixed", "worse", "unclear"]),
  designId: z.string().uuid(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleMutation(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Invalid Outcome." }, { status: 400 });
    }
    const outcome = await createOutcome({
      actualResult: parsed.data.actualResult,
      comparison: parsed.data.comparison,
      designId: parsed.data.designId,
      userId: context.user.id,
      workspaceId: context.workspace.id,
    });
    return Response.json({ outcome: projectOutcome(outcome) }, { status: 201 });
  } catch (error) {
    return peopleApiError(error, "Could not record the Outcome.");
  }
}
