import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createManualPrinciple,
  listPrinciplesForRegistry,
} from "@/lib/db/principle-queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

const createSchema = z.object({
  description: z.string().trim().max(5000).optional(),
  statement: z.string().trim().min(1).max(2000),
});

export async function GET() {
  const workspaceUser = await getWorkspaceUser();
  const principles = await listPrinciplesForRegistry(workspaceUser.id);
  return NextResponse.json({ principles });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid principle." },
      { status: 400 }
    );
  }

  const workspaceUser = await getWorkspaceUser();
  const created = await createManualPrinciple({
    description: parsed.data.description,
    statement: parsed.data.statement,
    userId: workspaceUser.id,
  });

  return NextResponse.json({ principle: created }, { status: 201 });
}
