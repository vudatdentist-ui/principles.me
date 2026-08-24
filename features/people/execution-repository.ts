import type postgres from "postgres";
import { db } from "@/lib/db/client";
import type {
  DesignRecord,
  DiagnosisRecord,
  ExecutionActionRecord,
  ExecutionState,
  OutcomeComparison,
  OutcomeRecord,
  OutcomeReviewRecord,
} from "./execution-contracts";

type Row = Record<string, unknown>;
type Transaction = postgres.TransactionSql;

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function normalized(value: string | null | undefined): string {
  return value?.trim() ?? "";
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
  return Array.isArray(item)
    ? item.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim())
    : [];
}

function mapDiagnosis(row: Row, evidenceIds: string[] = []): DiagnosisRecord {
  return {
    acceptanceState: String(row.acceptance_state) as DiagnosisRecord["acceptanceState"],
    alternativeHypotheses: nullableString(row.alternative_hypotheses),
    confidence:
      row.confidence === null || row.confidence === undefined ? null : Number(row.confidence),
    contradictingEvidence: nullableString(row.contradicting_evidence),
    evidenceIds,
    goalId: String(row.goal_id),
    id: String(row.id),
    problemId: String(row.problem_id),
    proximateCause: nullableString(row.proximate_cause),
    rootCauseHypothesis: String(row.root_cause_hypothesis),
    supportingEvidence: nullableString(row.supporting_evidence),
    symptom: String(row.symptom),
    uncertainty: nullableString(row.uncertainty),
    workspaceId: String(row.workspace_id),
  };
}

function mapDesign(row: Row): DesignRecord {
  return {
    acceptanceState: String(row.acceptance_state) as DesignRecord["acceptanceState"],
    diagnosisId: String(row.diagnosis_id),
    expectedResult: String(row.expected_result),
    goalId: String(row.goal_id),
    id: String(row.id),
    lifecycleState: String(row.lifecycle_state) as DesignRecord["lifecycleState"],
    machineChange: String(row.machine_change),
    problemId: String(row.problem_id),
    rationale: String(row.rationale),
    successSignal: String(row.success_signal),
    workspaceId: String(row.workspace_id),
  };
}

function mapAction(row: Row): ExecutionActionRecord {
  return {
    commitment: String(row.commitment),
    completedAt:
      row.completed_at instanceof Date
        ? row.completed_at.toISOString()
        : nullableString(row.completed_at),
    designId: String(row.design_id),
    id: String(row.id),
    position: Number(row.position),
    status: String(row.status) as ExecutionActionRecord["status"],
    workspaceId: String(row.workspace_id),
  };
}

function mapOutcome(row: Row): OutcomeRecord {
  return {
    actualResult: String(row.actual_result),
    comparison: String(row.comparison) as OutcomeComparison,
    designId: String(row.design_id),
    diagnosisId: String(row.diagnosis_id),
    evidenceId: String(row.evidence_id),
    expectedResult: String(row.expected_result),
    goalId: String(row.goal_id),
    id: String(row.id),
    observationId: String(row.observation_id),
    observedAt:
      row.observed_at instanceof Date
        ? row.observed_at.toISOString()
        : String(row.observed_at),
    problemId: String(row.problem_id),
    workspaceId: String(row.workspace_id),
  };
}

async function insertActivity(
  transaction: Transaction,
  input: {
    actorUserId: string;
    eventType: string;
    subjectId: string;
    subjectType: string;
    workspaceId: string;
  }
) {
  await transaction`
    INSERT INTO activity_events (
      workspace_id,
      actor_user_id,
      event_type,
      subject_type,
      subject_id
    ) VALUES (
      ${input.workspaceId}::uuid,
      ${input.actorUserId}::uuid,
      ${input.eventType},
      ${input.subjectType},
      ${input.subjectId}::uuid
    )
  `;
}

async function latestPendingSuggestion(
  transaction: Transaction,
  input: {
    contextId: string;
    contextKey: "diagnosisId" | "problemId";
    kind: "design_candidate" | "diagnosis_candidate";
    workspaceId: string;
  }
): Promise<Row> {
  const rows = await transaction`
    SELECT id, payload
    FROM ai_suggestions
    WHERE workspace_id = ${input.workspaceId}::uuid
      AND kind = ${input.kind}
      AND acceptance_state = 'pending'
      AND payload ->> ${input.contextKey} = ${input.contextId}
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE
  `;
  const row = rows[0];
  if (!row) {
    throw new Error("AI proposal was not found.");
  }
  return row;
}

