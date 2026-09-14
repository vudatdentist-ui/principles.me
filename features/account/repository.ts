import { randomBytes } from "node:crypto";
import { db } from "@/lib/db/client";

export class OwnedOrganizationsRequireConfirmationError extends Error {
  constructor(
    readonly organizations: ReadonlyArray<{ handle: string | null; name: string }>,
  ) {
    super("Account owns organization workspaces that require explicit deletion confirmation.");
    this.name = "OwnedOrganizationsRequireConfirmationError";
  }
}

async function assertPersonalWorkspace(userId: string, workspaceId: string): Promise<void> {
  const rows = await db()`
    SELECT id
    FROM workspaces
    WHERE id = ${workspaceId}::uuid
      AND kind = 'personal'
      AND created_by_user_id = ${userId}::uuid
    LIMIT 1
  `;
  if (!rows[0]) {
    throw new Error("Personal workspace was not found.");
  }
}

export async function exportAccountData(input: {
  userId: string;
  workspaceId: string;
}): Promise<Record<string, unknown>> {
  await assertPersonalWorkspace(input.userId, input.workspaceId);
  const sql = db();
  const [
    userRows,
    goalRows,
    observationRows,
    problemRows,
    diagnosisRows,
    designRows,
    actionRows,
    outcomeRows,
    reflectionRows,
    principleRows,
    patternRows,
    patternCaseRows,
    revisionRows,
    evidenceRows,
    suggestionRows,
    activityRows,
    observationEvidenceRows,
    problemEvidenceRows,
    diagnosisEvidenceRows,
    principleEvidenceRows,
    outcomeReflectionRows,
    membershipRows,
    issueRows,
    disagreementRows,
    contextEvidenceRows,
    roleAssignmentRows,
    teamMembershipRows,
  ] = await Promise.all([
    sql`SELECT id, email, created_at, updated_at FROM users WHERE id = ${input.userId}::uuid LIMIT 1`,
    sql`SELECT * FROM goals WHERE workspace_id = ${input.workspaceId}::uuid ORDER BY created_at`,
    sql`SELECT * FROM observations WHERE workspace_id = ${input.workspaceId}::uuid ORDER BY created_at`,
    sql`SELECT * FROM problems WHERE workspace_id = ${input.workspaceId}::uuid ORDER BY created_at`,
    sql`SELECT * FROM diagnoses WHERE workspace_id = ${input.workspaceId}::uuid ORDER BY created_at`,
    sql`SELECT * FROM designs WHERE workspace_id = ${input.workspaceId}::uuid ORDER BY created_at`,
    sql`SELECT * FROM execution_actions WHERE workspace_id = ${input.workspaceId}::uuid ORDER BY created_at`,
    sql`SELECT * FROM outcomes WHERE workspace_id = ${input.workspaceId}::uuid ORDER BY created_at`,
    sql`SELECT * FROM reflections WHERE workspace_id = ${input.workspaceId}::uuid ORDER BY created_at`,
    sql`SELECT * FROM principles WHERE workspace_id = ${input.workspaceId}::uuid ORDER BY created_at`,
    sql`SELECT * FROM learning_patterns WHERE workspace_id = ${input.workspaceId}::uuid ORDER BY created_at`,
    sql`SELECT * FROM learning_pattern_cases WHERE workspace_id = ${input.workspaceId}::uuid ORDER BY position`,
    sql`SELECT * FROM principle_learning_revisions WHERE workspace_id = ${input.workspaceId}::uuid ORDER BY created_at`,
    sql`
      SELECT id, workspace_id, created_by_user_id, source_type, provider, external_ref,
        title,
        CASE WHEN source_type IN ('user_statement', 'activity') THEN content ELSE NULL END AS content,
        source_url, published_at, observed_at, retrieved_at,
        CASE WHEN source_type IN ('user_statement', 'activity') THEN metadata ELSE '{}'::jsonb END AS metadata,
        created_at
      FROM evidence_records
      WHERE workspace_id = ${input.workspaceId}::uuid
      ORDER BY created_at
    `,
    sql`
      SELECT id, workspace_id, requested_by_user_id, kind, payload,
        acceptance_state, model_provider, model_name, reviewed_at, created_at, updated_at
      FROM ai_suggestions
      WHERE workspace_id = ${input.workspaceId}::uuid
      ORDER BY created_at
    `,
    sql`
      SELECT event_type, subject_type, subject_id, happened_at, created_at
      FROM activity_events
      WHERE workspace_id = ${input.workspaceId}::uuid
      ORDER BY happened_at
    `,
    sql`SELECT * FROM observation_evidence WHERE workspace_id = ${input.workspaceId}::uuid`,
    sql`SELECT * FROM problem_evidence WHERE workspace_id = ${input.workspaceId}::uuid`,
    sql`SELECT * FROM diagnosis_evidence WHERE workspace_id = ${input.workspaceId}::uuid`,
    sql`SELECT * FROM principle_evidence WHERE workspace_id = ${input.workspaceId}::uuid`,
    sql`SELECT * FROM outcome_reflections WHERE workspace_id = ${input.workspaceId}::uuid`,
    sql`
      SELECT p.handle, w.name, membership.role, membership.created_at
      FROM workspace_memberships membership
      JOIN workspaces w ON w.id = membership.workspace_id AND w.kind = 'organization'
      LEFT JOIN organization_profiles p ON p.workspace_id = w.id
      WHERE membership.user_id = ${input.userId}::uuid
      ORDER BY membership.created_at
    `,
    sql`
      SELECT p.handle, issue.title, issue.observed_reality, issue.tension, issue.status,
        issue.resolution, issue.created_at, issue.updated_at
      FROM organization_issues issue
      JOIN organization_profiles p ON p.workspace_id = issue.workspace_id
      WHERE issue.created_by_user_id = ${input.userId}::uuid
         OR issue.resolved_by_user_id = ${input.userId}::uuid
      ORDER BY issue.created_at
    `,
    sql`
      SELECT p.handle, disagreement.statement, disagreement.reasoning, disagreement.status,
        disagreement.resolution, disagreement.created_at, disagreement.updated_at
      FROM organization_disagreements disagreement
      JOIN organization_profiles p ON p.workspace_id = disagreement.workspace_id
      WHERE disagreement.raised_by_user_id = ${input.userId}::uuid
         OR disagreement.resolved_by_user_id = ${input.userId}::uuid
      ORDER BY disagreement.created_at
    `,
    sql`
      SELECT p.handle, evidence.context, evidence.observation, evidence.evidence_for,
        evidence.evidence_against, evidence.created_at, evidence.updated_at,
        evidence.subject_user_id = ${input.userId}::uuid AS about_exporting_user
      FROM organization_context_evidence evidence
      JOIN organization_profiles p ON p.workspace_id = evidence.workspace_id
      WHERE evidence.created_by_user_id = ${input.userId}::uuid
         OR evidence.subject_user_id = ${input.userId}::uuid
      ORDER BY evidence.created_at
    `,
    sql`
      SELECT p.handle, role.name, role.purpose, role.decision_scope, assignment.created_at
      FROM organization_role_assignments assignment
      JOIN organization_profiles p ON p.workspace_id = assignment.workspace_id
      JOIN organization_roles role
        ON role.id = assignment.role_id AND role.workspace_id = assignment.workspace_id
      WHERE assignment.user_id = ${input.userId}::uuid
      ORDER BY assignment.created_at
    `,
    sql`
      SELECT p.handle, team.name, team.purpose, membership.created_at
      FROM organization_team_members membership
      JOIN organization_profiles p ON p.workspace_id = membership.workspace_id
      JOIN organization_teams team
        ON team.id = membership.team_id AND team.workspace_id = membership.workspace_id
      WHERE membership.user_id = ${input.userId}::uuid
      ORDER BY membership.created_at
    `,
  ]);

  return {
    exportVersion: 1,
    generatedAt: new Date().toISOString(),
    user: userRows[0] ?? null,
    personalWorkspace: {
      actions: actionRows,
      activity: activityRows,
      aiSuggestions: suggestionRows,
      designs: designRows,
      diagnoses: diagnosisRows,
      evidence: evidenceRows,
      goals: goalRows,
      learningPatternCases: patternCaseRows,
      learningPatterns: patternRows,
      links: {
        diagnosisEvidence: diagnosisEvidenceRows,
        observationEvidence: observationEvidenceRows,
        outcomeReflections: outcomeReflectionRows,
        principleEvidence: principleEvidenceRows,
        problemEvidence: problemEvidenceRows,
      },
      observations: observationRows,
      outcomes: outcomeRows,
      principleLearningRevisions: revisionRows,
      principles: principleRows,
      problems: problemRows,
      reflections: reflectionRows,
    },
    organizationParticipation: {
      contextEvidence: contextEvidenceRows,
      disagreements: disagreementRows,
      issues: issueRows,
      memberships: membershipRows,
      roleAssignments: roleAssignmentRows,
      teamMemberships: teamMembershipRows,
    },
  };
}

