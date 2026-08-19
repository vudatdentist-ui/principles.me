import { NextResponse } from "next/server";
import { getDecisionDetail } from "@/lib/db/decision-queries";
import { getPersonalContext } from "@/lib/db/personal-brain-queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const detail = await getDecisionDetail({ id, userId: workspaceUser.id });
  if (!detail) {
    return NextResponse.json({ error: "Decision not found." }, { status: 404 });
  }

  const personalContext = await getPersonalContext({
    context: detail.decision.context ?? "",
    currentDecisionId: id,
    question: detail.decision.question,
    userId: workspaceUser.id,
  });
  return NextResponse.json({ personalContext });
}
