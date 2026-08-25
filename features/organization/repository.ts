import { randomBytes } from "node:crypto";
import { db } from "@/lib/db/client";
import type {
  ClientOrganization,
  ClientOrganizationContextEvidence,
  ClientOrganizationDisagreement,
  ClientOrganizationIssue,
  ClientOrganizationMember,
  ClientOrganizationRole,
  ClientOrganizationState,
  ClientOrganizationTeam,
  OrganizationMembershipRole,
} from "./contracts";

export class OrganizationNotFoundError extends Error {}
export class OrganizationForbiddenError extends Error {}
export class OrganizationConflictError extends Error {}
export class OrganizationMemberNotFoundError extends Error {}

interface OrganizationAccess {
  readonly handle: string;
  readonly membershipRole: OrganizationMembershipRole;
  readonly name: string;
  readonly purpose: string | null;
  readonly workspaceId: string;
}

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}

function nullable(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function isPgCode(error: unknown, code: string): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      String((error as { code?: unknown }).code) === code
  );
}

function organizationHandle(): string {
  return `org_${randomBytes(6).toString("hex")}`;
}

async function organizationAccess(
  userId: string,
  handle: string,
  ownerRequired = false
): Promise<OrganizationAccess> {
  const rows = await db()`
    SELECT
      profile.handle,
      profile.purpose,
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
  const role = String(row.membership_role) as OrganizationMembershipRole;
  if (ownerRequired && role !== "owner") {
    throw new OrganizationForbiddenError();
  }
  return {
    handle: String(row.handle),
    membershipRole: role,
    name: String(row.name),
    purpose: nullable(row.purpose),
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
    WHERE users.email_normalized = ${normalizedEmail(email)}
      AND users.status = 'active'
    LIMIT 1
  `;
  if (!rows[0]?.id) {
    throw new OrganizationMemberNotFoundError();
  }
  return String(rows[0].id);
}

