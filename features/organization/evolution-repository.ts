import { db } from "@/lib/db/client";
import type { OrganizationMembershipRole } from "./contracts";
import type {
  ClientOrganizationEvolutionAction,
  ClientOrganizationEvolutionContextEvidence,
  ClientOrganizationEvolutionDesign,
  ClientOrganizationEvolutionDiagnosis,
  ClientOrganizationEvolutionDisagreement,
  ClientOrganizationEvolutionGoal,
  ClientOrganizationEvolutionMember,
  ClientOrganizationEvolutionOutcome,
  ClientOrganizationEvolutionPrinciple,
  ClientOrganizationEvolutionProblem,
  ClientOrganizationEvolutionReflection,
  ClientOrganizationEvolutionState,
  OrganizationActionStatus,
  OrganizationOutcomeComparison,
} from "./evolution-contracts";
import {
  OrganizationConflictError,
  OrganizationForbiddenError,
  OrganizationMemberNotFoundError,
  OrganizationNotFoundError,
} from "./repository";

interface EvolutionAccess {
  readonly handle: string;
  readonly membershipRole: OrganizationMembershipRole;
  readonly name: string;
  readonly workspaceId: string;
}

function nullable(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

async function evolutionAccess(
  userId: string,
  handle: string,
  ownerRequired = false
): Promise<EvolutionAccess> {
  const rows = await db()`
    SELECT
      profile.handle,
      workspace.id AS workspace_id,
      workspace.name,
      membership.role AS membership_role
    FROM organization_profiles profile
    JOIN workspaces workspace
      ON workspace.id = profile.workspace_id
      AND workspace.kind = 'organization'
    JOIN workspace_memberships membership
      ON membership.workspace_id = workspace.id
      AND membership.user_id = ${userId}::uuid
    WHERE profile.handle = ${handle}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    throw new OrganizationNotFoundError();
  }
  const membershipRole = String(row.membership_role) as OrganizationMembershipRole;
  if (ownerRequired && membershipRole !== "owner") {
    throw new OrganizationForbiddenError();
  }
  return {
    handle: String(row.handle),
    membershipRole,
    name: String(row.name),
    workspaceId: String(row.workspace_id),
  };
}

async function memberUserId(workspaceId: string, email: string): Promise<string> {
  const rows = await db()`
    SELECT users.id
    FROM users
    JOIN workspace_memberships membership
      ON membership.user_id = users.id
      AND membership.workspace_id = ${workspaceId}::uuid
    WHERE lower(users.email) = lower(${email.trim()})
      AND users.status = 'active'
    LIMIT 1
  `;
  if (!rows[0]?.id) {
    throw new OrganizationMemberNotFoundError();
  }
  return String(rows[0].id);
}

async function assertOrganizationProblem(workspaceId: string, problemId: string): Promise<void> {
  const rows = await db()`
    SELECT link.problem_id
    FROM organization_issue_kernel_links link
    WHERE link.workspace_id = ${workspaceId}::uuid
      AND link.problem_id = ${problemId}::uuid
    LIMIT 1
  `;
  if (!rows[0]?.problem_id) {
    throw new OrganizationNotFoundError();
  }
}

async function designExecutionAccess(input: {
  designId: string;
  handle: string;
  userId: string;
}): Promise<{ access: EvolutionAccess; assignedUserId: string }> {
  const access = await evolutionAccess(input.userId, input.handle);
  const rows = await db()`
    SELECT assignment.user_id
    FROM organization_design_assignments assignment
    WHERE assignment.workspace_id = ${access.workspaceId}::uuid
      AND assignment.design_id = ${input.designId}::uuid
    LIMIT 1
  `;
  if (!rows[0]?.user_id) {
    throw new OrganizationNotFoundError();
  }
  const assignedUserId = String(rows[0].user_id);
  if (access.membershipRole !== "owner" && assignedUserId !== input.userId) {
    throw new OrganizationForbiddenError();
  }
  return { access, assignedUserId };
}

export async function loadOrganizationEvolutionState(
  userId: string,
  handle: string
): Promise<ClientOrganizationEvolutionState> {
  const access = await evolutionAccess(userId, handle);
  const sql = db();
  const [
    memberRows,
    contextRows,
    goalRows,
    problemRows,
    disagreementRows,
    diagnosisRows,
    designRows,
    actionRows,
    outcomeRows,
    reflectionRows,
    principleRows,
  ] = await Promise.all([
    sql`
      SELECT users.email, membership.role
      FROM workspace_memberships membership
      JOIN users ON users.id = membership.user_id
      WHERE membership.workspace_id = ${access.workspaceId}::uuid
      ORDER BY CASE WHEN membership.role = 'owner' THEN 0 ELSE 1 END, users.email_normalized
    `,
    sql`
      SELECT
        context.context,
        context.observation,
        context.evidence_for,
        context.evidence_against,
        subject.email AS subject_email,
        creator.email AS created_by_email
      FROM organization_context_evidence context
      JOIN users subject ON subject.id = context.subject_user_id
      JOIN users creator ON creator.id = context.created_by_user_id
      WHERE context.workspace_id = ${access.workspaceId}::uuid
      ORDER BY context.created_at DESC
    `,
    sql`
      SELECT
        id,
        desired_state,
        why_it_matters,
        status,
        accepted_tradeoffs,
        non_negotiables,
        success_conditions,
        measures
      FROM goals
      WHERE workspace_id = ${access.workspaceId}::uuid
      ORDER BY created_at ASC
    `,
    sql`
      SELECT
        problem.id,
        problem.goal_id,
        problem.statement,
        problem.gap,
        problem.status,
        issue.id AS issue_id,
        issue.observed_reality,
        creator.email AS created_by_email
      FROM organization_issue_kernel_links link
      JOIN problems problem
        ON problem.id = link.problem_id
        AND problem.workspace_id = link.workspace_id
      JOIN organization_issues issue
        ON issue.id = link.issue_id
        AND issue.workspace_id = link.workspace_id
      JOIN users creator ON creator.id = issue.created_by_user_id
      WHERE link.workspace_id = ${access.workspaceId}::uuid
      ORDER BY issue.created_at ASC
    `,
    sql`
      SELECT
        disagreement.issue_id,
        disagreement.statement,
        disagreement.reasoning,
        disagreement.status,
        raiser.email AS raised_by_email
      FROM organization_disagreements disagreement
      JOIN users raiser ON raiser.id = disagreement.raised_by_user_id
      WHERE disagreement.workspace_id = ${access.workspaceId}::uuid
      ORDER BY disagreement.created_at ASC
    `,
    sql`
      SELECT
        id,
        problem_id,
        symptom,
        proximate_cause,
        root_cause_hypothesis,
        supporting_evidence,
        contradicting_evidence,
        alternative_hypotheses,
        uncertainty,
        created_at
      FROM diagnoses
      WHERE workspace_id = ${access.workspaceId}::uuid
      ORDER BY created_at DESC
    `,
    sql`
      SELECT
        design.id,
        design.problem_id,
        design.diagnosis_id,
        design.machine_change,
        design.rationale,
        design.expected_result,
        design.success_signal,
        design.acceptance_state,
        owner.email AS owner_email,
        design.created_at
      FROM designs design
      JOIN organization_design_assignments assignment
        ON assignment.workspace_id = design.workspace_id
        AND assignment.design_id = design.id
      JOIN users owner ON owner.id = assignment.user_id
      WHERE design.workspace_id = ${access.workspaceId}::uuid
      ORDER BY design.created_at DESC
    `,
    sql`
      SELECT id, design_id, position, commitment, status
      FROM execution_actions
      WHERE workspace_id = ${access.workspaceId}::uuid
      ORDER BY design_id, position ASC
    `,
    sql`
      SELECT id, design_id, expected_result, actual_result, comparison, observed_at
      FROM outcomes
      WHERE workspace_id = ${access.workspaceId}::uuid
      ORDER BY observed_at DESC
    `,
    sql`
      SELECT
        reflection.id,
        outcome.design_id,
        reflection.happened,
        reflection.expected,
        reflection.surprise,
        reflection.learning,
        reflection.recurring
      FROM outcome_reflections link
      JOIN reflections reflection
        ON reflection.id = link.reflection_id
        AND reflection.workspace_id = link.workspace_id
      JOIN outcomes outcome
        ON outcome.id = link.outcome_id
        AND outcome.workspace_id = link.workspace_id
      WHERE link.workspace_id = ${access.workspaceId}::uuid
    `,
    sql`
      SELECT id, trigger, rule, rationale, lifecycle_state, acceptance_state
      FROM principles
      WHERE workspace_id = ${access.workspaceId}::uuid
        AND acceptance_state IN ('accepted', 'revised')
      ORDER BY updated_at DESC, created_at DESC
    `,
  ]);

  const members: ClientOrganizationEvolutionMember[] = memberRows.map((row) => ({
    email: String(row.email),
    membershipRole: String(row.role) as OrganizationMembershipRole,
  }));
  const contextEvidence: ClientOrganizationEvolutionContextEvidence[] = contextRows.map((row) => ({
    context: String(row.context),
    createdByEmail: String(row.created_by_email),
    evidenceAgainst: nullable(row.evidence_against),
    evidenceFor: nullable(row.evidence_for),
    observation: String(row.observation),
    subjectEmail: String(row.subject_email),
  }));

  const disagreementsByIssue = new Map<string, ClientOrganizationEvolutionDisagreement[]>();
  for (const row of disagreementRows) {
    const issueId = String(row.issue_id);
    const items = disagreementsByIssue.get(issueId) ?? [];
    items.push({
      raisedByEmail: String(row.raised_by_email),
      reasoning: nullable(row.reasoning),
      statement: String(row.statement),
      status: String(row.status) as "open" | "resolved",
    });
    disagreementsByIssue.set(issueId, items);
  }

  const diagnosisByProblem = new Map<string, ClientOrganizationEvolutionDiagnosis>();
  for (const row of diagnosisRows) {
    const problemId = String(row.problem_id);
    if (!diagnosisByProblem.has(problemId)) {
      diagnosisByProblem.set(problemId, {
        alternativeHypotheses: nullable(row.alternative_hypotheses),
        contradictingEvidence: nullable(row.contradicting_evidence),
        id: String(row.id),
        proximateCause: nullable(row.proximate_cause),
        rootCauseHypothesis: String(row.root_cause_hypothesis),
        supportingEvidence: nullable(row.supporting_evidence),
        symptom: String(row.symptom),
        uncertainty: nullable(row.uncertainty),
      });
    }
  }

  const actionsByDesign = new Map<string, ClientOrganizationEvolutionAction[]>();
  for (const row of actionRows) {
    const designId = String(row.design_id);
    const items = actionsByDesign.get(designId) ?? [];
    items.push({
      commitment: String(row.commitment),
      id: String(row.id),
      position: Number(row.position),
      status: String(row.status) as OrganizationActionStatus,
    });
    actionsByDesign.set(designId, items);
  }

  const outcomeByDesign = new Map<string, ClientOrganizationEvolutionOutcome>();
  for (const row of outcomeRows) {
    const designId = String(row.design_id);
    if (!outcomeByDesign.has(designId)) {
      outcomeByDesign.set(designId, {
        actualResult: String(row.actual_result),
        comparison: String(row.comparison) as OrganizationOutcomeComparison,
        expectedResult: String(row.expected_result),
        id: String(row.id),
        observedAt: iso(row.observed_at),
      });
    }
  }

  const reflectionByDesign = new Map<string, ClientOrganizationEvolutionReflection>();
  for (const row of reflectionRows) {
    reflectionByDesign.set(String(row.design_id), {
      expected: nullable(row.expected),
      happened: String(row.happened),
      id: String(row.id),
      learning: nullable(row.learning),
      recurring: row.recurring === null ? null : Boolean(row.recurring),
      surprise: nullable(row.surprise),
    });
  }

  const designByProblem = new Map<string, ClientOrganizationEvolutionDesign>();
  for (const row of designRows) {
    const problemId = String(row.problem_id);
    if (!designByProblem.has(problemId)) {
      const designId = String(row.id);
      designByProblem.set(problemId, {
        acceptanceState: String(row.acceptance_state) as "accepted" | "revised",
        actions: actionsByDesign.get(designId) ?? [],
        expectedResult: String(row.expected_result),
        id: designId,
        machineChange: String(row.machine_change),
        outcome: outcomeByDesign.get(designId) ?? null,
        ownerEmail: String(row.owner_email),
        rationale: String(row.rationale),
        reflection: reflectionByDesign.get(designId) ?? null,
        successSignal: String(row.success_signal),
      });
    }
  }

  const problemsByGoal = new Map<string, ClientOrganizationEvolutionProblem[]>();
  for (const row of problemRows) {
    const goalId = String(row.goal_id);
    const problemId = String(row.id);
    const issueId = String(row.issue_id);
    const items = problemsByGoal.get(goalId) ?? [];
    items.push({
      createdByEmail: String(row.created_by_email),
      design: designByProblem.get(problemId) ?? null,
      diagnosis: diagnosisByProblem.get(problemId) ?? null,
      disagreements: disagreementsByIssue.get(issueId) ?? [],
      gap: nullable(row.gap),
      id: problemId,
      issueId,
      observedReality: String(row.observed_reality),
      statement: String(row.statement),
      status: String(row.status) as "recognized" | "resolved" | "retired",
    });
    problemsByGoal.set(goalId, items);
  }

  const goals: ClientOrganizationEvolutionGoal[] = goalRows.map((row) => {
    const goalId = String(row.id);
    return {
      acceptedTradeoffs: nullable(row.accepted_tradeoffs),
      desiredState: String(row.desired_state),
      id: goalId,
      measures: nullable(row.measures),
      nonNegotiables: nullable(row.non_negotiables),
      problems: problemsByGoal.get(goalId) ?? [],
      status: String(row.status) as ClientOrganizationEvolutionGoal["status"],
      successConditions: nullable(row.success_conditions),
      whyItMatters: nullable(row.why_it_matters),
    };
  });

  const principles: ClientOrganizationEvolutionPrinciple[] = principleRows.map((row) => ({
    acceptanceState: String(row.acceptance_state) as "accepted" | "revised",
    id: String(row.id),
    lifecycleState: String(row.lifecycle_state) as ClientOrganizationEvolutionPrinciple["lifecycleState"],
    rationale: nullable(row.rationale),
    rule: String(row.rule),
    trigger: String(row.trigger),
  }));

  return {
    contextEvidence,
    goals,
    handle: access.handle,
    members,
    membershipRole: access.membershipRole,
    name: access.name,
    principles,
  };
}

export async function createOrganizationEvolutionGoal(input: {
  acceptedTradeoffs?: string;
  desiredState: string;
  handle: string;
  measures?: string;
  nonNegotiables?: string;
  successConditions: string;
  userId: string;
  whyItMatters: string;
}): Promise<ClientOrganizationEvolutionState> {
  const access = await evolutionAccess(input.userId, input.handle, true);
  const rows = await db()`
    INSERT INTO goals (
      workspace_id,
      created_by_user_id,
      desired_state,
      why_it_matters,
      status,
      accepted_tradeoffs,
      non_negotiables,
      success_conditions,
      measures
    ) VALUES (
      ${access.workspaceId}::uuid,
      ${input.userId}::uuid,
      ${input.desiredState.trim()},
      ${input.whyItMatters.trim()},
      'chosen',
      ${input.acceptedTradeoffs?.trim() || null},
      ${input.nonNegotiables?.trim() || null},
      ${input.successConditions.trim()},
      ${input.measures?.trim() || null}
    )
    RETURNING id
  `;
  const goalId = String(rows[0]?.id);
  await db()`
    INSERT INTO activity_events (
      workspace_id, actor_user_id, event_type, subject_type, subject_id
    ) VALUES (
      ${access.workspaceId}::uuid,
      ${input.userId}::uuid,
      'organization.goal_created',
      'goal',
      ${goalId}::uuid
    )
  `;
  return loadOrganizationEvolutionState(input.userId, input.handle);
}

export async function recordOrganizationEvolutionIssue(input: {
  goalId: string;
  handle: string;
  observedReality: string;
  tension: string;
  title: string;
  userId: string;
}): Promise<ClientOrganizationEvolutionState> {
  const access = await evolutionAccess(input.userId, input.handle);
  try {
    await db().begin(async (transaction) => {
      const goals = await transaction`
        SELECT id
        FROM goals
        WHERE id = ${input.goalId}::uuid
          AND workspace_id = ${access.workspaceId}::uuid
          AND status = 'chosen'
        LIMIT 1
      `;
      if (!goals[0]?.id) {
        throw new OrganizationNotFoundError();
      }
      const evidenceRows = await transaction`
        INSERT INTO evidence_records (
          workspace_id, created_by_user_id, source_type, provider, title, content, observed_at
        ) VALUES (
          ${access.workspaceId}::uuid,
          ${input.userId}::uuid,
          'user_statement',
          'principles.organization',
          ${input.title.trim()},
          ${input.observedReality.trim()},
          now()
        )
        RETURNING id
      `;
      const evidenceId = String(evidenceRows[0]?.id);
      const observationRows = await transaction`
        INSERT INTO observations (
          workspace_id, created_by_user_id, goal_id, statement, acceptance_state
        ) VALUES (
          ${access.workspaceId}::uuid,
          ${input.userId}::uuid,
          ${input.goalId}::uuid,
          ${input.observedReality.trim()},
          'accepted'
        )
        RETURNING id
      `;
      const observationId = String(observationRows[0]?.id);
      await transaction`
        INSERT INTO observation_evidence (workspace_id, observation_id, evidence_id)
        VALUES (
          ${access.workspaceId}::uuid,
          ${observationId}::uuid,
          ${evidenceId}::uuid
        )
      `;
      const problemRows = await transaction`
        INSERT INTO problems (
          workspace_id, created_by_user_id, goal_id, statement, gap, status
        ) VALUES (
          ${access.workspaceId}::uuid,
          ${input.userId}::uuid,
          ${input.goalId}::uuid,
          ${input.title.trim()},
          ${input.tension.trim()},
          'recognized'
        )
        RETURNING id
      `;
      const problemId = String(problemRows[0]?.id);
      await transaction`
        INSERT INTO problem_evidence (workspace_id, problem_id, evidence_id)
        VALUES (
          ${access.workspaceId}::uuid,
          ${problemId}::uuid,
          ${evidenceId}::uuid
        )
      `;
      const issueRows = await transaction`
        INSERT INTO organization_issues (
          workspace_id, created_by_user_id, title, observed_reality, tension
        ) VALUES (
          ${access.workspaceId}::uuid,
          ${input.userId}::uuid,
          ${input.title.trim()},
          ${input.observedReality.trim()},
          ${input.tension.trim()}
        )
        RETURNING id
      `;
      const issueId = String(issueRows[0]?.id);
      await transaction`
        INSERT INTO organization_issue_kernel_links (
          workspace_id, issue_id, goal_id, evidence_id, observation_id, problem_id
        ) VALUES (
          ${access.workspaceId}::uuid,
          ${issueId}::uuid,
          ${input.goalId}::uuid,
          ${evidenceId}::uuid,
          ${observationId}::uuid,
          ${problemId}::uuid
        )
      `;
      await transaction`
        INSERT INTO activity_events (
          workspace_id, actor_user_id, event_type, subject_type, subject_id
        ) VALUES (
          ${access.workspaceId}::uuid,
          ${input.userId}::uuid,
          'organization.problem_recognized',
          'problem',
          ${problemId}::uuid
        )
      `;
    });
  } catch (error) {
    if (error instanceof OrganizationNotFoundError) {
      throw error;
    }
    throw error;
  }
  return loadOrganizationEvolutionState(input.userId, input.handle);
}

export async function diagnoseOrganizationProblem(input: {
  alternativeHypotheses?: string;
  contradictingEvidence?: string;
  handle: string;
  problemId: string;
  proximateCause?: string;
  rootCauseHypothesis: string;
  supportingEvidence?: string;
  symptom: string;
  uncertainty?: string;
  userId: string;
}): Promise<ClientOrganizationEvolutionState> {
  const access = await evolutionAccess(input.userId, input.handle, true);
  await assertOrganizationProblem(access.workspaceId, input.problemId);
  const existing = await db()`
    SELECT id
    FROM diagnoses
    WHERE workspace_id = ${access.workspaceId}::uuid
      AND problem_id = ${input.problemId}::uuid
    LIMIT 1
  `;
  if (existing[0]?.id) {
    throw new OrganizationConflictError();
  }
  const rows = await db()`
    INSERT INTO diagnoses (
      workspace_id,
      created_by_user_id,
      goal_id,
      problem_id,
      symptom,
      proximate_cause,
      root_cause_hypothesis,
      supporting_evidence,
      contradicting_evidence,
      alternative_hypotheses,
      uncertainty,
      acceptance_state
    )
    SELECT
      ${access.workspaceId}::uuid,
      ${input.userId}::uuid,
      problem.goal_id,
      problem.id,
      ${input.symptom.trim()},
      ${input.proximateCause?.trim() || null},
      ${input.rootCauseHypothesis.trim()},
      ${input.supportingEvidence?.trim() || null},
      ${input.contradictingEvidence?.trim() || null},
      ${input.alternativeHypotheses?.trim() || null},
      ${input.uncertainty?.trim() || null},
      'accepted'
    FROM problems problem
    WHERE problem.workspace_id = ${access.workspaceId}::uuid
      AND problem.id = ${input.problemId}::uuid
    RETURNING id
  `;
  if (!rows[0]?.id) {
    throw new OrganizationNotFoundError();
  }
  return loadOrganizationEvolutionState(input.userId, input.handle);
}

export async function designOrganizationChange(input: {
  actions: string[];
  assignedToEmail: string;
  diagnosisId: string;
  expectedResult: string;
  handle: string;
  machineChange: string;
  problemId: string;
  rationale: string;
  successSignal: string;
  userId: string;
}): Promise<ClientOrganizationEvolutionState> {
  const access = await evolutionAccess(input.userId, input.handle, true);
  await assertOrganizationProblem(access.workspaceId, input.problemId);
  const assignedUserId = await memberUserId(access.workspaceId, input.assignedToEmail);
  const cleanActions = input.actions.map((action) => action.trim()).filter(Boolean).slice(0, 5);
  if (cleanActions.length === 0) {
    throw new OrganizationConflictError();
  }
  const existing = await db()`
    SELECT id
    FROM designs
    WHERE workspace_id = ${access.workspaceId}::uuid
      AND diagnosis_id = ${input.diagnosisId}::uuid
    LIMIT 1
  `;
  if (existing[0]?.id) {
    throw new OrganizationConflictError();
  }
  await db().begin(async (transaction) => {
    const diagnosisRows = await transaction`
      SELECT goal_id, problem_id
      FROM diagnoses
      WHERE id = ${input.diagnosisId}::uuid
        AND workspace_id = ${access.workspaceId}::uuid
        AND problem_id = ${input.problemId}::uuid
      LIMIT 1
    `;
    const diagnosis = diagnosisRows[0];
    if (!diagnosis) {
      throw new OrganizationNotFoundError();
    }
    const designRows = await transaction`
      INSERT INTO designs (
        workspace_id,
        created_by_user_id,
        goal_id,
        problem_id,
        diagnosis_id,
        machine_change,
        rationale,
        expected_result,
        success_signal,
        acceptance_state,
        lifecycle_state
      ) VALUES (
        ${access.workspaceId}::uuid,
        ${input.userId}::uuid,
        ${String(diagnosis.goal_id)}::uuid,
        ${input.problemId}::uuid,
        ${input.diagnosisId}::uuid,
        ${input.machineChange.trim()},
        ${input.rationale.trim()},
        ${input.expectedResult.trim()},
        ${input.successSignal.trim()},
        'accepted',
        'active'
      )
      RETURNING id
    `;
    const designId = String(designRows[0]?.id);
    await transaction`
      INSERT INTO organization_design_assignments (
        workspace_id, design_id, user_id, assigned_by_user_id
      ) VALUES (
        ${access.workspaceId}::uuid,
        ${designId}::uuid,
        ${assignedUserId}::uuid,
        ${input.userId}::uuid
      )
    `;
    for (let position = 0; position < cleanActions.length; position += 1) {
      await transaction`
        INSERT INTO execution_actions (
          workspace_id, design_id, position, commitment, status
        ) VALUES (
          ${access.workspaceId}::uuid,
          ${designId}::uuid,
          ${position},
          ${cleanActions[position]},
          'pending'
        )
      `;
    }
    await transaction`
      INSERT INTO activity_events (
        workspace_id, actor_user_id, event_type, subject_type, subject_id,
        metadata
      ) VALUES (
        ${access.workspaceId}::uuid,
        ${input.userId}::uuid,
        'organization.design_created',
        'design',
        ${designId}::uuid,
        ${JSON.stringify({ assignedToEmail: input.assignedToEmail.trim() })}::jsonb
      )
    `;
  });
  return loadOrganizationEvolutionState(input.userId, input.handle);
}

export async function updateOrganizationAction(input: {
  actionId: string;
  designId: string;
  handle: string;
  status: Exclude<OrganizationActionStatus, "pending">;
  userId: string;
}): Promise<ClientOrganizationEvolutionState> {
  const { access } = await designExecutionAccess(input);
  const rows = await db()`
    UPDATE execution_actions
    SET
      status = ${input.status},
      completed_at = CASE WHEN ${input.status} = 'completed' THEN now() ELSE NULL END,
      updated_at = now()
    WHERE id = ${input.actionId}::uuid
      AND design_id = ${input.designId}::uuid
      AND workspace_id = ${access.workspaceId}::uuid
      AND status = 'pending'
    RETURNING id
  `;
  if (!rows[0]?.id) {
    throw new OrganizationNotFoundError();
  }
  return loadOrganizationEvolutionState(input.userId, input.handle);
}

export async function recordOrganizationOutcome(input: {
  actualResult: string;
  comparison: OrganizationOutcomeComparison;
  designId: string;
  handle: string;
  userId: string;
}): Promise<ClientOrganizationEvolutionState> {
  const { access } = await designExecutionAccess(input);
  await db().begin(async (transaction) => {
    const designs = await transaction`
      SELECT goal_id, problem_id, diagnosis_id, expected_result, lifecycle_state
      FROM designs
      WHERE id = ${input.designId}::uuid
        AND workspace_id = ${access.workspaceId}::uuid
      LIMIT 1
    `;
    const design = designs[0];
    if (!design || String(design.lifecycle_state) !== "active") {
      throw new OrganizationNotFoundError();
    }
    const pending = await transaction`
      SELECT count(*)::int AS count
      FROM execution_actions
      WHERE workspace_id = ${access.workspaceId}::uuid
        AND design_id = ${input.designId}::uuid
        AND status = 'pending'
    `;
    if (Number(pending[0]?.count ?? 0) > 0) {
      throw new OrganizationConflictError();
    }
    const evidenceRows = await transaction`
      INSERT INTO evidence_records (
        workspace_id, created_by_user_id, source_type, provider, title, content, observed_at
      ) VALUES (
        ${access.workspaceId}::uuid,
        ${input.userId}::uuid,
        'user_statement',
        'principles.organization',
        'Organization outcome',
        ${input.actualResult.trim()},
        now()
      )
      RETURNING id
    `;
    const evidenceId = String(evidenceRows[0]?.id);
    const observationRows = await transaction`
      INSERT INTO observations (
        workspace_id, created_by_user_id, goal_id, statement, acceptance_state
      ) VALUES (
        ${access.workspaceId}::uuid,
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
        ${access.workspaceId}::uuid,
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
        comparison
      ) VALUES (
        ${access.workspaceId}::uuid,
        ${input.userId}::uuid,
        ${String(design.goal_id)}::uuid,
        ${String(design.problem_id)}::uuid,
        ${String(design.diagnosis_id)}::uuid,
        ${input.designId}::uuid,
        ${evidenceId}::uuid,
        ${observationId}::uuid,
        ${String(design.expected_result)},
        ${input.actualResult.trim()},
        ${input.comparison}
      )
      RETURNING id
    `;
    const outcomeId = String(outcomeRows[0]?.id);
    await transaction`
      UPDATE designs
      SET lifecycle_state = 'evaluated', updated_at = now()
      WHERE id = ${input.designId}::uuid
        AND workspace_id = ${access.workspaceId}::uuid
    `;
    await transaction`
      INSERT INTO activity_events (
        workspace_id, actor_user_id, event_type, subject_type, subject_id
      ) VALUES (
        ${access.workspaceId}::uuid,
        ${input.userId}::uuid,
        'organization.outcome_recorded',
        'outcome',
        ${outcomeId}::uuid
      )
    `;
  });
  return loadOrganizationEvolutionState(input.userId, input.handle);
}

export async function reflectOnOrganizationOutcome(input: {
  designId: string;
  expected?: string;
  happened: string;
  handle: string;
  learning: string;
  recurring?: boolean;
  surprise?: string;
  userId: string;
}): Promise<ClientOrganizationEvolutionState> {
  const { access } = await designExecutionAccess(input);
  await db().begin(async (transaction) => {
    const outcomes = await transaction`
      SELECT id, goal_id, problem_id
      FROM outcomes
      WHERE workspace_id = ${access.workspaceId}::uuid
        AND design_id = ${input.designId}::uuid
      LIMIT 1
    `;
    const outcome = outcomes[0];
    if (!outcome) {
      throw new OrganizationNotFoundError();
    }
    const existing = await transaction`
      SELECT reflection_id
      FROM outcome_reflections
      WHERE workspace_id = ${access.workspaceId}::uuid
        AND outcome_id = ${String(outcome.id)}::uuid
      LIMIT 1
    `;
    if (existing[0]?.reflection_id) {
      throw new OrganizationConflictError();
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
        learning,
        recurring,
        status
      ) VALUES (
        ${access.workspaceId}::uuid,
        ${input.userId}::uuid,
        ${String(outcome.goal_id)}::uuid,
        ${String(outcome.problem_id)}::uuid,
        ${input.happened.trim()},
        ${input.expected?.trim() || null},
        ${input.surprise?.trim() || null},
        ${input.learning.trim()},
        ${input.recurring ?? null},
        'completed'
      )
      RETURNING id
    `;
    const reflectionId = String(reflectionRows[0]?.id);
    await transaction`
      INSERT INTO outcome_reflections (
        workspace_id, reflection_id, outcome_id, goal_id, problem_id
      ) VALUES (
        ${access.workspaceId}::uuid,
        ${reflectionId}::uuid,
        ${String(outcome.id)}::uuid,
        ${String(outcome.goal_id)}::uuid,
        ${String(outcome.problem_id)}::uuid
      )
    `;
    await transaction`
      INSERT INTO activity_events (
        workspace_id, actor_user_id, event_type, subject_type, subject_id
      ) VALUES (
        ${access.workspaceId}::uuid,
        ${input.userId}::uuid,
        'organization.reflection_completed',
        'reflection',
        ${reflectionId}::uuid
      )
    `;
  });
  return loadOrganizationEvolutionState(input.userId, input.handle);
}

