import { NextResponse } from "next/server";
import { getDecisionDetail } from "@/lib/db/decision-queries";
import { deleteDecisionForUser } from "@/lib/db/release-queries";
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

  return NextResponse.json(detail);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const deleted = await deleteDecisionForUser({
    decisionId: id,
    userId: workspaceUser.id,
  });
  if (!deleted) {
    return NextResponse.json({ error: "Decision not found." }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
