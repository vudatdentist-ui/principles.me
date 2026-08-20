import { Cortex } from "@/lib/cortex";
import { cortexContinueRequestSchema } from "@/lib/cortex/http";
import {
  CortexRunNotFoundError,
  CortexRunStateError,
} from "@/lib/cortex/service";
import { getWorkspaceUser } from "@/lib/workspace-user";

type RouteContext = { params: Promise<{ runId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const parsed = cortexContinueRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid clarification answers." },
      { status: 400 }
    );
  }

  const [{ runId }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);

  try {
    const response = await Cortex.continue(
      runId,
      parsed.data.answers,
      workspaceUser.id
    );
    return Response.json(response);
  } catch (error) {
    if (error instanceof CortexRunNotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof CortexRunStateError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
