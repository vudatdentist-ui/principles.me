import { z } from "zod";
import {
  requirePeopleMutation,
  requirePeopleSession,
  peopleApiError,
  consumePeopleAiQuota,
  quotaResponse,
} from "@/features/people/api";
import {
  consumeRateLimit,
  workspaceRateScope,
} from "@/features/security/rate-limit";
import {
  getCase,
  listCases,
  listTurns,
  saveNote,
  appendTurn,
} from "@/features/practice/repository";
import { conversation } from "@/features/practice/model";
import {
  respondInCharacter,
  roleplayMessages,
} from "@/features/practice/roleplay";

const uuid = z.uuid();
const text = z.string().trim().min(1).max(2000);
const action = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("note"), id: uuid, situation: text }),
  z.strictObject({
    kind: z.literal("turn"),
    id: uuid,
    caseId: uuid,
    parentId: uuid.nullable(),
    reply: text.nullable(),
    locale: z.enum(["vi", "en"]),
  }),
]);
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
const missing = () => json({ error: "Case or turn unavailable" }, 404);
const conflict = () => json({ error: "Request conflict" }, 409);

export async function GET(request: Request) {
  try {
    const { workspace } = await requirePeopleSession(request);
    const id = new URL(request.url).searchParams.get("case");
    if (id === null) return json({ cases: await listCases(workspace.id) });
    if (!uuid.safeParse(id).success || !(await getCase(workspace.id, id)))
      return missing();
    return json({ turns: await listTurns(workspace.id, id) });
  } catch (error) {
    return peopleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requirePeopleMutation(request);
    const workspace = context.workspace.id;
    const quota = await consumeRateLimit({
      action: "practice.write",
      scopeKey: workspaceRateScope(workspace),
      limit: 120,
      windowSeconds: 3600,
    });
    if (!quota.allowed) return quotaResponse(quota.retryAfterSeconds);
    const parsed = action.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Invalid rehearsal" }, 400);
    const input = parsed.data;
    if (input.kind === "note") {
      const note = await saveNote(workspace, input.id, input.situation);
      return note ? json({ note }) : conflict();
    }
    if ((input.parentId === null) !== (input.reply === null))
      return json({ error: "Invalid exchange" }, 400);
    const note = await getCase(workspace, input.caseId);
    if (!note) return missing();
    const turns = await listTurns(workspace, input.caseId);
    const existing = turns.find(
      (turn) =>
        turn.id === input.id ||
        (input.parentId === null && turn.parentId === null),
    );
    if (existing)
      return existing.parentId === input.parentId &&
        existing.reply === input.reply
        ? json({ turn: existing })
        : conflict();
    const path = conversation(turns, input.parentId);
    if (input.parentId && !path.length) return missing();
    const aiQuota = await consumePeopleAiQuota(context, "practice.roleplay");
    if (!aiQuota.allowed) return quotaResponse(aiQuota.retryAfterSeconds);
    const counterpart = await respondInCharacter(
      roleplayMessages(note.situation, path, input.reply, input.locale),
      request.signal,
    );
    const turn = await appendTurn(workspace, note.id, {
      id: input.id,
      parentId: input.parentId,
      reply: input.reply,
      counterpart,
    });
    return turn ? json({ turn }) : conflict();
  } catch (error) {
    return peopleApiError(error);
  }
}
