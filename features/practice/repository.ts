import { db } from "@/lib/db/client";
import type { PracticeCase, Turn } from "./model";

export async function listCases(workspace: string) {
  return db()<PracticeCase[]>`SELECT id, situation, updated_at AS "updatedAt"
    FROM practice_cases WHERE workspace_id = ${workspace} ORDER BY updated_at DESC, id`;
}

export async function saveNote(
  workspace: string,
  id: string,
  situation: string,
) {
  const rows = await db()<
    PracticeCase[]
  >`INSERT INTO practice_cases (workspace_id,id,situation)
    VALUES (${workspace},${id},${situation}) ON CONFLICT (id) DO NOTHING
    RETURNING id, situation, updated_at AS "updatedAt"`;
  if (rows[0]) return rows[0];
  const existing = await getCase(workspace, id);
  return existing?.situation === situation ? existing : null;
}

export async function getCase(workspace: string, id: string) {
  const rows = await db()<
    PracticeCase[]
  >`SELECT id, situation, updated_at AS "updatedAt"
    FROM practice_cases WHERE workspace_id = ${workspace} AND id = ${id}`;
  return rows[0];
}

export async function listTurns(workspace: string, id: string) {
  return db()<
    Turn[]
  >`SELECT id, parent_id AS "parentId", reply, counterpart FROM practice_turns
    WHERE workspace_id = ${workspace} AND case_id = ${id} ORDER BY created_at, id`;
}

export async function appendTurn(
  workspace: string,
  caseId: string,
  turn: Turn,
) {
  return db().begin(async (sql) => {
    const inserted =
      await sql`INSERT INTO practice_turns (workspace_id, case_id, id, parent_id, reply, counterpart)
      VALUES (${workspace},${caseId},${turn.id},${turn.parentId},${turn.reply},${turn.counterpart})
      ON CONFLICT DO NOTHING RETURNING id`;
    if (inserted.length) {
      await sql`UPDATE practice_cases SET updated_at = now() WHERE workspace_id = ${workspace} AND id = ${caseId}`;
      return turn;
    }
    const [existing] = await sql<
      Turn[]
    >`SELECT id, parent_id AS "parentId", reply, counterpart FROM practice_turns
      WHERE workspace_id = ${workspace} AND case_id = ${caseId}
      AND (id = ${turn.id} OR (parent_id IS NULL AND ${turn.parentId}::uuid IS NULL))`;
    return existing?.reply === turn.reply && existing.parentId === turn.parentId
      ? existing
      : null;
  });
}
