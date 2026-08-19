import { Cortex } from "@/lib/cortex";
import { cortexRunRequestSchema } from "@/lib/cortex/http";
import { getWorkspaceUser } from "@/lib/workspace-user";

export const maxDuration = 60;

export async function POST(request: Request) {
  const parsed = cortexRunRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return Response.json({ error: "Invalid Cortex input." }, { status: 400 });
  }

  const workspaceUser = await getWorkspaceUser();
  const response = await Cortex.run(parsed.data, workspaceUser.id);
  return Response.json(response);
}
