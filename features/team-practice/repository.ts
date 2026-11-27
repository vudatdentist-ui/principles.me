import { db } from "@/lib/db/client";
import {
  isMyTurn,
  type Command,
  type Organization,
  type Room,
} from "./contracts";

export class Unavailable extends Error {}
export class TurnConflict extends Error {}

export async function practiceState(actor: string) {
  const sql = db();
  const [organizations, rooms] = await Promise.all([
    sql<Organization[]>`
      SELECT p.handle, w.name, ARRAY(
        SELECT u.email FROM workspace_memberships m JOIN users u ON u.id = m.user_id
        WHERE m.workspace_id = p.workspace_id AND u.id <> ${actor} AND u.status = 'active'
        ORDER BY u.email
      ) AS partners
      FROM workspace_memberships mine JOIN organization_profiles p USING (workspace_id)
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE mine.user_id = ${actor} ORDER BY w.name, p.handle`,
    sql<Room[]>`
      SELECT s.id, w.name AS organization, scenario, replies, revision,
        initiator = ${actor} AS first, u.email AS other
      FROM team_practice_sessions s JOIN workspaces w ON w.id = s.workspace_id
      JOIN users u ON u.id = CASE WHEN initiator = ${actor} THEN partner ELSE initiator END
      WHERE ${actor} IN (initiator, partner) ORDER BY s.created_at DESC, s.id`,
  ]);
  return { organizations, rooms };
}

export async function applyCommand(
  actor: string,
  input: Command,
): Promise<string> {
  const sql = db();
  if (input.kind === "create") {
    const [room] = await sql`
      INSERT INTO team_practice_sessions (workspace_id, initiator, partner, scenario)
      SELECT p.workspace_id, mine.user_id, u.id, ${input.scenario}
      FROM organization_profiles p JOIN workspace_memberships mine USING (workspace_id)
      JOIN workspace_memberships peer USING (workspace_id) JOIN users u ON u.id = peer.user_id
      WHERE p.handle = ${input.handle} AND mine.user_id = ${actor} AND u.id <> mine.user_id
        AND u.email_normalized = ${input.partner.toLowerCase()} AND u.status = 'active'
      RETURNING id`;
    if (!room) throw new Unavailable();
    return String(room.id);
  }

  return sql.begin(async (tx) => {
    const [room] = await tx`
      SELECT revision, initiator = ${actor} AS first FROM team_practice_sessions
      WHERE id = ${input.id} AND ${actor} IN (initiator, partner) FOR UPDATE`;
    if (!room) throw new Unavailable();
    if (room.revision !== input.revision) throw new TurnConflict();
    if (input.kind === "switch") {
      if (room.revision !== 2) throw new TurnConflict();
      await tx`UPDATE team_practice_sessions SET revision = revision + 1 WHERE id = ${input.id}`;
    } else {
      if (!isMyTurn(room.revision, room.first)) throw new TurnConflict();
      await tx`UPDATE team_practice_sessions SET revision = revision + 1,
        replies = array_append(replies, ${input.text}::text) WHERE id = ${input.id}`;
    }
    return input.id;
  });
}