export async function getProblemEvidenceContents(
  workspaceId: string,
  problemId: string
): Promise<Array<{ content: string; id: string; title: string | null }>> {
  const rows = await db()`
    SELECT e.id, e.title, e.content
    FROM problem_evidence pe
    JOIN evidence_records e
      ON e.id = pe.evidence_id
     AND e.workspace_id = pe.workspace_id
    WHERE pe.workspace_id = ${workspaceId}::uuid
      AND pe.problem_id = ${problemId}::uuid
    ORDER BY e.created_at ASC
  `;
  return rows.map((row) => ({
    content: String(row.content),
    id: String(row.id),
    title: nullableString(row.title),
  }));
}

export async function getDiagnosis(
  workspaceId: string,
  diagnosisId: string
): Promise<DiagnosisRecord | null> {
  const rows = await db()`
    SELECT id, workspace_id, goal_id, problem_id, symptom, proximate_cause,
      root_cause_hypothesis, supporting_evidence, contradicting_evidence,
      alternative_hypotheses, uncertainty, confidence, acceptance_state
    FROM diagnoses
    WHERE workspace_id = ${workspaceId}::uuid
      AND id = ${diagnosisId}::uuid
    LIMIT 1
  `;
  if (!rows[0]) {
    return null;
  }
  const evidenceRows = await db()`
    SELECT evidence_id
    FROM diagnosis_evidence
    WHERE workspace_id = ${workspaceId}::uuid
      AND diagnosis_id = ${diagnosisId}::uuid
  `;
  return mapDiagnosis(
    rows[0],
    evidenceRows.map((row) => String(row.evidence_id))
  );
}

export async function getDesign(
  workspaceId: string,
  designId: string
): Promise<DesignRecord | null> {
  const rows = await db()`
    SELECT id, workspace_id, goal_id, problem_id, diagnosis_id,
      machine_change, rationale, expected_result, success_signal,
      acceptance_state, lifecycle_state
    FROM designs
    WHERE workspace_id = ${workspaceId}::uuid
      AND id = ${designId}::uuid
    LIMIT 1
  `;
  return rows[0] ? mapDesign(rows[0]) : null;
}

