import assert from "node:assert/strict";
import test from "node:test";
import { createAccount } from "../../features/auth/repository";
import { hashPassword } from "../../features/auth/password";
import {
  addOrganizationMember,
  assignOrganizationRole,
  assignOrganizationTeamMember,
  createOrganization,
  createOrganizationResponsibility,
  createOrganizationRole,
  createOrganizationTeam,
  loadOrganizationState,
  OrganizationForbiddenError,
  raiseOrganizationDisagreement,
  recordOrganizationContextEvidence,
  recordOrganizationIssue,
  resolveOrganizationDisagreement,
  resolveOrganizationIssue,
} from "../../features/organization/repository";
import { closeDatabaseForTests, db } from "../../lib/db/client";

async function resetDatabase() {
  await db()`TRUNCATE TABLE users, rate_limit_buckets RESTART IDENTITY CASCADE`;
}

function isForeignKeyViolation(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "23503"
  );
}

test("Phase 5 supports a governed collective machine without global people scores", async () => {
  process.env.AUTH_SIGNUP_MODE = "open";
  process.env.RAGFLOW_ASSIGN_BOOTSTRAP_DATASETS = "false";
  await resetDatabase();

  try {
    const passwordHash = await hashPassword("a strong organization password");
    const owner = await createAccount({ email: "owner@org.test", passwordHash });
    const member = await createAccount({ email: "member@org.test", passwordHash });
    const outsider = await createAccount({ email: "outsider@org.test", passwordHash });

    let ownerState = await createOrganization({
      name: "Clear Machine",
      purpose: "Make disagreement useful and responsibilities explicit.",
      userId: owner.userId,
    });
    const organization = ownerState.organizations[0];
    assert.ok(organization);
    const handle = organization.handle;
    assert.match(handle, /^org_[a-z0-9]{12,32}$/);
    assert.equal(organization.membershipRole, "owner");
    assert.equal((await loadOrganizationState(member.userId)).organizations.length, 0);

    ownerState = await addOrganizationMember({
      email: "member@org.test",
      handle,
      userId: owner.userId,
    });
    const memberStateAfterJoin = await loadOrganizationState(member.userId);
    assert.equal(memberStateAfterJoin.organizations[0]?.membershipRole, "member");
    assert.deepEqual(
      ownerState.organizations[0]?.members.map((item) => item.email).sort(),
      ["member@org.test", "owner@org.test"]
    );

    await assert.rejects(
      createOrganizationRole({
        handle,
        name: "Unauthorized role",
        userId: member.userId,
      }),
      (error: unknown) => error instanceof OrganizationForbiddenError
    );
    await assert.rejects(
      addOrganizationMember({
        email: "outsider@org.test",
        handle,
        userId: member.userId,
      }),
      (error: unknown) => error instanceof OrganizationForbiddenError
    );

    ownerState = await createOrganizationRole({
      decisionScope: "May decide engineering sequencing within the agreed Design.",
      handle,
      name: "Engineering Lead",
      purpose: "Own the engineering machine, not every task.",
      userId: owner.userId,
    });
    const role = ownerState.organizations[0]?.roles[0];
    assert.ok(role);

    ownerState = await createOrganizationResponsibility({
      expectedOutcome: "Trade-offs are explicit before execution begins.",
      handle,
      roleId: role.id,
      statement: "Make architecture trade-offs explicit.",
      userId: owner.userId,
    });
    ownerState = await assignOrganizationRole({
      email: "member@org.test",
      handle,
      roleId: role.id,
      userId: owner.userId,
    });
    assert.deepEqual(ownerState.organizations[0]?.roles[0]?.memberEmails, [
      "member@org.test",
    ]);
    assert.equal(
      ownerState.organizations[0]?.roles[0]?.responsibilities[0]?.statement,
      "Make architecture trade-offs explicit."
    );

    ownerState = await createOrganizationTeam({
      handle,
      name: "Product Engineering",
      purpose: "Turn diagnosed problems into tested machine changes.",
      userId: owner.userId,
    });
    const team = ownerState.organizations[0]?.teams[0];
    assert.ok(team);
    ownerState = await assignOrganizationTeamMember({
      email: "member@org.test",
      handle,
      teamId: team.id,
      userId: owner.userId,
    });
    assert.deepEqual(ownerState.organizations[0]?.teams[0]?.memberEmails, [
      "member@org.test",
    ]);

    let memberState = await recordOrganizationIssue({
      handle,
      observedReality: "Three releases waited for the owner to approve routine sequencing.",
      tension: "The stated delegation design is not matching actual decision flow.",
      title: "Routine sequencing still escalates",
      userId: member.userId,
    });
    const issue = memberState.organizations[0]?.issues[0];
    assert.ok(issue);
    assert.equal(issue.createdByEmail, "member@org.test");

    memberState = await raiseOrganizationDisagreement({
      handle,
      issueId: issue.id,
      reasoning: "Two waits were caused by unclear acceptance criteria, not owner approval.",
      statement: "The issue overstates the approval bottleneck.",
      userId: member.userId,
    });
    const disagreement = memberState.organizations[0]?.issues[0]?.disagreements[0];
    assert.ok(disagreement);
    assert.equal(disagreement.raisedByEmail, "member@org.test");

    memberState = await recordOrganizationContextEvidence({
      context: "engineering sequencing",
      email: "member@org.test",
      evidenceAgainst: "One release still escalated a routine sequencing choice.",
      evidenceFor: "Two releases were sequenced independently with correct trade-offs.",
      handle,
      observation: "The member is increasingly reliable in this specific decision context.",
      userId: member.userId,
    });
    const contextEvidence = memberState.organizations[0]?.contextEvidence[0];
    assert.equal(contextEvidence?.subjectEmail, "member@org.test");
    assert.equal(contextEvidence?.createdByEmail, "member@org.test");

    await assert.rejects(
      resolveOrganizationIssue({
        handle,
        issueId: issue.id,
        resolution: "Member should not be able to resolve this.",
        userId: member.userId,
      }),
      (error: unknown) => error instanceof OrganizationForbiddenError
    );

    ownerState = await resolveOrganizationDisagreement({
      disagreementId: disagreement.id,
      handle,
      resolution: "Separate acceptance-criteria failures from approval waits in future evidence.",
      userId: owner.userId,
    });
    ownerState = await resolveOrganizationIssue({
      handle,
      issueId: issue.id,
      resolution: "Clarify acceptance criteria and keep routine sequencing delegated.",
      userId: owner.userId,
    });
    assert.equal(ownerState.organizations[0]?.issues[0]?.status, "resolved");
    assert.equal(
      ownerState.organizations[0]?.issues[0]?.disagreements[0]?.status,
      "resolved"
    );

    const profileRows = await db()`
      SELECT workspace_id
      FROM organization_profiles
      WHERE handle = ${handle}
    `;
    const organizationWorkspaceId = String(profileRows[0]?.workspace_id);
    const serialized = JSON.stringify(ownerState);
    assert.equal(serialized.includes(organizationWorkspaceId), false);
    assert.equal(serialized.includes(owner.userId), false);
    assert.equal(serialized.includes(member.userId), false);
    assert.equal(serialized.includes("workspaceId"), false);
    assert.equal(serialized.includes("userId"), false);
    assert.equal(serialized.includes("score"), false);
    assert.equal(serialized.includes("ranking"), false);

    const secondState = await createOrganization({
      name: "Other Machine",
      userId: owner.userId,
    });
    const secondOrganization = secondState.organizations.find(
      (item) => item.handle !== handle
    );
    assert.ok(secondOrganization);
    const withSecondRole = await createOrganizationRole({
      handle: secondOrganization.handle,
      name: "Other Role",
      userId: owner.userId,
    });
    const secondRole = withSecondRole.organizations
      .find((item) => item.handle === secondOrganization.handle)
      ?.roles[0];
    assert.ok(secondRole);

    await assert.rejects(
      db()`
        INSERT INTO organization_role_assignments (
          workspace_id, role_id, user_id, assigned_by_user_id
        ) VALUES (
          ${organizationWorkspaceId}::uuid,
          ${secondRole.id}::uuid,
          ${member.userId}::uuid,
          ${owner.userId}::uuid
        )
      `,
      isForeignKeyViolation
    );

    await assert.rejects(
      db()`
        INSERT INTO organization_context_evidence (
          workspace_id,
          subject_user_id,
          created_by_user_id,
          context,
          observation,
          evidence_for
        ) VALUES (
          ${organizationWorkspaceId}::uuid,
          ${outsider.userId}::uuid,
          ${owner.userId}::uuid,
          'forged cross-membership context',
          'This write must fail.',
          'No valid organization membership exists.'
        )
      `,
      isForeignKeyViolation
    );

    await assert.rejects(
      db()`
        INSERT INTO organization_profiles (workspace_id, handle)
        VALUES (${owner.workspaceId}::uuid, 'org_aaaaaaaaaaaa')
      `
    );
  } finally {
    await resetDatabase();
    await closeDatabaseForTests();
  }
});
