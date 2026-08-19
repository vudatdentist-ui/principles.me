import { NextResponse } from "next/server";
import { z } from "zod";
import { addDecisionPrinciple } from "@/lib/db/decision-queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

const principleSchema = z.object({
  description: z.string().trim().max(5000).optional(),
  statement: z.string().trim().min(1).max(2000),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const parsed = principleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid principle." }, { status: 400 });
  }

  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const createdPrinciple = await addDecisionPrinciple({
    ...parsed.data,
    decisionId: id,
    userId: workspaceUser.id,
  });

  if (!createdPrinciple) {
    return NextResponse.json({ error: "Decision not found." }, { status: 404 });
  }

  return NextResponse.json({ principle: createdPrinciple }, { status: 201 });
}
