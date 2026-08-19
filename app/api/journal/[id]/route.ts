import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteJournalEntry,
  getJournalEntryDetail,
  updateJournalEntry,
} from "@/lib/journal/queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

const updateSchema = z
  .object({
    body: z.string().trim().min(1).max(20_000).optional(),
    occurredAt: z.string().datetime().optional(),
  })
  .refine((value) => value.body !== undefined || value.occurredAt !== undefined);

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const detail = await getJournalEntryDetail({ id, userId: workspaceUser.id });
  if (!detail) {
    return NextResponse.json({ error: "Journal entry not found." }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function PATCH(request: Request, context: RouteContext) {
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid journal update." }, { status: 400 });
  }

  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const entry = await updateJournalEntry({
    body: parsed.data.body,
    id,
    occurredAt: parsed.data.occurredAt
      ? new Date(parsed.data.occurredAt)
      : undefined,
    userId: workspaceUser.id,
  });
  if (!entry) {
    return NextResponse.json({ error: "Journal entry not found." }, { status: 404 });
  }
  return NextResponse.json({ entry });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const deleted = await deleteJournalEntry({ id, userId: workspaceUser.id });
  if (!deleted) {
    return NextResponse.json({ error: "Journal entry not found." }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
