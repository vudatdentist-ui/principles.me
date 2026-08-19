import { NextResponse } from "next/server";
import { z } from "zod";
import { applyExistingPrinciple } from "@/lib/db/personal-brain-queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

const requestSchema = z.object({
  principleId: z.string().uuid(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid principle." }, { status: 400 });
  }

  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const link = await applyExistingPrinciple({
    decisionId: id,
    principleId: parsed.data.principleId,
    userId: workspaceUser.id,
  });
  if (!link) {
    return NextResponse.json(
      { error: "Decision or principle not found, or principle is retired." },
      { status: 404 }
    );
  }

  return NextResponse.json({ link });
}
