import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adoptJournalCandidate,
  saveJournalReflection,
  updateJournalCandidate,
} from "@/lib/journal/queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

const reflectionSchema = z.object({
  candidate: z
    .object({
      rationale: z.string().trim().max(3000).nullable().optional(),
      statement: z.string().trim().min(1).max(1200),
    })
    .nullable()
    .optional(),
  observation: z.string().trim().max(5000).nullable().optional(),
  text: z.string().trim().min(1).max(20_000),
});

const candidateActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("edit"),
    candidateId: z.string().uuid(),
    rationale: z.string().trim().max(3000).nullable().optional(),
    statement: z.string().trim().min(1).max(1200),
  }),
  z.object({
    action: z.literal("reject"),
    candidateId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("adopt"),
    candidateId: z.string().uuid(),
    rationale: z.string().trim().max(3000).nullable().optional(),
    statement: z.string().trim().min(1).max(1200).optional(),
  }),
]);

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const body = await request.json().catch(() => null);
  const parsed = reflectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reflection." }, { status: 400 });
  }

  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const reflection = await saveJournalReflection({
    candidateRationale: parsed.data.candidate?.rationale,
    candidateStatement: parsed.data.candidate?.statement,
    entryId: id,
    observation: parsed.data.observation,
    text: parsed.data.text,
    userId: workspaceUser.id,
  });
  if (!reflection) {
    return NextResponse.json(
      { error: "Journal entry not found." },
      { status: 404 }
    );
  }
  return NextResponse.json({ reflection });
}

export async function PATCH(request: Request, context: RouteContext) {
  const body = await request.json().catch(() => null);
  const parsed = candidateActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid candidate action." },
      { status: 400 }
    );
  }

  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);

  if (parsed.data.action === "adopt") {
    const adopted = await adoptJournalCandidate({
      candidateId: parsed.data.candidateId,
      description: parsed.data.rationale,
      entryId: id,
      statement: parsed.data.statement,
      userId: workspaceUser.id,
    });
    if (!adopted) {
      return NextResponse.json(
        { error: "Pending candidate not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({ principle: adopted });
  }

  const reflection = await updateJournalCandidate({
    action: parsed.data.action,
    candidateId: parsed.data.candidateId,
    entryId: id,
    rationale:
      parsed.data.action === "edit" ? parsed.data.rationale : undefined,
    statement:
      parsed.data.action === "edit" ? parsed.data.statement : undefined,
    userId: workspaceUser.id,
  });
  if (!reflection) {
    return NextResponse.json(
      { error: "Pending candidate not found." },
      { status: 404 }
    );
  }
  return NextResponse.json({ reflection });
}
