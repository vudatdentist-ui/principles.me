import { db } from "@/lib/db/client";

function payloadString(payload: unknown, key: string): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

export async function assertProblemSuggestionContext(input: {
  evidenceId: string;
  goalId: string;
  suggestionId: string;
  workspaceId: string;
}): Promise<void> {
  const rows = await db()`
    SELECT s.payload
    FROM ai_suggestions s
    JOIN ai_suggestion_evidence se
      ON se.suggestion_id = s.id AND se.workspace_id = s.workspace_id
    WHERE s.id = ${input.suggestionId}::uuid
      AND s.workspace_id = ${input.workspaceId}::uuid
      AND s.kind = 'problem_candidate'
      AND se.evidence_id = ${input.evidenceId}::uuid
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || payloadString(row.payload, "goalId") !== input.goalId) {
    throw new Error("Problem suggestion context does not match.");
  }
}

export async function principleSuggestionEvidence(
  workspaceId: string,
  suggestionId: string
): Promise<string[]> {
  const rows = await db()`
    SELECT se.evidence_id
    FROM ai_suggestions s
    JOIN ai_suggestion_evidence se
      ON se.suggestion_id = s.id AND se.workspace_id = s.workspace_id
    WHERE s.id = ${suggestionId}::uuid
      AND s.workspace_id = ${workspaceId}::uuid
      AND s.kind = 'principle_candidate'
    ORDER BY se.evidence_id
  `;
  return rows.map((row) => String(row.evidence_id));
}
