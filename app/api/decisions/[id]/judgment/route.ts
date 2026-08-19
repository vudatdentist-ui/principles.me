import { NextResponse } from "next/server";
import { z } from "zod";
import { saveJudgment } from "@/lib/db/decision-queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

const judgmentSchema = z.object({
  confidence: z.enum(["low", "medium", "high"]).optional(),
  rationale: z.string().trim().max(10_000).optional(),
  selectedOption: z.string().trim().max(500).optional(),
  summary: z.string().trim().min(1).max(5000),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const parsed = judgmentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid judgment." }, { status: 400 });
  }

  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const createdJudgment = await saveJudgment({
    ...parsed.data,
    decisionId: id,
    userId: workspaceUser.id,
  });

  if (!createdJudgment) {
    return NextResponse.json({ error: "Decision not found." }, { status: 404 });
  }

  return NextResponse.json({ judgment: createdJudgment }, { status: 201 });
}