async function loadOrganization(access: OrganizationAccess): Promise<ClientOrganization> {
  const sql = db();
  const [memberRows, roleRows, responsibilityRows, assignmentRows, teamRows, teamMemberRows, issueRows, disagreementRows, contextRows] =
    await Promise.all([
      sql`
        SELECT users.email, membership.role
        FROM workspace_memberships membership
        JOIN users ON users.id = membership.user_id
        WHERE membership.workspace_id = ${access.workspaceId}::uuid
        ORDER BY CASE WHEN membership.role = 'owner' THEN 0 ELSE 1 END, users.email_normalized
      `,
      sql`
        SELECT id, name, purpose, decision_scope
        FROM organization_roles
        WHERE workspace_id = ${access.workspaceId}::uuid
        ORDER BY created_at ASC
      `,
      sql`
        SELECT id, role_id, statement, expected_outcome
        FROM organization_responsibilities
        WHERE workspace_id = ${access.workspaceId}::uuid
        ORDER BY created_at ASC
      `,
      sql`
        SELECT assignment.role_id, users.email
        FROM organization_role_assignments assignment
        JOIN users ON users.id = assignment.user_id
        WHERE assignment.workspace_id = ${access.workspaceId}::uuid
        ORDER BY assignment.created_at ASC
      `,
      sql`
        SELECT id, name, purpose
        FROM organization_teams
        WHERE workspace_id = ${access.workspaceId}::uuid
        ORDER BY created_at ASC
      `,
      sql`
        SELECT membership.team_id, users.email
        FROM organization_team_members membership
        JOIN users ON users.id = membership.user_id
        WHERE membership.workspace_id = ${access.workspaceId}::uuid
        ORDER BY membership.created_at ASC
      `,
      sql`
        SELECT
          issue.id,
          issue.title,
          issue.observed_reality,
          issue.tension,
          issue.status,
          issue.resolution,
          issue.created_at,
          creator.email AS created_by_email,
          resolver.email AS resolved_by_email
        FROM organization_issues issue
        JOIN users creator ON creator.id = issue.created_by_user_id
        LEFT JOIN users resolver ON resolver.id = issue.resolved_by_user_id
        WHERE issue.workspace_id = ${access.workspaceId}::uuid
        ORDER BY issue.created_at DESC
      `,
      sql`
        SELECT
          disagreement.id,
          disagreement.issue_id,
          disagreement.statement,
          disagreement.reasoning,
          disagreement.status,
          disagreement.resolution,
          disagreement.created_at,
          raiser.email AS raised_by_email,
          resolver.email AS resolved_by_email
        FROM organization_disagreements disagreement
        JOIN users raiser ON raiser.id = disagreement.raised_by_user_id
        LEFT JOIN users resolver ON resolver.id = disagreement.resolved_by_user_id
        WHERE disagreement.workspace_id = ${access.workspaceId}::uuid
        ORDER BY disagreement.created_at ASC
      `,
      sql`
        SELECT
          context.id,
          context.context,
          context.observation,
          context.evidence_for,
          context.evidence_against,
          context.created_at,
          subject.email AS subject_email,
          creator.email AS created_by_email
        FROM organization_context_evidence context
        JOIN users subject ON subject.id = context.subject_user_id
        JOIN users creator ON creator.id = context.created_by_user_id
        WHERE context.workspace_id = ${access.workspaceId}::uuid
        ORDER BY context.created_at DESC
      `,
    ]);

  const members: ClientOrganizationMember[] = memberRows.map((row) => ({
    email: String(row.email),
    membershipRole: String(row.role) as OrganizationMembershipRole,
  }));

  const roles: ClientOrganizationRole[] = roleRows.map((role) => {
    const roleId = String(role.id);
    return {
      decisionScope: nullable(role.decision_scope),
      id: roleId,
      memberEmails: assignmentRows
        .filter((assignment) => String(assignment.role_id) === roleId)
        .map((assignment) => String(assignment.email)),
      name: String(role.name),
      purpose: nullable(role.purpose),
      responsibilities: responsibilityRows
        .filter((responsibility) => String(responsibility.role_id) === roleId)
        .map((responsibility) => ({
          expectedOutcome: nullable(responsibility.expected_outcome),
          id: String(responsibility.id),
          statement: String(responsibility.statement),
        })),
    };
  });

  const teams: ClientOrganizationTeam[] = teamRows.map((team) => {
    const teamId = String(team.id);
    return {
      id: teamId,
      memberEmails: teamMemberRows
        .filter((membership) => String(membership.team_id) === teamId)
        .map((membership) => String(membership.email)),
      name: String(team.name),
      purpose: nullable(team.purpose),
    };
  });

  const disagreementByIssue = new Map<string, ClientOrganizationDisagreement[]>();
  for (const disagreement of disagreementRows) {
    const issueId = String(disagreement.issue_id);
    const current = disagreementByIssue.get(issueId) ?? [];
    current.push({
      createdAt: iso(disagreement.created_at),
      id: String(disagreement.id),
      raisedByEmail: String(disagreement.raised_by_email),
      reasoning: nullable(disagreement.reasoning),
      resolution: nullable(disagreement.resolution),
      resolvedByEmail: nullable(disagreement.resolved_by_email),
      statement: String(disagreement.statement),
      status: String(disagreement.status) as "open" | "resolved",
    });
    disagreementByIssue.set(issueId, current);
  }

  const issues: ClientOrganizationIssue[] = issueRows.map((issue) => {
    const issueId = String(issue.id);
    return {
      createdAt: iso(issue.created_at),
      createdByEmail: String(issue.created_by_email),
      disagreements: disagreementByIssue.get(issueId) ?? [],
      id: issueId,
      observedReality: String(issue.observed_reality),
      resolution: nullable(issue.resolution),
      resolvedByEmail: nullable(issue.resolved_by_email),
      status: String(issue.status) as "open" | "resolved",
      tension: String(issue.tension),
      title: String(issue.title),
    };
  });

  const contextEvidence: ClientOrganizationContextEvidence[] = contextRows.map((row) => ({
    context: String(row.context),
    createdAt: iso(row.created_at),
    createdByEmail: String(row.created_by_email),
    evidenceAgainst: nullable(row.evidence_against),
    evidenceFor: nullable(row.evidence_for),
    id: String(row.id),
    observation: String(row.observation),
    subjectEmail: String(row.subject_email),
  }));

  return {
    contextEvidence,
    handle: access.handle,
    issues,
    members,
    membershipRole: access.membershipRole,
    name: access.name,
    purpose: access.purpose,
    roles,
    teams,
  };
}

