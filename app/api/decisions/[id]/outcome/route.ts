import { NextResponse } from "next/server";
import { z } from "zod";
import { saveDecisionReview } from "@/lib/db/learning-loop-queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

const assumptionReviewSchema = z.object({
  assumptionText: z.string().trim().min(1).max(5000),
  note: z.string().trim().max(5000).optional(),
  verdict: z.enum(["correct", "incorrect", "unclear"]),
});

const outcomeSchema = z.object({
  assumptionReviews: z.array(assumptionReviewSchema).max(20).default([]),
  decisionQuality: z.enum(["yes", "no", "unclear"]).default("unclear"),
  lessons: z.string().trim().max(10_000).optional(),
  reasoningQuality: z.enum(["yes", "no", "partially"]).default("partially"),
  result: z.string().trim().min(1).max(10_000),
  verdict: z.enum(["positive", "mixed", "negative", "too_early"]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const parsed = outcomeSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid outcome review." },
      { status: 400 }
    );
  }

  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const createdOutcome = await saveDecisionReview({
    ...parsed.data,
    decisionId: id,
    userId: workspaceUser.id,
  });

  if (!createdOutcome) {
    return NextResponse.json({ error: "Decision not found." }, { status: 404 });
  }

  return NextResponse.json({ outcome: createdOutcome }, { status: 201 });
}
