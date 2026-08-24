import { db } from "@/lib/db/client";

export async function supersedePendingExecutionSuggestions(input: {
  contextId: string;
  contextKey: "diagnosisId" | "problemId";
  kind: "design_candidate" | "diagnosis_candidate";
  workspaceId: string;
}): Promise<void> {
  await db()`
    UPDATE ai_suggestions
    SET acceptance_state = 'rejected',
        reviewed_at = now(),
        updated_at = now()
    WHERE workspace_id = ${input.workspaceId}::uuid
      AND kind = ${input.kind}
      AND acceptance_state = 'pending'
      AND payload ->> ${input.contextKey} = ${input.contextId}
  `;
}