export async function deleteAccountData(input: {
  deleteOwnedOrganizations: boolean;
  userId: string;
  workspaceId: string;
}): Promise<{ deletedOwnedOrganizations: number; sharedOrganizationHistoryPreserved: true }> {
  const tombstoneEmail = `deleted+${input.userId}@deleted.invalid`;
  const tombstonePassword = `deleted$${randomBytes(32).toString("base64url")}`;

  return db().begin(async (transaction) => {
    const userRows = await transaction`
      SELECT id
      FROM users
      WHERE id = ${input.userId}::uuid AND status = 'active'
      FOR UPDATE
    `;
    if (!userRows[0]) {
      throw new Error("Account was not found.");
    }
    const personalRows = await transaction`
      SELECT id
      FROM workspaces
      WHERE id = ${input.workspaceId}::uuid
        AND kind = 'personal'
        AND created_by_user_id = ${input.userId}::uuid
      FOR UPDATE
    `;
    if (!personalRows[0]) {
      throw new Error("Personal workspace was not found.");
    }

    const ownedOrganizations = await transaction`
      SELECT w.id, w.name, p.handle
      FROM workspaces w
      LEFT JOIN organization_profiles p ON p.workspace_id = w.id
      WHERE w.kind = 'organization'
        AND w.created_by_user_id = ${input.userId}::uuid
      ORDER BY w.created_at
      FOR UPDATE OF w
    `;
    if (ownedOrganizations.length > 0 && !input.deleteOwnedOrganizations) {
      throw new OwnedOrganizationsRequireConfirmationError(
        ownedOrganizations.map((row) => ({
          handle: row.handle ? String(row.handle) : null,
          name: String(row.name),
        })),
      );
    }

    if (input.deleteOwnedOrganizations) {
      await transaction`
        DELETE FROM workspaces
        WHERE kind = 'organization'
          AND created_by_user_id = ${input.userId}::uuid
      `;
    }
    await transaction`
      DELETE FROM workspaces
      WHERE id = ${input.workspaceId}::uuid
        AND kind = 'personal'
        AND created_by_user_id = ${input.userId}::uuid
    `;
    await transaction`
      DELETE FROM email_verification_tokens WHERE user_id = ${input.userId}::uuid
    `;
    await transaction`
      DELETE FROM password_reset_tokens WHERE user_id = ${input.userId}::uuid
    `;
    await transaction`
      UPDATE sessions
      SET revoked_at = COALESCE(revoked_at, now())
      WHERE user_id = ${input.userId}::uuid
    `;
    await transaction`
      UPDATE users
      SET status = 'disabled',
          email = ${tombstoneEmail},
          email_normalized = ${tombstoneEmail},
          password_hash = ${tombstonePassword},
          updated_at = now()
      WHERE id = ${input.userId}::uuid
    `;

    return {
      deletedOwnedOrganizations: input.deleteOwnedOrganizations
        ? ownedOrganizations.length
        : 0,
      sharedOrganizationHistoryPreserved: true as const,
    };
  });
}
