import { z } from "zod";
import { peopleApiError, requirePeopleMutation } from "@/features/people/api";
import { projectAction } from "@/features/people/execution-projection";
import { setActionStatus } from "@/features/people/execution-repository";

const schema = z.object({
  actionId: z.string().uuid(),
  status: z.enum(["pending", "completed", "cancelled"]),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleMutation(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Invalid Action." }, { status: 400 });
    }
    const action = await setActionStatus({
      actionId: parsed.data.actionId,
      status: parsed.data.status,
      userId: context.user.id,
      workspaceId: context.workspace.id,
    });
    return Response.json({ action: projectAction(action) });
  } catch (error) {
    return peopleApiError(error, "Could not update the Action.");
  }
}
