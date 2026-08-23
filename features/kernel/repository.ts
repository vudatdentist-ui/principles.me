import { db } from "@/lib/db/client";

export interface GoalRecord {
  readonly desiredState: string;
  readonly id: string;
  readonly status: "chosen" | "completed" | "discovering" | "paused" | "retired";
  readonly whyItMatters: string | null;
  readonly workspaceId: string;
}

export async function createGoal(input: {
  createdByUserId: string;
  desiredState: string;
  whyItMatters?: string | null;
  workspaceId: string;
}): Promise<GoalRecord> {
  const rows = await db()`
    INSERT INTO goals (
      workspace_id,
      created_by_user_id,
      desired_state,
      why_it_matters
    ) VALUES (
      ${input.workspaceId}::uuid,
      ${input.createdByUserId}::uuid,
      ${input.desiredState.trim()},
      ${input.whyItMatters?.trim() || null}
    )
    RETURNING id, workspace_id, desired_state, why_it_matters, status
  `;
  const row = rows[0];
  if (!row) {
    throw new Error("Goal was not created.");
  }
  return mapGoal(row);
}

export async function getGoal(
  workspaceId: string,
  goalId: string
): Promise<GoalRecord | null> {
  const rows = await db()`
    SELECT id, workspace_id, desired_state, why_it_matters, status
    FROM goals
    WHERE id = ${goalId}::uuid AND workspace_id = ${workspaceId}::uuid
    LIMIT 1
  `;
  return rows[0] ? mapGoal(rows[0]) : null;
}

export async function listGoals(workspaceId: string): Promise<GoalRecord[]> {
  const rows = await db()`
    SELECT id, workspace_id, desired_state, why_it_matters, status
    FROM goals
    WHERE workspace_id = ${workspaceId}::uuid
    ORDER BY created_at DESC
  `;
  return rows.map(mapGoal);
}

export async function createAiSuggestion(input: {
  evidenceIds?: readonly string[];
  kind: string;
  modelName?: string | null;
  modelProvider?: string | null;
  payload: Record<string, unknown>;
  requestedByUserId?: string | null;
  workspaceId: string;
}): Promise<string> {
  return db().begin(async (transaction) => {
    const rows = await transaction`
      INSERT INTO ai_suggestions (
        workspace_id,
        requested_by_user_id,
        kind,
        payload,
        model_provider,
        model_name
      ) VALUES (
        ${input.workspaceId}::uuid,
        ${input.requestedByUserId ?? null}::uuid,
        ${input.kind},
        ${transaction.json(input.payload)},
        ${input.modelProvider ?? null},
        ${input.modelName ?? null}
      )
      RETURNING id
    `;
    const suggestionId = String(rows[0]?.id);
    for (const evidenceId of input.evidenceIds ?? []) {
      await transaction`
        INSERT INTO ai_suggestion_evidence (
          workspace_id,
          suggestion_id,
          evidence_id
        ) VALUES (
          ${input.workspaceId}::uuid,
          ${suggestionId}::uuid,
          ${evidenceId}::uuid
        )
        ON CONFLICT DO NOTHING
      `;
    }
    return suggestionId;
  });
}

function mapGoal(row: Record<string, unknown>): GoalRecord {
  return {
    desiredState: String(row.desired_state),
    id: String(row.id),
    status: String(row.status) as GoalRecord["status"],
    whyItMatters: row.why_it_matters ? String(row.why_it_matters) : null,
    workspaceId: String(row.workspace_id),
  };
}
