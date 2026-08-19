import { NextResponse } from "next/server";
import { z } from "zod";
import type { CouncilBrief, CouncilPlan } from "@/lib/council/types";
import { saveDecisionAnalysis } from "@/lib/db/decision-queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

const objectSchema = z.record(z.string(), z.unknown());
const analysisSchema = z.object({
  councilAnalysis: z.string().trim().min(1).max(50_000),
  councilBrief: objectSchema.nullable(),
  councilPlan: objectSchema,
  evidence: z.array(objectSchema).max(100).default([]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const body = await request.json().catch(() => null);
  const parsed = analysisSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid analysis." }, { status: 400 });
  }

  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const decision = await saveDecisionAnalysis({
    councilAnalysis: parsed.data.councilAnalysis,
    councilBrief: parsed.data.councilBrief as CouncilBrief | null,
    councilPlan: parsed.data.councilPlan as CouncilPlan,
    evidence: parsed.data.evidence,
    id,
    userId: workspaceUser.id,
  });

  if (!decision) {
    return NextResponse.json({ error: "Decision not found." }, { status: 404 });
  }

  return NextResponse.json({ decision });
}