export async function saveOrganizationPrinciple(input: {
  handle: string;
  principleId?: string;
  rationale?: string;
  reflectionId: string;
  rule: string;
  trigger: string;
  userId: string;
}): Promise<ClientOrganizationEvolutionState> {
  const access = await evolutionAccess(input.userId, input.handle, true);
  await db().begin(async (transaction) => {
    const reflections = await transaction`
      SELECT id
      FROM reflections
      WHERE id = ${input.reflectionId}::uuid
        AND workspace_id = ${access.workspaceId}::uuid
        AND status = 'completed'
      LIMIT 1
    `;
    if (!reflections[0]?.id) {
      throw new OrganizationNotFoundError();
    }
    let principleId = input.principleId?.trim() || "";
    if (principleId) {
      const rows = await transaction`
        UPDATE principles
        SET
          trigger = ${input.trigger.trim()},
          rule = ${input.rule.trim()},
          rationale = ${input.rationale?.trim() || null},
          origin_reflection_id = ${input.reflectionId}::uuid,
          acceptance_state = 'revised',
          lifecycle_state = 'revised',
          last_challenged_at = now(),
          updated_at = now()
        WHERE id = ${principleId}::uuid
          AND workspace_id = ${access.workspaceId}::uuid
          AND acceptance_state IN ('accepted', 'revised')
        RETURNING id
      `;
      if (!rows[0]?.id) {
        throw new OrganizationNotFoundError();
      }
    } else {
      const rows = await transaction`
        INSERT INTO principles (
          workspace_id,
          created_by_user_id,
          trigger,
          rule,
          rationale,
          lifecycle_state,
          acceptance_state,
          origin_reflection_id
        ) VALUES (
          ${access.workspaceId}::uuid,
          ${input.userId}::uuid,
          ${input.trigger.trim()},
          ${input.rule.trim()},
          ${input.rationale?.trim() || null},
          'testing',
          'accepted',
          ${input.reflectionId}::uuid
        )
        RETURNING id
      `;
      principleId = String(rows[0]?.id);
    }
    await transaction`
      UPDATE problems problem
      SET status = 'resolved', updated_at = now()
      FROM reflections reflection
      WHERE reflection.id = ${input.reflectionId}::uuid
        AND reflection.workspace_id = ${access.workspaceId}::uuid
        AND problem.id = reflection.problem_id
        AND problem.workspace_id = reflection.workspace_id
    `;
    await transaction`
      UPDATE organization_issues issue
      SET
        status = 'resolved',
        resolution = COALESCE(issue.resolution, 'Closed through the organization evolution loop.'),
        resolved_by_user_id = ${input.userId}::uuid,
        resolved_at = COALESCE(issue.resolved_at, now()),
        updated_at = now()
      FROM organization_issue_kernel_links link, reflections reflection
      WHERE reflection.id = ${input.reflectionId}::uuid
        AND reflection.workspace_id = ${access.workspaceId}::uuid
        AND link.workspace_id = reflection.workspace_id
        AND link.problem_id = reflection.problem_id
        AND issue.id = link.issue_id
        AND issue.workspace_id = link.workspace_id
    `;
    await transaction`
      INSERT INTO activity_events (
        workspace_id, actor_user_id, event_type, subject_type, subject_id
      ) VALUES (
        ${access.workspaceId}::uuid,
        ${input.userId}::uuid,
        'organization.principle_updated',
        'principle',
        ${principleId}::uuid
      )
    `;
  });
  return loadOrganizationEvolutionState(input.userId, input.handle);
}
