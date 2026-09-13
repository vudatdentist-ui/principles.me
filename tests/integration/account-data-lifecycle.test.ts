import assert from "node:assert/strict";
import test from "node:test";
import { POST as deleteAccountRoute } from "../../app/api/account/delete/route";
import { POST as exportAccountRoute } from "../../app/api/account/export/route";
import {
  deleteAccountData,
  exportAccountData,
  OwnedOrganizationsRequireConfirmationError,
} from "../../features/account/repository";
import { hashPassword } from "../../features/auth/password";
import {
  createAccount,
  createSession,
} from "../../features/auth/repository";
import { createGoal } from "../../features/kernel/repository";
import { closeDatabaseForTests, db } from "../../lib/db/client";

async function resetDatabase() {
  await db()`TRUNCATE TABLE users, rate_limit_buckets RESTART IDENTITY CASCADE`;
}

function accountRequest(
  path: string,
  sessionToken: string,
  body: Record<string, unknown>,
  origin = "http://127.0.0.1:3000",
): Request {
  return new Request(`http://127.0.0.1:3000${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `principles_session=${encodeURIComponent(sessionToken)}`,
      origin,
    },
    body: JSON.stringify(body),
  });
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
    assert.equal(
      String(userRows[0]?.email).includes("privacy-owner@example.com"),
      false,
    );
    assert.match(String(userRows[0]?.password_hash), /^deleted\$/);
  } finally {
    await resetDatabase();
    await closeDatabaseForTests();
  }
});

test("account export/delete routes enforce origin, re-authentication and explicit confirmation", async () => {
  process.env.APP_ORIGIN = "http://127.0.0.1:3000";
  process.env.AUTH_SIGNUP_MODE = "open";
  process.env.RAGFLOW_ASSIGN_BOOTSTRAP_DATASETS = "false";
  await resetDatabase();
  try {
    const password = "route-test-password-with-enough-length";
    const account = await createAccount({
      email: "route-privacy@example.com",
      passwordHash: await hashPassword(password),
    });
    await createGoal({
      createdByUserId: account.userId,
      desiredState: "A route-level export goal.",
      workspaceId: account.workspaceId,
    });
    const sessionToken = await createSession(account.userId);

    const untrusted = await exportAccountRoute(
      accountRequest(
        "/api/account/export",
        sessionToken,
        { password },
        "https://evil.example",
      ),
    );
    assert.equal(untrusted.status, 403);

    const wrongPassword = await exportAccountRoute(
      accountRequest("/api/account/export", sessionToken, {
        password: "wrong-password",
      }),
    );
    assert.equal(wrongPassword.status, 401);

    const exported = await exportAccountRoute(
      accountRequest("/api/account/export", sessionToken, { password }),
    );
    assert.equal(exported.status, 200);
    assert.match(exported.headers.get("content-disposition") ?? "", /principles-export-/);
    const exportedText = await exported.text();
    assert.match(exportedText, /route-level export goal/i);
    assert.equal(exportedText.includes("password_hash"), false);
    assert.equal(exportedText.includes("token_hash"), false);

    const weakConfirmation = await deleteAccountRoute(
      accountRequest("/api/account/delete", sessionToken, {
        confirmation: "delete",
        deleteOwnedOrganizations: false,
        password,
      }),
    );
    assert.equal(weakConfirmation.status, 400);

    const deleted = await deleteAccountRoute(
      accountRequest("/api/account/delete", sessionToken, {
        confirmation: "DELETE MY ACCOUNT",
        deleteOwnedOrganizations: false,
        password,
      }),
    );
    assert.equal(deleted.status, 200);
    assert.match(deleted.headers.get("set-cookie") ?? "", /Max-Age=0/);

    const revoked = await exportAccountRoute(
      accountRequest("/api/account/export", sessionToken, { password }),
    );
    assert.equal(revoked.status, 401);
  } finally {
    await resetDatabase();
    await closeDatabaseForTests();
  }
});
