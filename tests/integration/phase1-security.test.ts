import assert from "node:assert/strict";
import test from "node:test";
import {
  createAccount,
  createSession,
  sessionContext,
  SignupClosedError,
  workspaceRagDatasetIds,
} from "../../features/auth/repository";
import { hashPassword } from "../../features/auth/password";
import {
  createAiSuggestion,
  createGoal,
  getGoal,
  listGoals,
} from "../../features/kernel/repository";
import {
  consumeRateLimit,
  workspaceRateScope,
} from "../../features/security/rate-limit";
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

test("Phase 1 keeps durable private state scoped to the authenticated workspace", async () => {
  process.env.AUTH_SIGNUP_MODE = "open";
  process.env.RAGFLOW_ASSIGN_BOOTSTRAP_DATASETS = "true";
  process.env.RAGFLOW_DATASET_IDS = "dataset-a,dataset-b";

  await resetDatabase();
  try {
    const passwordHash = await hashPassword("a strong integration password");
    const accountB = await createAccount({
      email: "owner-b@example.com",
      passwordHash,
    });
    const accountA = await createAccount({
      email: "owner-a@example.com",
      passwordHash,
    });

    assert.notEqual(accountA.workspaceId, accountB.workspaceId);
    assert.deepEqual(await workspaceRagDatasetIds(accountB.workspaceId), [
      "dataset-a",
      "dataset-b",
    ]);
    assert.deepEqual(await workspaceRagDatasetIds(accountA.workspaceId), []);

    process.env.AUTH_SIGNUP_MODE = "bootstrap";
    process.env.AUTH_BOOTSTRAP_SECRET = "correct-bootstrap-secret";
    await assert.rejects(
      createAccount({
        email: "should-not-exist@example.com",
        passwordHash,
        setupKey: "wrong-bootstrap-secret",
      }),
      (error: unknown) => error instanceof SignupClosedError
    );
    process.env.AUTH_SIGNUP_MODE = "open";

    // Even if a later feature or bad write adds this user to someone else's
    // Personal Workspace, the active Phase 1 session must resolve to the
    // Personal Workspace the user actually owns.
    await db()`
      INSERT INTO workspace_memberships (workspace_id, user_id, role)
      VALUES (${accountB.workspaceId}::uuid, ${accountA.userId}::uuid, 'member')
    `;

    const rawSessionToken = await createSession(accountA.userId);
    const context = await sessionContext(rawSessionToken);
    assert.equal(context?.workspace.id, accountA.workspaceId);
    assert.equal(context?.user.id, accountA.userId);

    const storedSession = await db()`
      SELECT token_hash FROM sessions WHERE user_id = ${accountA.userId}::uuid LIMIT 1
    `;
    assert.notEqual(String(storedSession[0]?.token_hash), rawSessionToken);
    assert.equal(String(storedSession[0]?.token_hash).includes(rawSessionToken), false);

    const goalA = await createGoal({
      createdByUserId: accountA.userId,
      desiredState: "Build a life with meaningful freedom.",
      workspaceId: accountA.workspaceId,
      whyItMatters: "Freedom and meaningful work",
    });
    await createGoal({
      createdByUserId: accountB.userId,
      desiredState: "A different private goal.",
      workspaceId: accountB.workspaceId,
    });

    assert.equal((await getGoal(accountA.workspaceId, goalA.id))?.id, goalA.id);
    assert.equal(await getGoal(accountB.workspaceId, goalA.id), null);
    const goalsB = await listGoals(accountB.workspaceId);
    assert.equal(goalsB.some((goal) => goal.id === goalA.id), false);

    const now = new Date("2026-08-23T16:00:00.000Z");
    const scopeKey = workspaceRateScope(accountA.workspaceId);
    assert.equal(
      (
        await consumeRateLimit({
          action: "integration.ask",
          limit: 2,
          now,
          scopeKey,
          windowSeconds: 3600,
        })
      ).allowed,
      true
    );
    assert.equal(
      (
        await consumeRateLimit({
          action: "integration.ask",
          limit: 2,
          now,
          scopeKey,
          windowSeconds: 3600,
        })
      ).allowed,
      true
    );
    assert.equal(
      (
        await consumeRateLimit({
          action: "integration.ask",
          limit: 2,
          now,
          scopeKey,
          windowSeconds: 3600,
        })
      ).allowed,
      false
    );

    await closeDatabaseForTests();
    assert.equal(
      (
        await consumeRateLimit({
          action: "integration.ask",
          limit: 2,
          now,
          scopeKey,
          windowSeconds: 3600,
        })
      ).allowed,
      false
    );

    const evidenceRowsA = await db()`
      INSERT INTO evidence_records (
        workspace_id,
        created_by_user_id,
        source_type,
        provider,
        title,
        content
      ) VALUES (
        ${accountA.workspaceId}::uuid,
        ${accountA.userId}::uuid,
        'user_statement',
        'user',
        'Observed experience',
        'A private experience used to support a possible principle.'
      )
      RETURNING id
    `;
    const evidenceIdA = String(evidenceRowsA[0]?.id);

    const evidenceRowsB = await db()`
      INSERT INTO evidence_records (
        workspace_id,
        created_by_user_id,
        source_type,
        provider,
        title,
        content
      ) VALUES (
        ${accountB.workspaceId}::uuid,
        ${accountB.userId}::uuid,
        'user_statement',
        'user',
        'Other private evidence',
        'Evidence owned by a different workspace.'
      )
      RETURNING id
    `;
    const evidenceIdB = String(evidenceRowsB[0]?.id);

    await assert.rejects(
      createAiSuggestion({
        evidenceIds: [evidenceIdB],
        kind: "principle_candidate",
        payload: { rule: "This provenance must be rejected." },
        requestedByUserId: accountA.userId,
        workspaceId: accountA.workspaceId,
      }),
      isForeignKeyViolation
    );

    const suggestionId = await createAiSuggestion({
      evidenceIds: [evidenceIdA],
      kind: "principle_candidate",
      modelName: "test-model",
      modelProvider: "test",
      payload: { rule: "Reflect before repeating the same response." },
      requestedByUserId: accountA.userId,
      workspaceId: accountA.workspaceId,
    });

    const suggestions = await db()`
      SELECT acceptance_state
      FROM ai_suggestions
      WHERE id = ${suggestionId}::uuid AND workspace_id = ${accountA.workspaceId}::uuid
    `;
    assert.equal(suggestions[0]?.acceptance_state, "pending");
    const suggestionEvidence = await db()`
      SELECT workspace_id, evidence_id
      FROM ai_suggestion_evidence
      WHERE suggestion_id = ${suggestionId}::uuid
    `;
    assert.equal(String(suggestionEvidence[0]?.workspace_id), accountA.workspaceId);
    assert.equal(String(suggestionEvidence[0]?.evidence_id), evidenceIdA);

    const activities = await db()`
      SELECT event_type
      FROM activity_events
      WHERE workspace_id = ${accountA.workspaceId}::uuid
    `;
    assert.ok(activities.some((event) => event.event_type === "workspace.created"));
  } finally {
    await resetDatabase();
    await closeDatabaseForTests();
  }
});
