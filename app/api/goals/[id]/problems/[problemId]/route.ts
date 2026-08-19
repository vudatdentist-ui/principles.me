import { NextResponse } from "next/server";
import { z } from "zod";
import { goalsCortex } from "@/lib/goals/cortex";
import {
  adoptProblemCandidate,
  createAction,
  getGoalDetail,
  linkPrinciple,
  saveDiagnosis,
  updateAction,
  updateProblem,
} from "@/lib/goals/queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

const commandSchema = z.discriminatedUnion("command", [
  z.object({
    command: z.literal("update_problem"),
    principleCandidate: z.string().trim().max(1500).nullable().optional(),
    status: z.enum(["open", "resolved", "archived"]).optional(),
    title: z.string().trim().min(1).max(500).optional(),
  }),
  z.object({
    command: z.literal("save_diagnosis"),
    rootCause: z.string().trim().min(1).max(5000),
  }),
  z.object({
    command: z.literal("add_action"),
    title: z.string().trim().min(1).max(500),
  }),
  z.object({
    actionId: z.string().uuid(),
    command: z.literal("update_action"),
    status: z.enum(["todo", "doing", "done", "cancelled"]).optional(),
    title: z.string().trim().min(1).max(500).optional(),
  }),
  z.object({
    command: z.literal("link_principle"),
    principleId: z.string().uuid(),
  }),
  z.object({ command: z.literal("adopt_candidate") }),
  z.object({ command: z.literal("cortex") }),
]);

type RouteContext = { params: Promise<{ id: string; problemId: string }> };
export async function PATCH(request: Request, context: RouteContext) {
  const { id, problemId } = await context.params;
  const parsed = commandSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid problem command." },
      { status: 400 }
    );
  }
  const workspaceUser = await getWorkspaceUser();
  const userId = workspaceUser.id;
  const command = parsed.data;
  if (command.command === "update_problem") {
    const result = await updateProblem({
      goalId: id,
      principleCandidate: command.principleCandidate,
      problemId,
      status: command.status,
      title: command.title,
      userId,
    });
    return result
      ? NextResponse.json({ problem: result })
      : NextResponse.json({ error: "Problem not found." }, { status: 404 });
  }
  if (command.command === "save_diagnosis") {
    const result = await saveDiagnosis({
      goalId: id,
      problemId,
      rootCause: command.rootCause,
      userId,
    });
    return result
      ? NextResponse.json({ diagnosis: result })
      : NextResponse.json({ error: "Problem not found." }, { status: 404 });
  }
  if (command.command === "add_action") {
    const result = await createAction({
      goalId: id,
      problemId,
      title: command.title,
      userId,
    });
    return result
      ? NextResponse.json({ action: result }, { status: 201 })
      : NextResponse.json({ error: "Problem not found." }, { status: 404 });
  }
  if (command.command === "update_action") {
    const result = await updateAction({
      actionId: command.actionId,
      goalId: id,
      problemId,
      status: command.status,
      title: command.title,
      userId,
    });
    return result
      ? NextResponse.json({ action: result })
      : NextResponse.json({ error: "Action not found." }, { status: 404 });
  }
  if (command.command === "link_principle") {
    const result = await linkPrinciple({
      goalId: id,
      principleId: command.principleId,
      problemId,
      userId,
    });
    return result
      ? NextResponse.json({ link: result }, { status: 201 })
      : NextResponse.json(
          { error: "Problem or principle not found." },
          { status: 404 }
        );
  }
  if (command.command === "adopt_candidate") {
    const result = await adoptProblemCandidate({
      goalId: id,
      problemId,
      userId,
    });
    return result
      ? NextResponse.json({ principle: result }, { status: 201 })
      : NextResponse.json(
          { error: "No candidate principle." },
          { status: 409 }
        );
  }
  const detail = await getGoalDetail(id, userId);
  const selectedProblem = detail?.problems.find(
    (item) => item.id === problemId
  );
  if (!detail || !selectedProblem) {
    return NextResponse.json({ error: "Problem not found." }, { status: 404 });
  }
  const suggestion = await goalsCortex.analyzeProblem(
    {
      diagnosis: selectedProblem.diagnosis?.rootCause,
      goal: detail.goal.title,
      problem: selectedProblem.title,
    },
    userId
  );
  return NextResponse.json({ suggestion });
}
