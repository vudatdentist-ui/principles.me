import { NextResponse } from "next/server";
import { z } from "zod";
import { reviewDecisionPrinciple } from "@/lib/db/learning-loop-queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("keep"),
    outcomeId: z.string().uuid(),
    principleId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("retire"),
    outcomeId: z.string().uuid(),
    principleId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("revise"),
    outcomeId: z.string().uuid(),
    principleId: z.string().uuid(),
    revisedStatement: z.string().trim().min(3).max(5000),
  }),
]);

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid principle review." }, { status: 400 });
  }

  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const created = await reviewDecisionPrinciple({
    ...parsed.data,
    decisionId: id,
    userId: workspaceUser.id,
  });
  if (!created) {
    return NextResponse.json(
      { error: "Principle review could not be saved." },
      { status: 409 }
    );
  }

  return NextResponse.json({ principleReview: created }, { status: 201 });
}
