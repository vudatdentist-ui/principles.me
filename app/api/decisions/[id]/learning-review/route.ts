import { NextResponse } from "next/server";
import { getLearningReviewContext } from "@/lib/db/learning-loop-queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const review = await getLearningReviewContext({
    decisionId: id,
    userId: workspaceUser.id,
  });
  if (!review) {
    return NextResponse.json({ error: "Decision not found." }, { status: 404 });
  }
  return NextResponse.json({ review });
}