export async function createDiagnosis(input: {
  alternativeHypotheses?: string | null;
  confidence?: number | null;
  contradictingEvidence?: string | null;
  evidenceIds: readonly string[];
  goalId: string;
  problemId: string;
  proximateCause?: string | null;
  rootCauseHypothesis: string;
  supportingEvidence?: string | null;
  symptom: string;
  uncertainty?: string | null;
  userId: string;
  workspaceId: string;
}): Promise<DiagnosisRecord> {
  return db().begin(async (transaction) => {
    const suggestion = await latestPendingSuggestion(transaction, {
      contextId: input.problemId,
      contextKey: "problemId",
      kind: "diagnosis_candidate",
      workspaceId: input.workspaceId,
    });
    const payload = suggestion.payload;
    const unchanged =
      payloadString(payload, "symptom") === input.symptom.trim() &&
      payloadString(payload, "proximateCause") === normalized(input.proximateCause) &&
      payloadString(payload, "rootCauseHypothesis") === input.rootCauseHypothesis.trim() &&
      payloadString(payload, "supportingEvidence") === normalized(input.supportingEvidence) &&
      payloadString(payload, "contradictingEvidence") === normalized(input.contradictingEvidence) &&
      payloadString(payload, "alternativeHypotheses") === normalized(input.alternativeHypotheses) &&
      payloadString(payload, "uncertainty") === normalized(input.uncertainty) &&
      payloadNumber(payload, "confidence") === (input.confidence ?? null);
    const acceptanceState: DiagnosisRecord["acceptanceState"] = unchanged
      ? "accepted"
      : "revised";

    const rows = await transaction`
      INSERT INTO diagnoses (
        workspace_id,
        created_by_user_id,
        goal_id,
        problem_id,
        origin_ai_suggestion_id,
        symptom,
        proximate_cause,
        root_cause_hypothesis,
        supporting_evidence,
        contradicting_evidence,
        alternative_hypotheses,
        uncertainty,
        confidence,
        acceptance_state
      ) VALUES (
        ${input.workspaceId}::uuid,
        ${input.userId}::uuid,
        ${input.goalId}::uuid,
        ${input.problemId}::uuid,
        ${String(suggestion.id)}::uuid,
        ${input.symptom.trim()},
        ${normalized(input.proximateCause) || null},
        ${input.rootCauseHypothesis.trim()},
        ${normalized(input.supportingEvidence) || null},
        ${normalized(input.contradictingEvidence) || null},
        ${normalized(input.alternativeHypotheses) || null},
        ${normalized(input.uncertainty) || null},
        ${input.confidence ?? null},
        ${acceptanceState}
      )
      RETURNING id, workspace_id, goal_id, problem_id, symptom, proximate_cause,
        root_cause_hypothesis, supporting_evidence, contradicting_evidence,
        alternative_hypotheses, uncertainty, confidence, acceptance_state
    `;
    const row = rows[0];
    if (!row) {
      throw new Error("Diagnosis was not created.");
    }
    const evidenceIds = [...new Set(input.evidenceIds)];
    for (const evidenceId of evidenceIds) {
      await transaction`
        INSERT INTO diagnosis_evidence (workspace_id, diagnosis_id, evidence_id)
        VALUES (${input.workspaceId}::uuid, ${String(row.id)}::uuid, ${evidenceId}::uuid)
      `;
    }
    await transaction`
      UPDATE ai_suggestions
      SET acceptance_state = ${acceptanceState}, reviewed_at = now(), updated_at = now()
      WHERE id = ${String(suggestion.id)}::uuid
        AND workspace_id = ${input.workspaceId}::uuid
    `;
    await insertActivity(transaction, {
      actorUserId: input.userId,
      eventType: acceptanceState === "accepted" ? "diagnosis.accepted" : "diagnosis.revised",
      subjectId: String(row.id),
      subjectType: "diagnosis",
      workspaceId: input.workspaceId,
    });
    return mapDiagnosis(row, evidenceIds);
  });
}

export async function createDesign(input: {
  actions: readonly string[];
  diagnosisId: string;
  expectedResult: string;
  goalId: string;
  machineChange: string;
  problemId: string;
  rationale: string;
  successSignal: string;
  userId: string;
  workspaceId: string;
}): Promise<{ actions: ExecutionActionRecord[]; design: DesignRecord }> {
  const actions = input.actions.map((item) => item.trim()).filter(Boolean);
  if (actions.length < 1 || actions.length > 5) {
    throw new Error("A Design needs between one and five Actions.");
  }

  return db().begin(async (transaction) => {
    const suggestion = await latestPendingSuggestion(transaction, {
      contextId: input.diagnosisId,
      contextKey: "diagnosisId",
      kind: "design_candidate",
      workspaceId: input.workspaceId,
    });
    const payload = suggestion.payload;
    const proposedActions = payloadStrings(payload, "actions");
    const unchanged =
      payloadString(payload, "machineChange") === input.machineChange.trim() &&
      payloadString(payload, "rationale") === input.rationale.trim() &&
      payloadString(payload, "expectedResult") === input.expectedResult.trim() &&
      payloadString(payload, "successSignal") === input.successSignal.trim() &&
      proposedActions.length === actions.length &&
      proposedActions.every((item, index) => item === actions[index]);
    const acceptanceState: DesignRecord["acceptanceState"] = unchanged
      ? "accepted"
      : "revised";

    const designRows = await transaction`
      INSERT INTO designs (
        workspace_id,
        created_by_user_id,
        goal_id,
        problem_id,
        diagnosis_id,
        origin_ai_suggestion_id,
        machine_change,
        rationale,
        expected_result,
        success_signal,
        acceptance_state
      ) VALUES (
        ${input.workspaceId}::uuid,
        ${input.userId}::uuid,
        ${input.goalId}::uuid,
        ${input.problemId}::uuid,
        ${input.diagnosisId}::uuid,
        ${String(suggestion.id)}::uuid,
        ${input.machineChange.trim()},
        ${input.rationale.trim()},
        ${input.expectedResult.trim()},
        ${input.successSignal.trim()},
        ${acceptanceState}
      )
      RETURNING id, workspace_id, goal_id, problem_id, diagnosis_id,
        machine_change, rationale, expected_result, success_signal,
        acceptance_state, lifecycle_state
    `;
    const designRow = designRows[0];
    if (!designRow) {
      throw new Error("Design was not created.");
    }
    const actionRows: Row[] = [];
    for (const [position, commitment] of actions.entries()) {
      const rows = await transaction`
        INSERT INTO execution_actions (workspace_id, design_id, position, commitment)
        VALUES (
          ${input.workspaceId}::uuid,
          ${String(designRow.id)}::uuid,
          ${position},
          ${commitment}
        )
        RETURNING id, workspace_id, design_id, position, commitment, status, completed_at
      `;
      if (!rows[0]) {
        throw new Error("Design Action was not created.");
      }
      actionRows.push(rows[0]);
    }
    await transaction`
      UPDATE ai_suggestions
      SET acceptance_state = ${acceptanceState}, reviewed_at = now(), updated_at = now()
      WHERE id = ${String(suggestion.id)}::uuid
        AND workspace_id = ${input.workspaceId}::uuid
    `;
    await insertActivity(transaction, {
      actorUserId: input.userId,
      eventType: acceptanceState === "accepted" ? "design.accepted" : "design.revised",
      subjectId: String(designRow.id),
      subjectType: "design",
      workspaceId: input.workspaceId,
    });
    return {
      actions: actionRows.map(mapAction),
      design: mapDesign(designRow),
    };
  });
}

