import { NextResponse } from "next/server";
import { z } from "zod";
import { createJournalEntry, listJournalEntries } from "@/lib/journal/queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

const createSchema = z.object({
  body: z.string().trim().min(1).max(20_000),
  occurredAt: z.string().datetime().optional(),
});

export async function GET() {
  const workspaceUser = await getWorkspaceUser();
  const entries = await listJournalEntries(workspaceUser.id);
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid journal entry." },
      { status: 400 }
    );
  }

  const workspaceUser = await getWorkspaceUser();
  const entry = await createJournalEntry({
    body: parsed.data.body,
    occurredAt: parsed.data.occurredAt
      ? new Date(parsed.data.occurredAt)
      : undefined,
    userId: workspaceUser.id,
  });
  return NextResponse.json({ entry }, { status: 201 });
}
