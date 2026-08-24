import { db } from "@/lib/db/client";
import type { JsonObject } from "@/features/kernel/json";
import type { PrincipleRecord } from "./contracts";

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

export async function persistAiPrincipleCandidate(input: {
  confidence: number | null;
  evidenceIds: readonly string[];
  modelName: string | null;
  modelProvider: string;
  rationale: string;
  reflectionId: string;
  rule: string;
  trigger: string;
  userId: string;
  workspaceId: string;
}): Promise<PrincipleRecord> {
  return db().begin(async (transaction) => {
    const evidenceIds = [...new Set(input.evidenceIds)];
    const payload: JsonObject = {
      confidence: input.confidence,
      rationale: input.rationale,
      reflectionId: input.reflectionId,
      rule: input.rule,
      trigger: input.trigger,
    };

    const suggestionRows = await transaction`
      INSERT INTO ai_suggestions (
        workspace_id,
        requested_by_user_id,
        kind,
        payload,
        model_provider,
        model_name
      ) VALUES (
        ${input.workspaceId}::uuid,
        ${input.userId}::uuid,
        'principle_candidate',
        ${transaction.json(payload)},
        ${input.modelProvider},
        ${input.modelName}
      )
      RETURNING id
    `;
    const suggestionId = String(suggestionRows[0]?.id);
    if (!suggestionId) {
      throw new Error("Principle suggestion was not persisted.");
    }

    for (const evidenceId of evidenceIds) {
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
      `;
    }

    const principleRows = await transaction`
      INSERT INTO principles (
        workspace_id,
        created_by_user_id,
        origin_reflection_id,
        origin_ai_suggestion_id,
        trigger,
        rule,
        rationale,
        confidence,
        lifecycle_state,
        acceptance_state
      ) VALUES (
        ${input.workspaceId}::uuid,
        ${input.userId}::uuid,
        ${input.reflectionId}::uuid,
        ${suggestionId}::uuid,
        ${input.trigger.trim()},
        ${input.rule.trim()},
        ${input.rationale.trim() || null},
        ${input.confidence},
        'candidate',
        'pending'
      )
      RETURNING id, origin_reflection_id, trigger, rule, rationale,
        confidence, lifecycle_state, acceptance_state
    `;
    const row = principleRows[0];
    if (!row) {
      throw new Error("Principle candidate was not persisted.");
    }
    const principleId = String(row.id);

    for (const evidenceId of evidenceIds) {
      await transaction`
        INSERT INTO principle_evidence (workspace_id, principle_id, evidence_id)
        VALUES (
          ${input.workspaceId}::uuid,
          ${principleId}::uuid,
          ${evidenceId}::uuid
        )
      `;
    }

    await transaction`
      INSERT INTO activity_events (
        workspace_id,
        actor_user_id,
        event_type,
        subject_type,
        subject_id
      ) VALUES (
        ${input.workspaceId}::uuid,
        ${input.userId}::uuid,
        'principle.candidate_created',
        'principle',
        ${principleId}::uuid
      )
    `;

    return {
      acceptanceState: String(row.acceptance_state) as PrincipleRecord["acceptanceState"],
      confidence:
        row.confidence === null || row.confidence === undefined
          ? null
          : Number(row.confidence),
      evidenceIds,
      id: principleId,
      lifecycleState: String(row.lifecycle_state) as PrincipleRecord["lifecycleState"],
      originReflectionId: nullableString(row.origin_reflection_id),
      rationale: nullableString(row.rationale),
      rule: String(row.rule),
      trigger: String(row.trigger),
    };
  });
}
