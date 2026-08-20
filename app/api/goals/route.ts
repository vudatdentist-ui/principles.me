import { NextResponse } from "next/server";
import { z } from "zod";
import { createGoal, listGoals } from "@/lib/goals/queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

const createGoalSchema = z.object({
  title: z.string().trim().min(1).max(240),
});

export async function GET() {
  const workspaceUser = await getWorkspaceUser();
  const goals = await listGoals(workspaceUser.id);
  return NextResponse.json({ goals });
}

export async function POST(request: Request) {
  const parsed = createGoalSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Goal is required." }, { status: 400 });
  }

  const workspaceUser = await getWorkspaceUser();
  const goal = await createGoal({
    title: parsed.data.title,
    userId: workspaceUser.id,
  });
  return NextResponse.json({ goal }, { status: 201 });
}
