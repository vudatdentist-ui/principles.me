import type postgres from "postgres";
import { db } from "@/lib/db/client";
import type {
  AppliedPrincipleRevision,
  LearningCaseRecord,
  LearningPatternDraft,
  LearningPatternKind,
  LearningPatternRecord,
  LearningState,
  PrincipleRevisionProposal,
} from "./contracts";

type Row = Record<string, unknown>;
type Transaction = postgres.TransactionSql;

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function payloadObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function payloadString(value: unknown, key: string): string {
  const item = payloadObject(value)[key];
  return typeof item === "string" ? item.trim() : "";
}

function payloadNumber(value: unknown, key: string): number | null {
  const item = payloadObject(value)[key];
  return typeof item === "number" && Number.isFinite(item) ? item : null;
}

function payloadStrings(value: unknown, key: string): string[] {
  const item = payloadObject(value)[key];
  if (!Array.isArray(item)) {
    return [];
  }
  return item
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function nestedObject(value: unknown, key: string): Record<string, unknown> | null {
  const item = payloadObject(value)[key];
  return item && typeof item === "object" && !Array.isArray(item)
    ? (item as Record<string, unknown>)
    : null;
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

async function caseRows(
  sql: ReturnType<typeof db>,
  workspaceId: string,
  patternId?: string
): Promise<Row[]> {
  if (patternId) {
    return sql`
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
        dia.root_cause_hypothesis
      FROM learning_pattern_cases lpc
      JOIN reflections r
        ON r.id = lpc.reflection_id
       AND r.workspace_id = lpc.workspace_id
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
      WHERE lpc.workspace_id = ${workspaceId}::uuid
        AND lpc.pattern_id = ${patternId}::uuid
        AND r.status = 'completed'
      ORDER BY lpc.position ASC
    `;
  }

  return sql`
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
      dia.root_cause_hypothesis
    FROM reflections r
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
    WHERE r.workspace_id = ${workspaceId}::uuid
      AND r.status = 'completed'
      AND r.goal_id IS NOT NULL
      AND r.problem_id IS NOT NULL
    ORDER BY r.created_at ASC
    LIMIT 40
  `;
}

export async function loadLearningCases(
  workspaceId: string
): Promise<LearningCaseRecord[]> {
  return (await caseRows(db(), workspaceId)).map(mapCase);
}

export type LearningPrincipleOption = {
  id: string;
  rationale: string | null;
  rule: string;
  trigger: string;
};

export async function loadLearningPrinciples(
  workspaceId: string
): Promise<LearningPrincipleOption[]> {
  const rows = await db()`
    SELECT id, trigger, rule, rationale
    FROM principles
    WHERE workspace_id = ${workspaceId}::uuid
      AND acceptance_state <> 'rejected'
      AND lifecycle_state <> 'retired'
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 20
  `;
  return rows.map((row) => ({
    id: String(row.id),
    rationale: nullableString(row.rationale),
    rule: String(row.rule),
    trigger: String(row.trigger),
  }));
}

export async function persistLearningSuggestion(input: {
  caseReflectionIds: readonly string[];
  confidence: number | null;
  contradictingEvidence: string;
  implication: string;
  kind: LearningPatternKind;
  modelName: string | null;
  modelProvider: string;
  principleRevision: {
    principleId: string;
    proposedRationale: string;
    proposedRule: string;
    proposedTrigger: string;
  } | null;
  requestedByUserId: string;
  statement: string;
  supportingEvidence: string;
  uncertainty: string;
  workspaceId: string;
}): Promise<string> {
  return db().begin(async (transaction) => {
    await transaction`
      UPDATE ai_suggestions
      SET acceptance_state = 'rejected', reviewed_at = now(), updated_at = now()
      WHERE workspace_id = ${input.workspaceId}::uuid
        AND kind = 'learning_pattern_candidate'
        AND acceptance_state = 'pending'
    `;
    const payload = {
      caseReflectionIds: [...new Set(input.caseReflectionIds)],
      confidence: input.confidence,
      contradictingEvidence: input.contradictingEvidence,
      implication: input.implication,
      kind: input.kind,
      principleRevision: input.principleRevision,
      statement: input.statement,
      supportingEvidence: input.supportingEvidence,
      uncertainty: input.uncertainty,
    };
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
        ${input.requestedByUserId}::uuid,
        'learning_pattern_candidate',
        ${transaction.json(payload)},
        ${input.modelProvider},
        ${input.modelName}
      )
      RETURNING id
    `;
    const id = rows[0]?.id;
    if (!id) {
      throw new Error("Learning proposal was not stored.");
    }
    return String(id);
  });
}

async function latestPendingLearningSuggestion(
  transaction: Transaction,
  workspaceId: string
): Promise<Row> {
  const rows = await transaction`
    SELECT id, payload
    FROM ai_suggestions
    WHERE workspace_id = ${workspaceId}::uuid
      AND kind = 'learning_pattern_candidate'
      AND acceptance_state = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE
  `;
  const row = rows[0];
  if (!row) {
    throw new Error("Learning proposal was not found.");
  }
  return row;
}

async function verifiedCase(
  transaction: Transaction,
  workspaceId: string,
  reflectionId: string
): Promise<{ goalId: string; problemId: string }> {
  const rows = await transaction`
    SELECT goal_id, problem_id
    FROM reflections
    WHERE id = ${reflectionId}::uuid
      AND workspace_id = ${workspaceId}::uuid
      AND status = 'completed'
      AND goal_id IS NOT NULL
      AND problem_id IS NOT NULL
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    throw new Error("Learning case is not a completed Reflection in this workspace.");
  }
  return { goalId: String(row.goal_id), problemId: String(row.problem_id) };
}

export async function createLearningPattern(input: {
  draft: LearningPatternDraft;
  userId: string;
  workspaceId: string;
}): Promise<string> {
  return db().begin(async (transaction) => {
    const suggestion = await latestPendingLearningSuggestion(
      transaction,
      input.workspaceId
    );
    const payload = suggestion.payload;
    const caseReflectionIds = [
      ...new Set(payloadStrings(payload, "caseReflectionIds")),
    ];
    if (caseReflectionIds.length < 2 || caseReflectionIds.length > 8) {
      throw new Error("Learning Patterns require two to eight durable cases.");
    }

    const proposalKind = payloadString(payload, "kind") as LearningPatternKind;
    const unchanged =
      proposalKind === input.draft.kind &&
      payloadString(payload, "statement") === input.draft.statement.trim() &&
      payloadString(payload, "implication") === input.draft.implication.trim() &&
      payloadString(payload, "supportingEvidence") ===
        input.draft.supportingEvidence.trim() &&
      payloadString(payload, "contradictingEvidence") ===
        input.draft.contradictingEvidence.trim() &&
      payloadString(payload, "uncertainty") === input.draft.uncertainty.trim() &&
      payloadNumber(payload, "confidence") === input.draft.confidence;
    const acceptanceState = unchanged ? "accepted" : "revised";

    const rows = await transaction`
      INSERT INTO learning_patterns (
        workspace_id,
        created_by_user_id,
        origin_ai_suggestion_id,
        kind,
        statement,
        implication,
        supporting_evidence,
        contradicting_evidence,
        uncertainty,
        confidence,
        acceptance_state,
        lifecycle_state
      ) VALUES (
        ${input.workspaceId}::uuid,
        ${input.userId}::uuid,
        ${String(suggestion.id)}::uuid,
        ${input.draft.kind},
        ${input.draft.statement.trim()},
        ${input.draft.implication.trim()},
        ${input.draft.supportingEvidence.trim() || null},
        ${input.draft.contradictingEvidence.trim() || null},
        ${input.draft.uncertainty.trim() || null},
        ${input.draft.confidence},
        ${acceptanceState},
        'active'
      )
      RETURNING id
    `;
    const patternId = rows[0]?.id;
    if (!patternId) {
      throw new Error("Learning Pattern was not created.");
    }

    for (const [position, reflectionId] of caseReflectionIds.entries()) {
      const verified = await verifiedCase(
        transaction,
        input.workspaceId,
        reflectionId
      );
      await transaction`
        INSERT INTO learning_pattern_cases (
          workspace_id,
          pattern_id,
          reflection_id,
          goal_id,
          problem_id,
          position
        ) VALUES (
          ${input.workspaceId}::uuid,
          ${String(patternId)}::uuid,
          ${reflectionId}::uuid,
          ${verified.goalId}::uuid,
          ${verified.problemId}::uuid,
          ${position}
        )
      `;
    }

    await transaction`
      UPDATE ai_suggestions
      SET acceptance_state = ${acceptanceState}, reviewed_at = now(), updated_at = now()
      WHERE id = ${String(suggestion.id)}::uuid
        AND workspace_id = ${input.workspaceId}::uuid
        AND acceptance_state = 'pending'
    `;
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
        ${acceptanceState === "accepted" ? "learning.pattern_accepted" : "learning.pattern_revised"},
        'learning_pattern',
        ${String(patternId)}::uuid
      )
    `;
    return String(patternId);
  });
}

export async function rejectLatestLearningProposal(input: {
  userId: string;
  workspaceId: string;
}): Promise<void> {
  await db().begin(async (transaction) => {
    const suggestion = await latestPendingLearningSuggestion(
      transaction,
      input.workspaceId
    );
    await transaction`
      UPDATE ai_suggestions
      SET acceptance_state = 'rejected', reviewed_at = now(), updated_at = now()
      WHERE id = ${String(suggestion.id)}::uuid
        AND workspace_id = ${input.workspaceId}::uuid
        AND acceptance_state = 'pending'
    `;
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
        'learning.proposal_rejected',
        'ai_suggestion',
        ${String(suggestion.id)}::uuid
      )
    `;
  });
}

function revisionFromPayload(
  payload: unknown,
  current: { id: string; rationale: string | null; rule: string; trigger: string } | null
): PrincipleRevisionProposal | null {
  const value = nestedObject(payload, "principleRevision");
  if (!value || !current) {
    return null;
  }
  const principleId = payloadString(value, "principleId");
  if (!principleId || principleId !== current.id) {
    return null;
  }
  const proposedTrigger = payloadString(value, "proposedTrigger");
  const proposedRule = payloadString(value, "proposedRule");
  const proposedRationale = payloadString(value, "proposedRationale");
  if (!proposedTrigger || !proposedRule || !proposedRationale) {
    return null;
  }
  return {
    currentRationale: current.rationale,
    currentRule: current.rule,
    currentTrigger: current.trigger,
    principleId,
    proposedRationale,
    proposedRule,
    proposedTrigger,
  };
}

async function currentPrincipleForSuggestion(
  workspaceId: string,
  payload: unknown
): Promise<{ id: string; rationale: string | null; rule: string; trigger: string } | null> {
  const revision = nestedObject(payload, "principleRevision");
  if (!revision) {
    return null;
  }
  const principleId = payloadString(revision, "principleId");
  if (!principleId) {
    return null;
  }
  const rows = await db()`
    SELECT id, trigger, rule, rationale
    FROM principles
    WHERE id = ${principleId}::uuid
      AND workspace_id = ${workspaceId}::uuid
      AND acceptance_state <> 'rejected'
      AND lifecycle_state <> 'retired'
    LIMIT 1
  `;
  const row = rows[0];
  return row
    ? {
        id: String(row.id),
        rationale: nullableString(row.rationale),
        rule: String(row.rule),
        trigger: String(row.trigger),
      }
    : null;
}

function mapAppliedRevision(row: Row | undefined): AppliedPrincipleRevision | null {
  if (!row) {
    return null;
  }
  return {
    principleId: String(row.principle_id),
    previousRationale: nullableString(row.previous_rationale),
    previousRule: String(row.previous_rule),
    previousTrigger: String(row.previous_trigger),
    revisedRationale: nullableString(row.revised_rationale),
    revisedRule: String(row.revised_rule),
    revisedTrigger: String(row.revised_trigger),
  };
}

export async function loadLearningState(workspaceId: string): Promise<LearningState> {
  const [historyRows, patternRows] = await Promise.all([
    db()`
      SELECT count(*)::int AS count
      FROM reflections
      WHERE workspace_id = ${workspaceId}::uuid
        AND status = 'completed'
        AND goal_id IS NOT NULL
        AND problem_id IS NOT NULL
    `,
    db()`
      SELECT id, workspace_id, origin_ai_suggestion_id, kind, statement,
        implication, supporting_evidence, contradicting_evidence, uncertainty,
        confidence, acceptance_state, lifecycle_state, applied_at
      FROM learning_patterns
      WHERE workspace_id = ${workspaceId}::uuid
      ORDER BY created_at DESC
    `,
  ]);

  const patterns: LearningPatternRecord[] = [];
  for (const row of patternRows) {
    const patternId = String(row.id);
    const originSuggestionId = nullableString(row.origin_ai_suggestion_id);
    const [cases, suggestionRows, revisionRows] = await Promise.all([
      caseRows(db(), workspaceId, patternId),
      originSuggestionId
        ? db()`
            SELECT payload
            FROM ai_suggestions
            WHERE id = ${originSuggestionId}::uuid
              AND workspace_id = ${workspaceId}::uuid
            LIMIT 1
          `
        : Promise.resolve([] as Row[]),
      db()`
        SELECT principle_id, previous_trigger, previous_rule, previous_rationale,
          revised_trigger, revised_rule, revised_rationale
        FROM principle_learning_revisions
        WHERE workspace_id = ${workspaceId}::uuid
          AND pattern_id = ${patternId}::uuid
        LIMIT 1
      `,
    ]);
    const suggestionPayload = suggestionRows[0]?.payload;
    const currentPrinciple = suggestionPayload
      ? await currentPrincipleForSuggestion(workspaceId, suggestionPayload)
      : null;
    patterns.push({
      acceptanceState: String(row.acceptance_state) as LearningPatternRecord["acceptanceState"],
      appliedAt:
        row.applied_at instanceof Date
          ? row.applied_at.toISOString()
          : nullableString(row.applied_at),
      appliedRevision: mapAppliedRevision(revisionRows[0]),
      cases: cases.map(mapCase),
      confidence:
        row.confidence === null || row.confidence === undefined
          ? null
          : Number(row.confidence),
      contradictingEvidence: nullableString(row.contradicting_evidence),
      id: patternId,
      implication: String(row.implication),
      kind: String(row.kind) as LearningPatternKind,
      lifecycleState: String(row.lifecycle_state) as LearningPatternRecord["lifecycleState"],
      originSuggestionId,
      principleRevisionProposal: revisionFromPayload(
        suggestionPayload,
        currentPrinciple
      ),
      statement: String(row.statement),
      supportingEvidence: nullableString(row.supporting_evidence),
      uncertainty: nullableString(row.uncertainty),
      workspaceId: String(row.workspace_id),
    });
  }

  return {
    historyCount: Number(historyRows[0]?.count ?? 0),
    patterns,
  };
}

export async function applyLearningPrincipleRevision(input: {
  patternId: string;
  principleId: string;
  rationale: string;
  rule: string;
  trigger: string;
  userId: string;
  workspaceId: string;
}): Promise<void> {
  await db().begin(async (transaction) => {
    const patternRows = await transaction`
      SELECT id, origin_ai_suggestion_id, acceptance_state, lifecycle_state
      FROM learning_patterns
      WHERE id = ${input.patternId}::uuid
        AND workspace_id = ${input.workspaceId}::uuid
      LIMIT 1
      FOR UPDATE
    `;
    const pattern = patternRows[0];
    if (
      !pattern ||
      !["accepted", "revised"].includes(String(pattern.acceptance_state)) ||
      String(pattern.lifecycle_state) !== "active"
    ) {
      throw new Error("Learning Pattern is not active and accepted.");
    }

    const suggestionId = nullableString(pattern.origin_ai_suggestion_id);
    if (!suggestionId) {
      throw new Error("Learning Pattern has no revision provenance.");
    }
    const suggestionRows = await transaction`
      SELECT payload
      FROM ai_suggestions
      WHERE id = ${suggestionId}::uuid
        AND workspace_id = ${input.workspaceId}::uuid
      LIMIT 1
    `;
    const revisionPayload = nestedObject(
      suggestionRows[0]?.payload,
      "principleRevision"
    );
    const targetPrincipleId = revisionPayload
      ? payloadString(revisionPayload, "principleId")
      : "";
    if (!targetPrincipleId || targetPrincipleId !== input.principleId) {
      throw new Error("Principle revision does not belong to this Learning Pattern.");
    }

    const principleRows = await transaction`
      SELECT id, trigger, rule, rationale, acceptance_state, lifecycle_state
      FROM principles
      WHERE id = ${input.principleId}::uuid
        AND workspace_id = ${input.workspaceId}::uuid
      LIMIT 1
      FOR UPDATE
    `;
    const principle = principleRows[0];
    if (
      !principle ||
      String(principle.acceptance_state) === "rejected" ||
      String(principle.lifecycle_state) === "retired"
    ) {
      throw new Error("Principle is not available for revision.");
    }

    await transaction`
      INSERT INTO principle_learning_revisions (
        workspace_id,
        principle_id,
        pattern_id,
        created_by_user_id,
        previous_trigger,
        previous_rule,
        previous_rationale,
        revised_trigger,
        revised_rule,
        revised_rationale
      ) VALUES (
        ${input.workspaceId}::uuid,
        ${input.principleId}::uuid,
        ${input.patternId}::uuid,
        ${input.userId}::uuid,
        ${String(principle.trigger)},
        ${String(principle.rule)},
        ${nullableString(principle.rationale)},
        ${input.trigger.trim()},
        ${input.rule.trim()},
        ${input.rationale.trim() || null}
      )
    `;

    await transaction`
      UPDATE principles
      SET trigger = ${input.trigger.trim()},
          rule = ${input.rule.trim()},
          rationale = ${input.rationale.trim() || null},
          acceptance_state = 'revised',
          lifecycle_state = 'testing',
          updated_at = now()
      WHERE id = ${input.principleId}::uuid
        AND workspace_id = ${input.workspaceId}::uuid
    `;

    await transaction`
      UPDATE learning_patterns
      SET lifecycle_state = 'applied', applied_at = now(), updated_at = now()
      WHERE id = ${input.patternId}::uuid
        AND workspace_id = ${input.workspaceId}::uuid
    `;

    await transaction`
      INSERT INTO activity_events (
        workspace_id,
        actor_user_id,
        event_type,
        subject_type,
        subject_id,
        metadata
      ) VALUES (
        ${input.workspaceId}::uuid,
        ${input.userId}::uuid,
        'principle.revised_from_learning',
        'principle',
        ${input.principleId}::uuid,
        ${transaction.json({ patternId: input.patternId })}
      )
    `;
  });
}