export async function setActionStatus(input: {
  actionId: string;
  status: "cancelled" | "completed" | "pending";
  userId: string;
  workspaceId: string;
}): Promise<ExecutionActionRecord> {
  return db().begin(async (transaction) => {
    const completedAt = input.status === "completed" ? new Date() : null;
    const rows = await transaction`
      UPDATE execution_actions
      SET status = ${input.status},
          completed_at = ${completedAt},
          updated_at = now()
      WHERE id = ${input.actionId}::uuid
        AND workspace_id = ${input.workspaceId}::uuid
      RETURNING id, workspace_id, design_id, position, commitment, status, completed_at
    `;
    const row = rows[0];
    if (!row) {
      throw new Error("Action was not found.");
    }
    await insertActivity(transaction, {
      actorUserId: input.userId,
      eventType:
        input.status === "completed"
          ? "action.completed"
          : input.status === "cancelled"
            ? "action.cancelled"
            : "action.reopened",
      subjectId: String(row.id),
      subjectType: "action",
      workspaceId: input.workspaceId,
    });
    return mapAction(row);
  });
}

export async function createOutcome(input: {
  actualResult: string;
  comparison: OutcomeComparison;
  designId: string;
  userId: string;
  workspaceId: string;
}): Promise<OutcomeRecord> {
  return db().begin(async (transaction) => {
    const designRows = await transaction`
      SELECT id, workspace_id, goal_id, problem_id, diagnosis_id, expected_result, lifecycle_state
      FROM designs
      WHERE id = ${input.designId}::uuid
        AND workspace_id = ${input.workspaceId}::uuid
      LIMIT 1
      FOR UPDATE
    `;
    const design = designRows[0];
    if (!design) {
      throw new Error("Design was not found.");
    }
    if (String(design.lifecycle_state) !== "active") {
      throw new Error("Design has already been evaluated.");
    }
    const actionCounts = await transaction`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE status = 'pending')::int AS pending
      FROM execution_actions
      WHERE workspace_id = ${input.workspaceId}::uuid
        AND design_id = ${input.designId}::uuid
    `;
    const total = Number(actionCounts[0]?.total ?? 0);
    const pending = Number(actionCounts[0]?.pending ?? 0);
    if (total < 1) {
      throw new Error("Design has no executable Actions.");
    }
    if (pending > 0) {
      throw new Error("Complete or cancel remaining Actions before recording Outcome.");
    }

    const observedAt = new Date();
    const evidenceRows = await transaction`
      INSERT INTO evidence_records (
        workspace_id,
        created_by_user_id,
        source_type,
        provider,
        title,
        content,
        observed_at
      ) VALUES (
        ${input.workspaceId}::uuid,
        ${input.userId}::uuid,
        'user_statement',
        'user',
        'Design outcome',
        ${input.actualResult.trim()},
        ${observedAt}
      )
      RETURNING id
    `;
    const evidenceId = String(evidenceRows[0]?.id);
    const observationRows = await transaction`
      INSERT INTO observations (
        workspace_id,
        created_by_user_id,
        goal_id,
        statement,
        acceptance_state
      ) VALUES (
        ${input.workspaceId}::uuid,
        ${input.userId}::uuid,
        ${String(design.goal_id)}::uuid,
        ${input.actualResult.trim()},
        'accepted'
      )
      RETURNING id
    `;
    const observationId = String(observationRows[0]?.id);
    await transaction`
      INSERT INTO observation_evidence (workspace_id, observation_id, evidence_id)
      VALUES (
        ${input.workspaceId}::uuid,
        ${observationId}::uuid,
        ${evidenceId}::uuid
      )
    `;
    const outcomeRows = await transaction`
      INSERT INTO outcomes (
        workspace_id,
        created_by_user_id,
        goal_id,
        problem_id,
        diagnosis_id,
        design_id,
        evidence_id,
        observation_id,
        expected_result,
        actual_result,
        comparison,
        observed_at
      ) VALUES (
        ${input.workspaceId}::uuid,
        ${input.userId}::uuid,
        ${String(design.goal_id)}::uuid,
        ${String(design.problem_id)}::uuid,
        ${String(design.diagnosis_id)}::uuid,
        ${input.designId}::uuid,
        ${evidenceId}::uuid,
        ${observationId}::uuid,
        ${String(design.expected_result)},
        ${input.actualResult.trim()},
        ${input.comparison},
        ${observedAt}
      )
      RETURNING id, workspace_id, goal_id, problem_id, diagnosis_id, design_id,
        evidence_id, observation_id, expected_result, actual_result, comparison, observed_at
    `;
    const outcomeRow = outcomeRows[0];
    if (!outcomeRow) {
      throw new Error("Outcome was not created.");
    }
    await transaction`
      UPDATE designs
      SET lifecycle_state = 'evaluated', updated_at = now()
      WHERE id = ${input.designId}::uuid
        AND workspace_id = ${input.workspaceId}::uuid
    `;
    await insertActivity(transaction, {
      actorUserId: input.userId,
      eventType: "outcome.recorded",
      subjectId: String(outcomeRow.id),
      subjectType: "outcome",
      workspaceId: input.workspaceId,
    });
    return mapOutcome(outcomeRow);
  });
}

