import { NextResponse } from "next/server";
import { z } from "zod";
import {
  revisePrinciple,
  setPrincipleStatus,
} from "@/lib/db/decision-queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

const updateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("revise"),
    description: z.string().trim().max(5000).optional(),
    statement: z.string().trim().min(1).max(2000),
  }),
  z.object({ action: z.literal("retire") }),
  z.object({ action: z.literal("activate") }),
]);

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid principle update." }, { status: 400 });
  }

  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const updated =
    parsed.data.action === "revise"
      ? await revisePrinciple({
          description: parsed.data.description,
          id,
          statement: parsed.data.statement,
          userId: workspaceUser.id,
        })
      : await setPrincipleStatus({
          id,
          status: parsed.data.action === "retire" ? "retired" : "active",
          userId: workspaceUser.id,
        });

  if (!updated) {
    return NextResponse.json({ error: "Principle not found." }, { status: 404 });
  }

  return NextResponse.json({ principle: updated });
}