export async function loadOrganizationState(userId: string): Promise<ClientOrganizationState> {
  const rows = await db()`
    SELECT
      profile.handle,
      profile.purpose,
      workspace.id AS workspace_id,
      workspace.name,
      membership.role AS membership_role
    FROM workspace_memberships membership
    JOIN workspaces workspace
      ON workspace.id = membership.workspace_id
      AND workspace.kind = 'organization'
    JOIN organization_profiles profile ON profile.workspace_id = workspace.id
    WHERE membership.user_id = ${userId}::uuid
    ORDER BY workspace.created_at ASC
  `;
  const accessList: OrganizationAccess[] = rows.map((row) => ({
    handle: String(row.handle),
    membershipRole: String(row.membership_role) as OrganizationMembershipRole,
    name: String(row.name),
    purpose: nullable(row.purpose),
    workspaceId: String(row.workspace_id),
  }));
  return { organizations: await Promise.all(accessList.map(loadOrganization)) };
}

export async function createOrganization(input: {
  name: string;
  purpose?: string;
  userId: string;
}): Promise<ClientOrganizationState> {
  const sql = db();
  const handle = organizationHandle();
  try {
    await sql.begin(async (transaction) => {
      const workspaces = await transaction`
        INSERT INTO workspaces (kind, name, created_by_user_id)
        VALUES ('organization', ${input.name.trim()}, ${input.userId}::uuid)
        RETURNING id
      `;
      const workspaceId = String(workspaces[0]?.id);
      await transaction`
        INSERT INTO organization_profiles (workspace_id, handle, purpose)
        VALUES (${workspaceId}::uuid, ${handle}, ${input.purpose?.trim() || null})
      `;
      await transaction`
        INSERT INTO workspace_memberships (workspace_id, user_id, role)
        VALUES (${workspaceId}::uuid, ${input.userId}::uuid, 'owner')
      `;
      await transaction`
        INSERT INTO activity_events (
          workspace_id, actor_user_id, event_type, subject_type, subject_id, metadata
        ) VALUES (
          ${workspaceId}::uuid,
          ${input.userId}::uuid,
          'organization.created',
          'workspace',
          ${workspaceId}::uuid,
          ${JSON.stringify({ handle })}::jsonb
        )
      `;
    });
  } catch (error) {
    if (isPgCode(error, "23505")) {
      throw new OrganizationConflictError();
    }
    throw error;
  }
  return loadOrganizationState(input.userId);
}

export async function addOrganizationMember(input: {
  email: string;
  handle: string;
  userId: string;
}): Promise<ClientOrganizationState> {
  const access = await organizationAccess(input.userId, input.handle, true);
  const users = await db()`
    SELECT id
    FROM users
    WHERE email_normalized = ${normalizedEmail(input.email)}
      AND status = 'active'
    LIMIT 1
  `;
  if (!users[0]?.id) {
    throw new OrganizationMemberNotFoundError();
  }
  const memberId = String(users[0].id);
  try {
    await db().begin(async (transaction) => {
      await transaction`
        INSERT INTO workspace_memberships (workspace_id, user_id, role)
        VALUES (${access.workspaceId}::uuid, ${memberId}::uuid, 'member')
      `;
      await transaction`
        INSERT INTO activity_events (
          workspace_id, actor_user_id, event_type, subject_type, subject_id
        ) VALUES (
          ${access.workspaceId}::uuid,
          ${input.userId}::uuid,
          'organization.member_added',
          'user',
          ${memberId}::uuid
        )
      `;
    });
  } catch (error) {
    if (isPgCode(error, "23505")) {
      throw new OrganizationConflictError();
    }
    throw error;
  }
  return loadOrganizationState(input.userId);
}

