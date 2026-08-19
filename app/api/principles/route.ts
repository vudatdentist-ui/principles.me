import { NextResponse } from "next/server";
import { listPrinciples } from "@/lib/db/decision-queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

export async function GET() {
  const workspaceUser = await getWorkspaceUser();
  const principles = await listPrinciples(workspaceUser.id);
  return NextResponse.json({ principles });
}
