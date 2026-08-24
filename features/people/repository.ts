import type postgres from "postgres";
import { db } from "@/lib/db/client";
import type {
  GoalDraft,
  GoalRecord,
  PeopleState,
  PrincipleRecord,
  ProblemRecord,
  RealityRecord,
  ReflectionRecord,
} from "./contracts";

type Row = Record<string, unknown>;
type Transaction = postgres.TransactionSql;

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function mapGoal(row: Row): GoalRecord {
  return {
    acceptedTradeoffs: nullableString(row.accepted_tradeoffs) ?? "",
    desiredState: String(row.desired_state),
    id: String(row.id),
    measures: nullableString(row.measures) ?? "",
    nonNegotiables: nullableString(row.non_negotiables) ?? "",
    status: String(row.status) as GoalRecord["status"],
    successConditions: nullableString(row.success_conditions) ?? "",
    whyItMatters: nullableString(row.why_it_matters) ?? "",
    workspaceId: String(row.workspace_id),
  };
}

function mapReflection(row: Row): ReflectionRecord {
  return {
    expected: nullableString(row.expected),
    goalId: nullableString(row.goal_id),
    happened: String(row.happened),
    id: String(row.id),
    learning: nullableString(row.learning),
    problemId: nullableString(row.problem_id),
    recurrenceNote: nullableString(row.recurrence_note),
    recurring:
      typeof row.recurring === "boolean"
        ? row.recurring
        : row.recurring === null || row.recurring === undefined
          ? null
          : Boolean(row.recurring),
    status: String(row.status) as ReflectionRecord["status"],
    surprise: nullableString(row.surprise),
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

export async function commitGoal(input: {
  draft: GoalDraft;
  userId: string;
  workspaceId: string;
}): Promise<GoalRecord> {
  return db().begin(async (transaction) => {
    const rows = await transaction`
      INSERT INTO goals (
        workspace_id,
        created_by_user_id,
        desired_state,
        why_it_matters,
        accepted_tradeoffs,
        non_negotiables,
        success_conditions,
        measures,
        status
      ) VALUES (
        ${input.workspaceId}::uuid,
        ${input.userId}::uuid,
        ${input.draft.desiredState.trim()},
        ${input.draft.whyItMatters.trim() || null},
        ${input.draft.acceptedTradeoffs.trim() || null},
        ${input.draft.nonNegotiables.trim() || null},
        ${input.draft.successConditions.trim() || null},
        ${input.draft.measures.trim() || null},
        'chosen'
      )
      RETURNING id, workspace_id, desired_state, why_it_matters,
        accepted_tradeoffs, non_negotiables, success_conditions, measures, status
    `;
    const row = rows[0];
    if (!row) {
      throw new Error("Goal was not created.");
    }
    const goal = mapGoal(row);
    await insertActivity(transaction, {
      actorUserId: input.userId,
      eventType: "goal.chosen",
      subjectId: goal.id,
      subjectType: "goal",
      workspaceId: input.workspaceId,
    });
    return goal;
  });
}

export async function createRealityObservation(input: {
  goalId: string;
  statement: string;
  userId: string;
  workspaceId: string;
}): Promise<RealityRecord> {
  return db().begin(async (transaction) => {
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
        'Direct observation',
        ${input.statement.trim()},
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
        ${input.goalId}::uuid,
        ${input.statement.trim()},
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
    await insertActivity(transaction, {
      actorUserId: input.userId,
      eventType: "reality.observed",
      subjectId: observationId,
      subjectType: "observation",
      workspaceId: input.workspaceId,
    });
    return {
      evidenceId,
      goalId: input.goalId,
      observedAt: observedAt.toISOString(),
      observationId,
      statement: input.statement.trim(),
    };
  });
}

async function verifiedSuggestion(
  transaction: Transaction,
  workspaceId: string,
  suggestionId: string,
  kind: string
): Promise<Row> {
  const rows = await transaction`
    SELECT id, payload, acceptance_state
    FROM ai_suggestions
    WHERE id = ${suggestionId}::uuid
      AND workspace_id = ${workspaceId}::uuid
      AND kind = ${kind}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    throw new Error("Suggestion does not belong to this workspace.");
  }
  return row;
}

function stringPayload(payload: unknown, key: string): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function createProblem(input: {
  evidenceIds: readonly string[];
  gap?: string | null;
  goalId: string;
  statement: string;
  suggestionId?: string | null;
  userId: string;
  workspaceId: string;
}): Promise<ProblemRecord> {
  return db().begin(async (transaction) => {
    let suggestionState: "accepted" | "revised" | null = null;
    if (input.suggestionId) {
      const suggestion = await verifiedSuggestion(
        transaction,
        input.workspaceId,
        input.suggestionId,
        "problem_candidate"
      );
      const proposalStatement = stringPayload(suggestion.payload, "statement");
      const proposalGap = stringPayload(suggestion.payload, "gap");
      suggestionState =
        proposalStatement === input.statement.trim() &&
        proposalGap === (input.gap?.trim() || "")
          ? "accepted"
          : "revised";
    }

    const rows = await transaction`
      INSERT INTO problems (
        workspace_id,
        created_by_user_id,
        goal_id,
        origin_ai_suggestion_id,
        statement,
        gap
      ) VALUES (
        ${input.workspaceId}::uuid,
        ${input.userId}::uuid,
        ${input.goalId}::uuid,
        ${input.suggestionId ?? null}::uuid,
        ${input.statement.trim()},
        ${input.gap?.trim() || null}
      )
      RETURNING id, goal_id, statement, gap, status
    `;
    const row = rows[0];
    if (!row) {
      throw new Error("Problem was not created.");
    }
    const problemId = String(row.id);
    for (const evidenceId of [...new Set(input.evidenceIds)]) {
      await transaction`
        INSERT INTO problem_evidence (workspace_id, problem_id, evidence_id)
        VALUES (
          ${input.workspaceId}::uuid,
          ${problemId}::uuid,
          ${evidenceId}::uuid
        )
      `;
    }
    if (input.suggestionId && suggestionState) {
      await transaction`
        UPDATE ai_suggestions
        SET acceptance_state = ${suggestionState}, reviewed_at = now(), updated_at = now()
        WHERE id = ${input.suggestionId}::uuid
          AND workspace_id = ${input.workspaceId}::uuid
      `;
    }
    await insertActivity(transaction, {
      actorUserId: input.userId,
      eventType: "problem.recognized",
      subjectId: problemId,
      subjectType: "problem",
      workspaceId: input.workspaceId,
    });
    return {
      evidenceIds: [...new Set(input.evidenceIds)],
      gap: nullableString(row.gap),
      goalId: String(row.goal_id),
      id: problemId,
      statement: String(row.statement),
      status: String(row.status) as ProblemRecord["status"],
    };
  });
}

export async function createReflection(input: {
  expected?: string | null;
  goalId: string;
  happened: string;
  learning?: string | null;
  problemId: string;
  recurrenceNote?: string | null;
  recurring: boolean;
  surprise?: string | null;
  userId: string;
  workspaceId: string;
}): Promise<ReflectionRecord> {
  return db().begin(async (transaction) => {
    const rows = await transaction`
      INSERT INTO reflections (
        workspace_id,
        created_by_user_id,
        goal_id,
        problem_id,
        happened,
        expected,
        surprise,
        recurring,
        recurrence_note,
        learning,
        status
      ) VALUES (
        ${input.workspaceId}::uuid,
        ${input.userId}::uuid,
        ${input.goalId}::uuid,
        ${input.problemId}::uuid,
        ${input.happened.trim()},
        ${input.expected?.trim() || null},
        ${input.surprise?.trim() || null},
        ${input.recurring},
        ${input.recurrenceNote?.trim() || null},
        ${input.learning?.trim() || null},
        'completed'
      )
      RETURNING id, goal_id, problem_id, happened, expected, surprise,
        recurring, recurrence_note, learning, status
    `;
    const row = rows[0];
    if (!row) {
      throw new Error("Reflection was not created.");
    }
    const reflection = mapReflection(row);
    await insertActivity(transaction, {
      actorUserId: input.userId,
      eventType: "reflection.completed",
      subjectId: reflection.id,
      subjectType: "reflection",
      workspaceId: input.workspaceId,
    });
    return reflection;
  });
}

export async function createPrincipleCandidate(input: {
  confidence?: number | null;
  evidenceIds: readonly string[];
  rationale?: string | null;
  reflectionId: string;
  rule: string;
  suggestionId: string;
  trigger: string;
  userId: string;
  workspaceId: string;
}): Promise<PrincipleRecord> {
  return db().begin(async (transaction) => {
    await verifiedSuggestion(
      transaction,
      input.workspaceId,
      input.suggestionId,
      "principle_candidate"
    );
    const rows = await transaction`
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
        ${input.suggestionId}::uuid,
        ${input.trigger.trim()},
        ${input.rule.trim()},
        ${input.rationale?.trim() || null},
        ${input.confidence ?? null},
        'candidate',
        'pending'
      )
      RETURNING id, origin_reflection_id, trigger, rule, rationale,
        confidence, lifecycle_state, acceptance_state
    `;
    const row = rows[0];
    if (!row) {
      throw new Error("Principle candidate was not created.");
    }
    const principleId = String(row.id);
    const evidenceIds = [...new Set(input.evidenceIds)];
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
    await insertActivity(transaction, {
      actorUserId: input.userId,
      eventType: "principle.candidate_created",
      subjectId: principleId,
      subjectType: "principle",
      workspaceId: input.workspaceId,
    });
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

export async function reviewPrinciple(input: {
  action: "accept" | "reject" | "revise";
  principleId: string;
  rationale?: string | null;
  rule?: string | null;
  trigger?: string | null;
  userId: string;
  workspaceId: string;
}): Promise<PrincipleRecord> {
  return db().begin(async (transaction) => {
    const existingRows = await transaction`
      SELECT id, trigger, rule, rationale
      FROM principles
      WHERE id = ${input.principleId}::uuid
        AND workspace_id = ${input.workspaceId}::uuid
      LIMIT 1
    `;
    const existing = existingRows[0];
    if (!existing) {
      throw new Error("Principle candidate was not found.");
    }

    const trigger = input.trigger?.trim() || String(existing.trigger);
    const rule = input.rule?.trim() || String(existing.rule);
    const rationale =
      input.rationale === undefined
        ? nullableString(existing.rationale)
        : input.rationale?.trim() || null;
    const acceptanceState =
      input.action === "accept"
        ? "accepted"
        : input.action === "reject"
          ? "rejected"
          : "revised";
    const lifecycleState =
      input.action === "accept"
        ? "testing"
        : input.action === "revise"
          ? "revised"
          : "candidate";

    const rows = await transaction`
      UPDATE principles
      SET trigger = ${trigger},
          rule = ${rule},
          rationale = ${rationale},
          acceptance_state = ${acceptanceState},
          lifecycle_state = ${lifecycleState},
          updated_at = now()
      WHERE id = ${input.principleId}::uuid
        AND workspace_id = ${input.workspaceId}::uuid
      RETURNING id, origin_reflection_id, trigger, rule, rationale,
        confidence, lifecycle_state, acceptance_state
    `;
    const row = rows[0];
    if (!row) {
      throw new Error("Principle candidate was not updated.");
    }
    await transaction`
      UPDATE ai_suggestions
      SET acceptance_state = ${acceptanceState}, reviewed_at = now(), updated_at = now()
      WHERE id = (
        SELECT origin_ai_suggestion_id
        FROM principles
        WHERE id = ${input.principleId}::uuid
          AND workspace_id = ${input.workspaceId}::uuid
      )
        AND workspace_id = ${input.workspaceId}::uuid
    `;
    await insertActivity(transaction, {
      actorUserId: input.userId,
      eventType: `principle.${acceptanceState}`,
      subjectId: input.principleId,
      subjectType: "principle",
      workspaceId: input.workspaceId,
    });
    const evidenceRows = await transaction`
      SELECT evidence_id
      FROM principle_evidence
      WHERE principle_id = ${input.principleId}::uuid
        AND workspace_id = ${input.workspaceId}::uuid
      ORDER BY evidence_id
    `;
    return {
      acceptanceState: String(row.acceptance_state) as PrincipleRecord["acceptanceState"],
      confidence:
        row.confidence === null || row.confidence === undefined
          ? null
          : Number(row.confidence),
      evidenceIds: evidenceRows.map((item) => String(item.evidence_id)),
      id: String(row.id),
      lifecycleState: String(row.lifecycle_state) as PrincipleRecord["lifecycleState"],
      originReflectionId: nullableString(row.origin_reflection_id),
      rationale: nullableString(row.rationale),
      rule: String(row.rule),
      trigger: String(row.trigger),
    };
  });
}

export async function getGoal(
  workspaceId: string,
  goalId: string
): Promise<GoalRecord | null> {
  const rows = await db()`
    SELECT id, workspace_id, desired_state, why_it_matters, status,
      accepted_tradeoffs, non_negotiables, success_conditions, measures
    FROM goals
    WHERE id = ${goalId}::uuid AND workspace_id = ${workspaceId}::uuid
    LIMIT 1
  `;
  return rows[0] ? mapGoal(rows[0]) : null;
}

export async function getReality(
  workspaceId: string,
  observationId: string
): Promise<RealityRecord | null> {
  const rows = await db()`
    SELECT o.id AS observation_id, o.goal_id, o.statement, e.id AS evidence_id,
      COALESCE(e.observed_at, e.created_at) AS observed_at
    FROM observations o
    JOIN observation_evidence oe
      ON oe.observation_id = o.id AND oe.workspace_id = o.workspace_id
    JOIN evidence_records e
      ON e.id = oe.evidence_id AND e.workspace_id = oe.workspace_id
    WHERE o.id = ${observationId}::uuid
      AND o.workspace_id = ${workspaceId}::uuid
      AND o.goal_id IS NOT NULL
      AND o.acceptance_state = 'accepted'
    ORDER BY e.created_at DESC
    LIMIT 1
  `;
  const row = rows[0];
  return row
    ? {
        evidenceId: String(row.evidence_id),
        goalId: String(row.goal_id),
        observedAt: new Date(String(row.observed_at)).toISOString(),
        observationId: String(row.observation_id),
        statement: String(row.statement),
      }
    : null;
}

export async function getProblem(
  workspaceId: string,
  problemId: string
): Promise<ProblemRecord | null> {
  const rows = await db()`
    SELECT id, goal_id, statement, gap, status
    FROM problems
    WHERE id = ${problemId}::uuid AND workspace_id = ${workspaceId}::uuid
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    return null;
  }
  const evidenceRows = await db()`
    SELECT evidence_id FROM problem_evidence
    WHERE problem_id = ${problemId}::uuid AND workspace_id = ${workspaceId}::uuid
    ORDER BY evidence_id
  `;
  return {
    evidenceIds: evidenceRows.map((item) => String(item.evidence_id)),
    gap: nullableString(row.gap),
    goalId: String(row.goal_id),
    id: String(row.id),
    statement: String(row.statement),
    status: String(row.status) as ProblemRecord["status"],
  };
}

