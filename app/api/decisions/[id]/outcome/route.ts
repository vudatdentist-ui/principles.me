import { NextResponse } from "next/server";
import { z } from "zod";
import { saveDecisionOutcome } from "@/lib/db/decision-queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

const outcomeSchema = z.object({
  lessons: z.string().trim().max(10_000).optional(),
  result: z.string().trim().min(1).max(10_000),
  verdict: z.enum(["positive", "mixed", "negative", "too_early"]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const parsed = outcomeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid outcome." }, { status: 400 });
  }

  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const createdOutcome = await saveDecisionOutcome({
    ...parsed.data,
    decisionId: id,
    userId: workspaceUser.id,
  });

  if (!createdOutcome) {
    return NextResponse.json({ error: "Decision not found." }, { status: 404 });
  }

  return NextResponse.json({ outcome: createdOutcome }, { status: 201 });
}
