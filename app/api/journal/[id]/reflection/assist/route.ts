import { NextResponse } from "next/server";
import { journalCortex } from "@/lib/journal/cortex";
import { getJournalEntryDetail } from "@/lib/journal/queries";
import { getWorkspaceUser } from "@/lib/workspace-user";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const [{ id }, workspaceUser] = await Promise.all([
    context.params,
    getWorkspaceUser(),
  ]);
  const detail = await getJournalEntryDetail({ id, userId: workspaceUser.id });
  if (!detail) {
    return NextResponse.json({ error: "Journal entry not found." }, { status: 404 });
  }

  const suggestion = await journalCortex.reflect({
    entryId: detail.entry.id,
    experience: detail.entry.body,
    reflection: detail.reflection?.text ?? null,
  });

  return NextResponse.json({ source: "journal-cortex-adapter", suggestion });
}