export async function createOutcomeReview(input: {
  learning: string;
  outcomeId: string;
  surprise?: string | null;
  userId: string;
  workspaceId: string;
}): Promise<OutcomeReviewRecord> {
  return db().begin(async (transaction) => {
    const outcomeRows = await transaction`
      SELECT id, goal_id, problem_id, expected_result, actual_result
      FROM outcomes
      WHERE workspace_id = ${input.workspaceId}::uuid
        AND id = ${input.outcomeId}::uuid
      LIMIT 1
      FOR UPDATE
    `;
    const outcome = outcomeRows[0];
    if (!outcome) {
      throw new Error("Outcome was not found.");
    }
    const reflectionRows = await transaction`
      INSERT INTO reflections (
        workspace_id,
        created_by_user_id,
        goal_id,
        problem_id,
        happened,
        expected,
        surprise,
        recurring,
        learning,
        status
      ) VALUES (
        ${input.workspaceId}::uuid,
        ${input.userId}::uuid,
        ${String(outcome.goal_id)}::uuid,
        ${String(outcome.problem_id)}::uuid,
        ${String(outcome.actual_result)},
        ${String(outcome.expected_result)},
        ${normalized(input.surprise) || null},
        false,
        ${input.learning.trim()},
        'completed'
      )
      RETURNING id, goal_id, problem_id, happened, expected, surprise, learning
    `;
    const reflection = reflectionRows[0];
    if (!reflection) {
      throw new Error("Outcome Review was not created.");
    }
    await transaction`
      INSERT INTO outcome_reflections (
        workspace_id,
        reflection_id,
        outcome_id,
        goal_id,
        problem_id
      ) VALUES (
        ${input.workspaceId}::uuid,
        ${String(reflection.id)}::uuid,
        ${input.outcomeId}::uuid,
        ${String(outcome.goal_id)}::uuid,
        ${String(outcome.problem_id)}::uuid
      )
    `;
    await insertActivity(transaction, {
      actorUserId: input.userId,
      eventType: "reflection.completed",
      subjectId: String(reflection.id),
      subjectType: "reflection",
      workspaceId: input.workspaceId,
    });
    await insertActivity(transaction, {
      actorUserId: input.userId,
      eventType: "outcome.reviewed",
      subjectId: input.outcomeId,
      subjectType: "outcome",
      workspaceId: input.workspaceId,
    });
    return {
      expected: String(reflection.expected),
      goalId: String(reflection.goal_id),
      happened: String(reflection.happened),
      id: String(reflection.id),
      learning: String(reflection.learning),
      outcomeId: input.outcomeId,
      problemId: String(reflection.problem_id),
      surprise: nullableString(reflection.surprise),
    };
  });
}

