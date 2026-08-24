import { db } from "@/lib/db/client";
import type { LearningCaseRecord } from "./contracts";

type Row = Record<string, unknown>;

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function mapCase(row: Row): LearningCaseRecord {
  const outcomeId = nullableString(row.outcome_id);
  return {
    diagnosis: nullableString(row.root_cause_hypothesis),
    design: nullableString(row.machine_change),
    expected: nullableString(row.expected),
    goal: String(row.desired_state),
    goalId: String(row.goal_id),
    happened: String(row.happened),
    learning: nullableString(row.learning),
    outcome: outcomeId
      ? {
          actualResult: String(row.actual_result),
          comparison: String(row.comparison) as NonNullable<
            LearningCaseRecord["outcome"]
          >["comparison"],
          expectedResult: String(row.outcome_expected_result),
        }
      : null,
    phase: outcomeId ? "outcome_review" : "reflection",
    problem: String(row.problem_statement),
    problemId: String(row.problem_id),
    recurrenceNote: nullableString(row.recurrence_note),
    recurring:
      typeof row.recurring === "boolean"
        ? row.recurring
        : row.recurring === null || row.recurring === undefined
          ? null
          : Boolean(row.recurring),
    reflectionId: String(row.reflection_id),
    surprise: nullableString(row.surprise),
  };
}

export async function loadLearningProposalCases(
  workspaceId: string
): Promise<LearningCaseRecord[]> {
  const rows = await db()`
    WITH recent_reflections AS (
      SELECT id, created_at
      FROM reflections
      WHERE workspace_id = ${workspaceId}::uuid
        AND status = 'completed'
        AND goal_id IS NOT NULL
        AND problem_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 8
    )
    SELECT
      r.id AS reflection_id,
      r.goal_id,
      r.problem_id,
      r.happened,
      r.expected,
      r.surprise,
      r.learning,
      r.recurring,
      r.recurrence_note,
      g.desired_state,
      p.statement AS problem_statement,
      ore.outcome_id,
      o.expected_result AS outcome_expected_result,
      o.actual_result,
      o.comparison,
      d.machine_change,
      dia.root_cause_hypothesis,
      recent.created_at
    FROM recent_reflections recent
    JOIN reflections r
      ON r.id = recent.id
     AND r.workspace_id = ${workspaceId}::uuid
    JOIN goals g
      ON g.id = r.goal_id
     AND g.workspace_id = r.workspace_id
    JOIN problems p
      ON p.id = r.problem_id
     AND p.workspace_id = r.workspace_id
     AND p.goal_id = r.goal_id
    LEFT JOIN outcome_reflections ore
      ON ore.reflection_id = r.id
     AND ore.workspace_id = r.workspace_id
    LEFT JOIN outcomes o
      ON o.id = ore.outcome_id
     AND o.workspace_id = ore.workspace_id
    LEFT JOIN designs d
      ON d.id = o.design_id
     AND d.workspace_id = o.workspace_id
    LEFT JOIN diagnoses dia
      ON dia.id = o.diagnosis_id
     AND dia.workspace_id = o.workspace_id
    ORDER BY recent.created_at ASC
  `;
  return rows.map(mapCase);
}