export async function createOrganizationRole(input: {
  decisionScope?: string;
  handle: string;
  name: string;
  purpose?: string;
  userId: string;
}): Promise<ClientOrganizationState> {
  const access = await organizationAccess(input.userId, input.handle, true);
  try {
    await db()`
      INSERT INTO organization_roles (
        workspace_id, name, purpose, decision_scope, created_by_user_id
      ) VALUES (
        ${access.workspaceId}::uuid,
        ${input.name.trim()},
        ${input.purpose?.trim() || null},
        ${input.decisionScope?.trim() || null},
        ${input.userId}::uuid
      )
    `;
  } catch (error) {
    if (isPgCode(error, "23505")) {
      throw new OrganizationConflictError();
    }
    throw error;
  }
  return loadOrganizationState(input.userId);
}

export async function createOrganizationResponsibility(input: {
  expectedOutcome?: string;
  handle: string;
  roleId: string;
  statement: string;
  userId: string;
}): Promise<ClientOrganizationState> {
  const access = await organizationAccess(input.userId, input.handle, true);
  try {
    await db()`
      INSERT INTO organization_responsibilities (
        workspace_id, role_id, statement, expected_outcome, created_by_user_id
      ) VALUES (
        ${access.workspaceId}::uuid,
        ${input.roleId}::uuid,
        ${input.statement.trim()},
        ${input.expectedOutcome?.trim() || null},
        ${input.userId}::uuid
      )
    `;
  } catch (error) {
    if (isPgCode(error, "23503")) {
      throw new OrganizationNotFoundError();
    }
    throw error;
  }
  return loadOrganizationState(input.userId);
}

export async function assignOrganizationRole(input: {
  email: string;
  handle: string;
  roleId: string;
  userId: string;
}): Promise<ClientOrganizationState> {
  const access = await organizationAccess(input.userId, input.handle, true);
  const memberId = await memberUserId(access.workspaceId, input.email);
  try {
    await db()`
      INSERT INTO organization_role_assignments (
        workspace_id, role_id, user_id, assigned_by_user_id
      ) VALUES (
        ${access.workspaceId}::uuid,
        ${input.roleId}::uuid,
        ${memberId}::uuid,
        ${input.userId}::uuid
      )
    `;
  } catch (error) {
    if (isPgCode(error, "23505")) {
      throw new OrganizationConflictError();
    }
    if (isPgCode(error, "23503")) {
      throw new OrganizationNotFoundError();
    }
    throw error;
  }
  return loadOrganizationState(input.userId);
}

export async function createOrganizationTeam(input: {
  handle: string;
  name: string;
  purpose?: string;
  userId: string;
}): Promise<ClientOrganizationState> {
  const access = await organizationAccess(input.userId, input.handle, true);
  try {
    await db()`
      INSERT INTO organization_teams (workspace_id, name, purpose, created_by_user_id)
      VALUES (
        ${access.workspaceId}::uuid,
        ${input.name.trim()},
        ${input.purpose?.trim() || null},
        ${input.userId}::uuid
      )
    `;
  } catch (error) {
    if (isPgCode(error, "23505")) {
      throw new OrganizationConflictError();
    }
    throw error;
  }
  return loadOrganizationState(input.userId);
}

export async function assignOrganizationTeamMember(input: {
  email: string;
  handle: string;
  teamId: string;
  userId: string;
}): Promise<ClientOrganizationState> {
  const access = await organizationAccess(input.userId, input.handle, true);
  const memberId = await memberUserId(access.workspaceId, input.email);
  try {
    await db()`
      INSERT INTO organization_team_members (
        workspace_id, team_id, user_id, assigned_by_user_id
      ) VALUES (
        ${access.workspaceId}::uuid,
        ${input.teamId}::uuid,
        ${memberId}::uuid,
        ${input.userId}::uuid
      )
    `;
  } catch (error) {
    if (isPgCode(error, "23505")) {
      throw new OrganizationConflictError();
    }
    if (isPgCode(error, "23503")) {
      throw new OrganizationNotFoundError();
    }
    throw error;
  }
  return loadOrganizationState(input.userId);
}

