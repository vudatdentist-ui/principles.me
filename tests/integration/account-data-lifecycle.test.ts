import assert from "node:assert/strict";
import test from "node:test";
import {
  deleteAccountData,
  exportAccountData,
  OwnedOrganizationsRequireConfirmationError,
} from "../../features/account/repository";
import { createAccount } from "../../features/auth/repository";
import { createGoal } from "../../features/kernel/repository";
import { closeDatabaseForTests, db } from "../../lib/db/client";

async function resetDatabase() {
  await db()`TRUNCATE TABLE users, rate_limit_buckets RESTART IDENTITY CASCADE`;
}

test("account export excludes credentials and deletion removes personal state while preserving safe tombstone identity", async () => {
  process.env.AUTH_SIGNUP_MODE = "open";
  process.env.RAGFLOW_ASSIGN_BOOTSTRAP_DATASETS = "false";
  await resetDatabase();
  try {
    const account = await createAccount({
      email: "privacy-owner@example.com",
      passwordHash: "test-only-hash",
    });
    await createGoal({
      createdByUserId: account.userId,
      desiredState: "A private goal that must be exportable and deletable.",
      workspaceId: account.workspaceId,
    });

    const exportData = await exportAccountData({
      userId: account.userId,
      workspaceId: account.workspaceId,
    });
    const serialized = JSON.stringify(exportData);
    assert.match(serialized, /privacy-owner@example\.com/);
    assert.match(serialized, /private goal that must be exportable/i);
    assert.equal(serialized.includes("password_hash"), false);
    assert.equal(serialized.includes("token_hash"), false);
    assert.equal(serialized.includes("test-only-hash"), false);

    const organizationRows = await db()`
      INSERT INTO workspaces (kind, name, created_by_user_id)
      VALUES ('organization', 'Owned org', ${account.userId}::uuid)
      RETURNING id
    `;
    const organizationId = String(organizationRows[0]?.id);
    await db()`
      INSERT INTO organization_profiles (workspace_id, handle, purpose)
      VALUES (${organizationId}::uuid, 'org_abcdefghijkl', 'Deletion boundary test')
    `;
    await db()`
      INSERT INTO workspace_memberships (workspace_id, user_id, role)
      VALUES (${organizationId}::uuid, ${account.userId}::uuid, 'owner')
    `;

    await assert.rejects(
      deleteAccountData({
        deleteOwnedOrganizations: false,
        userId: account.userId,
        workspaceId: account.workspaceId,
      }),
      (error: unknown) =>
        error instanceof OwnedOrganizationsRequireConfirmationError &&
        error.organizations.length === 1,
    );

    const deletion = await deleteAccountData({
      deleteOwnedOrganizations: true,
      userId: account.userId,
      workspaceId: account.workspaceId,
    });
    assert.equal(deletion.deletedOwnedOrganizations, 1);
    assert.equal(deletion.sharedOrganizationHistoryPreserved, true);

    const personalRows = await db()`
      SELECT id FROM workspaces WHERE id = ${account.workspaceId}::uuid
    `;
    assert.equal(personalRows.length, 0);
    const ownedOrganizationRows = await db()`
      SELECT id FROM workspaces WHERE id = ${organizationId}::uuid
    `;
    assert.equal(ownedOrganizationRows.length, 0);
    const userRows = await db()`
      SELECT email, email_normalized, password_hash, status
      FROM users
      WHERE id = ${account.userId}::uuid
    `;
    assert.equal(userRows[0]?.status, "disabled");
    assert.match(String(userRows[0]?.email), /^deleted\+/);
    assert.equal(String(userRows[0]?.email).includes("privacy-owner@example.com"), false);
    assert.match(String(userRows[0]?.password_hash), /^deleted\$/);
  } finally {
    await resetDatabase();
    await closeDatabaseForTests();
  }
});