export async function getReflection(
  workspaceId: string,
  reflectionId: string
): Promise<ReflectionRecord | null> {
  const rows = await db()`
    SELECT id, goal_id, problem_id, happened, expected, surprise,
      recurring, recurrence_note, learning, status
    FROM reflections
    WHERE id = ${reflectionId}::uuid AND workspace_id = ${workspaceId}::uuid
    LIMIT 1
  `;
  return rows[0] ? mapReflection(rows[0]) : null;
}

export async function loadPeopleState(workspaceId: string): Promise<PeopleState> {
  const [goalRows, realityRows, problemRows, problemEvidenceRows, reflectionRows, principleRows, principleEvidenceRows] =
    await Promise.all([
      db()`
        SELECT id, workspace_id, desired_state, why_it_matters, status,
          accepted_tradeoffs, non_negotiables, success_conditions, measures
        FROM goals
        WHERE workspace_id = ${workspaceId}::uuid
        ORDER BY created_at DESC
      `,
      db()`
        SELECT o.id AS observation_id, o.goal_id, o.statement, e.id AS evidence_id,
          COALESCE(e.observed_at, e.created_at) AS observed_at
        FROM observations o
        JOIN observation_evidence oe
          ON oe.observation_id = o.id AND oe.workspace_id = o.workspace_id
        JOIN evidence_records e
          ON e.id = oe.evidence_id AND e.workspace_id = oe.workspace_id
        WHERE o.workspace_id = ${workspaceId}::uuid
          AND o.goal_id IS NOT NULL
          AND o.acceptance_state = 'accepted'
          AND e.source_type = 'user_statement'
        ORDER BY o.created_at DESC
      `,
      db()`
        SELECT id, goal_id, statement, gap, status
        FROM problems
        WHERE workspace_id = ${workspaceId}::uuid
        ORDER BY created_at DESC
      `,
      db()`
        SELECT problem_id, evidence_id
        FROM problem_evidence
        WHERE workspace_id = ${workspaceId}::uuid
      `,
      db()`
        SELECT id, goal_id, problem_id, happened, expected, surprise,
          recurring, recurrence_note, learning, status
        FROM reflections
        WHERE workspace_id = ${workspaceId}::uuid
        ORDER BY created_at DESC
      `,
      db()`
        SELECT id, origin_reflection_id, trigger, rule, rationale,
          confidence, lifecycle_state, acceptance_state
        FROM principles
        WHERE workspace_id = ${workspaceId}::uuid
        ORDER BY created_at DESC
      `,
      db()`
        SELECT principle_id, evidence_id
        FROM principle_evidence
        WHERE workspace_id = ${workspaceId}::uuid
      `,
    ]);

  const problemEvidence = new Map<string, string[]>();
  for (const row of problemEvidenceRows) {
    const key = String(row.problem_id);
    problemEvidence.set(key, [
      ...(problemEvidence.get(key) ?? []),
      String(row.evidence_id),
    ]);
  }
  const principleEvidence = new Map<string, string[]>();
  for (const row of principleEvidenceRows) {
    const key = String(row.principle_id);
    principleEvidence.set(key, [
      ...(principleEvidence.get(key) ?? []),
      String(row.evidence_id),
    ]);
  }

  return {
    goals: goalRows.map(mapGoal),
    principles: principleRows.map((row) => ({
      acceptanceState: String(row.acceptance_state) as PrincipleRecord["acceptanceState"],
      confidence:
        row.confidence === null || row.confidence === undefined
          ? null
          : Number(row.confidence),
      evidenceIds: principleEvidence.get(String(row.id)) ?? [],
      id: String(row.id),
      lifecycleState: String(row.lifecycle_state) as PrincipleRecord["lifecycleState"],
      originReflectionId: nullableString(row.origin_reflection_id),
      rationale: nullableString(row.rationale),
      rule: String(row.rule),
      trigger: String(row.trigger),
    })),
    problems: problemRows.map((row) => ({
      evidenceIds: problemEvidence.get(String(row.id)) ?? [],
      gap: nullableString(row.gap),
      goalId: String(row.goal_id),
      id: String(row.id),
      statement: String(row.statement),
      status: String(row.status) as ProblemRecord["status"],
    })),
    reality: realityRows.map((row) => ({
      evidenceId: String(row.evidence_id),
      goalId: String(row.goal_id),
      observedAt: new Date(String(row.observed_at)).toISOString(),
      observationId: String(row.observation_id),
      statement: String(row.statement),
    })),
    reflections: reflectionRows.map(mapReflection),
  };
}
