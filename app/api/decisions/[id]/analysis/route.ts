import { NextResponse } from "next/server";
import { z } from "zod";
import { saveDecisionAnalysis } from "@/lib/db/decision-queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

const analysisSchema = z.object({
  councilAnalysis: z.string().trim().min(1).max(50_000),
  evidence: z.array(z.record(z.string(), z.unknown())).max(100).default([]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const parsed = analysisSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid analysis." }, { status: 400 });
  }

  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const decision = await saveDecisionAnalysis({
    ...parsed.data,
    id,
    userId: workspaceUser.id,
  });

  if (!decision) {
    return NextResponse.json({ error: "Decision not found." }, { status: 404 });
  }

  return NextResponse.json({ decision });
}
