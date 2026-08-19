import { NextResponse } from "next/server";
import { z } from "zod";
import { createProblem } from "@/lib/goals/queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

const createProblemSchema = z.object({
  title: z.string().trim().min(1).max(500),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsed = createProblemSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Problem is required." }, { status: 400 });
  }
  const workspaceUser = await getWorkspaceUser();
  const problem = await createProblem({
    goalId: id,
    title: parsed.data.title,
    userId: workspaceUser.id,
  });
  if (!problem) {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }
  return NextResponse.json({ problem }, { status: 201 });
}
