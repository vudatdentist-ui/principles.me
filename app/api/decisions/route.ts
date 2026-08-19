import { NextResponse } from "next/server";
import { z } from "zod";
import { createDecision, listDecisions } from "@/lib/db/decision-queries";
import { deriveDecisionDraft } from "@/lib/decision-draft";
import { getWorkspaceUser } from "@/lib/workspace-user";

const createDecisionSchema = z.object({
  input: z.string().trim().min(3).max(5000),
});

export async function GET() {
  const workspaceUser = await getWorkspaceUser();
  const decisions = await listDecisions(workspaceUser.id);
  return NextResponse.json({ decisions });
}

export async function POST(request: Request) {
  const parsed = createDecisionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Tell us what you are deciding." },
      { status: 400 }
    );
  }

  const workspaceUser = await getWorkspaceUser();
  const draft = deriveDecisionDraft(parsed.data.input);
  const createdDecision = await createDecision({
    ...draft,
    userId: workspaceUser.id,
  });

  return NextResponse.json({ decision: createdDecision }, { status: 201 });
}