export async function recordOrganizationIssue(input: {
  handle: string;
  observedReality: string;
  tension: string;
  title: string;
  userId: string;
}): Promise<ClientOrganizationState> {
  const access = await organizationAccess(input.userId, input.handle);
  await db()`
    INSERT INTO organization_issues (
      workspace_id, created_by_user_id, title, observed_reality, tension
    ) VALUES (
      ${access.workspaceId}::uuid,
      ${input.userId}::uuid,
      ${input.title.trim()},
      ${input.observedReality.trim()},
      ${input.tension.trim()}
    )
  `;
  return loadOrganizationState(input.userId);
}

export async function resolveOrganizationIssue(input: {
  handle: string;
  issueId: string;
  resolution: string;
  userId: string;
}): Promise<ClientOrganizationState> {
  const access = await organizationAccess(input.userId, input.handle, true);
  const rows = await db()`
    UPDATE organization_issues
    SET
      status = 'resolved',
      resolution = ${input.resolution.trim()},
      resolved_by_user_id = ${input.userId}::uuid,
      resolved_at = now(),
      updated_at = now()
    WHERE id = ${input.issueId}::uuid
      AND workspace_id = ${access.workspaceId}::uuid
      AND status = 'open'
    RETURNING id
  `;
  if (!rows[0]?.id) {
    throw new OrganizationNotFoundError();
  }
  return loadOrganizationState(input.userId);
}

export async function raiseOrganizationDisagreement(input: {
  handle: string;
  issueId: string;
  reasoning?: string;
  statement: string;
  userId: string;
}): Promise<ClientOrganizationState> {
  const access = await organizationAccess(input.userId, input.handle);
  try {
    await db()`
      INSERT INTO organization_disagreements (
        workspace_id, issue_id, raised_by_user_id, statement, reasoning
      ) VALUES (
        ${access.workspaceId}::uuid,
        ${input.issueId}::uuid,
        ${input.userId}::uuid,
        ${input.statement.trim()},
        ${input.reasoning?.trim() || null}
      )
    `;
  } catch (error) {
    if (isPgCode(error, "23503")) {
      throw new OrganizationNotFoundError();
    }
    throw error;
  }
  return loadOrganizationState(input.userId);
}

export async function resolveOrganizationDisagreement(input: {
  disagreementId: string;
  handle: string;
  resolution: string;
  userId: string;
}): Promise<ClientOrganizationState> {
  const access = await organizationAccess(input.userId, input.handle, true);
  const rows = await db()`
    UPDATE organization_disagreements
    SET
      status = 'resolved',
      resolution = ${input.resolution.trim()},
      resolved_by_user_id = ${input.userId}::uuid,
      resolved_at = now(),
      updated_at = now()
    WHERE id = ${input.disagreementId}::uuid
      AND workspace_id = ${access.workspaceId}::uuid
      AND status = 'open'
    RETURNING id
  `;
  if (!rows[0]?.id) {
    throw new OrganizationNotFoundError();
  }
  return loadOrganizationState(input.userId);
}

export async function recordOrganizationContextEvidence(input: {
  context: string;
  email: string;
  evidenceAgainst?: string;
  evidenceFor?: string;
  handle: string;
  observation: string;
  userId: string;
}): Promise<ClientOrganizationState> {
  const access = await organizationAccess(input.userId, input.handle);
  const subjectUserId = await memberUserId(access.workspaceId, input.email);
  await db()`
    INSERT INTO organization_context_evidence (
      workspace_id,
      subject_user_id,
      created_by_user_id,
      context,
      observation,
      evidence_for,
      evidence_against
    ) VALUES (
      ${access.workspaceId}::uuid,
      ${subjectUserId}::uuid,
      ${input.userId}::uuid,
      ${input.context.trim()},
      ${input.observation.trim()},
      ${input.evidenceFor?.trim() || null},
      ${input.evidenceAgainst?.trim() || null}
    )
  `;
  return loadOrganizationState(input.userId);
}
