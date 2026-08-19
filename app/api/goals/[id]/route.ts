import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getGoalDetail,
  listAvailablePrinciples,
  updateGoal,
} from "@/lib/goals/queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

const updateGoalSchema = z.object({
  status: z.enum(["active", "completed", "archived"]).optional(),
  title: z.string().trim().min(1).max(240).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const workspaceUser = await getWorkspaceUser();
  const detail = await getGoalDetail(id, workspaceUser.id);
  if (!detail) {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }
  const principles = await listAvailablePrinciples(workspaceUser.id);
  return NextResponse.json({ ...detail, availablePrinciples: principles });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsed = updateGoalSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid goal update." },
      { status: 400 }
    );
  }
  const workspaceUser = await getWorkspaceUser();
  const goal = await updateGoal({
    id,
    userId: workspaceUser.id,
    ...parsed.data,
  });
  if (!goal) {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }
  return NextResponse.json({ goal });
}
