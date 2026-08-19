import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getDecisionDetail,
  savePrincipleCandidate,
  updatePrincipleCandidate,
} from "@/lib/db/decision-queries";
import { generatePrincipleCandidate } from "@/lib/judgment/principle-candidate";
import { getWorkspaceUser } from "@/lib/workspace-user";

const updateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("edit"),
    candidateId: z.string().uuid(),
    rationale: z.string().trim().min(1).max(3000),
    statement: z.string().trim().min(1).max(1200),
  }),
  z.object({
    action: z.literal("reject"),
    candidateId: z.string().uuid(),
  }),
]);

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const detail = await getDecisionDetail({ id, userId: workspaceUser.id });
  if (!detail) {
    return NextResponse.json({ error: "Decision not found." }, { status: 404 });
  }
  if (!detail.decision.councilBrief && !detail.decision.councilAnalysis) {
    return NextResponse.json(
      { error: "Run Council before extracting a principle." },
      { status: 409 }
    );
  }
  const [latestJudgment] = detail.judgments;
  if (!latestJudgment) {
    return NextResponse.json(
      { error: "Make your judgment before extracting a principle." },
      { status: 409 }
    );
  }

  try {
    const draft = await generatePrincipleCandidate({
      context: detail.decision.context || "",
      councilBrief: detail.decision.councilBrief,
      judgment: {
        confidencePercent: latestJudgment.confidencePercent,
        rationale: latestJudgment.rationale,
        selectedOption: latestJudgment.selectedOption,
        summary: latestJudgment.summary,
      },
      question: detail.decision.question,
    });
    const candidate = await savePrincipleCandidate({
      basedOnJudgmentId: latestJudgment.id,
      decisionId: id,
      rationale: draft.rationale,
      statement: draft.statement,
      userId: workspaceUser.id,
    });
    if (!candidate) {
      return NextResponse.json(
        { error: "Judgment changed while extracting the principle." },
        { status: 409 }
      );
    }
    return NextResponse.json({ candidate }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not generate a candidate principle.",
      },
      { status: 502 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid candidate update." },
      { status: 400 }
    );
  }

  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const candidate = await updatePrincipleCandidate({
    ...parsed.data,
    decisionId: id,
    userId: workspaceUser.id,
  });
  if (!candidate) {
    return NextResponse.json(
      { error: "Pending candidate not found." },
      { status: 404 }
    );
  }
  return NextResponse.json({ candidate });
}