export async function loadExecutionState(workspaceId: string): Promise<ExecutionState> {
  const [diagnosisRows, diagnosisEvidenceRows, designRows, actionRows, outcomeRows, reviewRows] =
    await Promise.all([
      db()`
        SELECT id, workspace_id, goal_id, problem_id, symptom, proximate_cause,
          root_cause_hypothesis, supporting_evidence, contradicting_evidence,
          alternative_hypotheses, uncertainty, confidence, acceptance_state
        FROM diagnoses
        WHERE workspace_id = ${workspaceId}::uuid
        ORDER BY created_at DESC
      `,
      db()`
        SELECT diagnosis_id, evidence_id
        FROM diagnosis_evidence
        WHERE workspace_id = ${workspaceId}::uuid
      `,
      db()`
        SELECT id, workspace_id, goal_id, problem_id, diagnosis_id,
          machine_change, rationale, expected_result, success_signal,
          acceptance_state, lifecycle_state
        FROM designs
        WHERE workspace_id = ${workspaceId}::uuid
        ORDER BY created_at DESC
      `,
      db()`
        SELECT id, workspace_id, design_id, position, commitment, status, completed_at
        FROM execution_actions
        WHERE workspace_id = ${workspaceId}::uuid
        ORDER BY design_id, position
      `,
      db()`
        SELECT id, workspace_id, goal_id, problem_id, diagnosis_id, design_id,
          evidence_id, observation_id, expected_result, actual_result, comparison, observed_at
        FROM outcomes
        WHERE workspace_id = ${workspaceId}::uuid
        ORDER BY observed_at DESC
      `,
      db()`
        SELECT r.id, r.goal_id, r.problem_id, r.happened, r.expected, r.surprise,
          r.learning, link.outcome_id
        FROM outcome_reflections link
        JOIN reflections r
          ON r.id = link.reflection_id
         AND r.workspace_id = link.workspace_id
        WHERE link.workspace_id = ${workspaceId}::uuid
        ORDER BY r.created_at DESC
      `,
    ]);

  const evidenceByDiagnosis = new Map<string, string[]>();
  for (const row of diagnosisEvidenceRows) {
    const key = String(row.diagnosis_id);
    evidenceByDiagnosis.set(key, [
      ...(evidenceByDiagnosis.get(key) ?? []),
      String(row.evidence_id),
    ]);
  }

  return {
    actions: actionRows.map(mapAction),
    designs: designRows.map(mapDesign),
    diagnoses: diagnosisRows.map((row) =>
      mapDiagnosis(row, evidenceByDiagnosis.get(String(row.id)) ?? [])
    ),
    outcomeReviews: reviewRows.map((row) => ({
      expected: String(row.expected),
      goalId: String(row.goal_id),
      happened: String(row.happened),
      id: String(row.id),
      learning: String(row.learning),
      outcomeId: String(row.outcome_id),
      problemId: String(row.problem_id),
      surprise: nullableString(row.surprise),
    })),
    outcomes: outcomeRows.map(mapOutcome),
  };
}
