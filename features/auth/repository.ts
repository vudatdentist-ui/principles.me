import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db/client";
import type { SessionContext } from "./contracts";
import { signupMode } from "./contracts";

const SESSION_DAYS = 30;

export class SignupClosedError extends Error {}
export class EmailAlreadyExistsError extends Error {}

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function configuredBootstrapDatasets(
  env: Readonly<Record<string, string | undefined>> = process.env
): string[] {
  if (env.RAGFLOW_ASSIGN_BOOTSTRAP_DATASETS?.trim().toLowerCase() === "false") {
    return [];
  }
  return (env.RAGFLOW_DATASET_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "23505"
  );
}

export async function signupAvailable(): Promise<boolean> {
  return signupMode(process.env.AUTH_SIGNUP_MODE) !== "disabled";
}

export async function createAccount(input: {
  email: string;
  passwordHash: string;
}): Promise<{ userId: string; workspaceId: string }> {
  const sql = db();
  const mode = signupMode(process.env.AUTH_SIGNUP_MODE);

  try {
    return await sql.begin(async (transaction) => {
      await transaction`SELECT pg_advisory_xact_lock(hashtext('principles.signup'))`;
      if (mode === "disabled") {
        throw new SignupClosedError();
      }

      const users = await transaction`
        INSERT INTO users (email, email_normalized, password_hash)
        VALUES (${input.email.trim()}, ${normalizedEmail(input.email)}, ${input.passwordHash})
        RETURNING id
      `;
      const userId = String(users[0]?.id);

      const workspaces = await transaction`
        INSERT INTO workspaces (kind, name, created_by_user_id)
        VALUES ('personal', 'Personal', ${userId}::uuid)
        RETURNING id
      `;
      const workspaceId = String(workspaces[0]?.id);

      await transaction`
        INSERT INTO workspace_memberships (workspace_id, user_id, role)
        VALUES (${workspaceId}::uuid, ${userId}::uuid, 'owner')
      `;

      for (const datasetId of configuredBootstrapDatasets()) {
        await transaction`
          INSERT INTO workspace_evidence_sources (workspace_id, provider, external_id)
          VALUES (${workspaceId}::uuid, 'ragflow', ${datasetId})
          ON CONFLICT DO NOTHING
        `;
      }

      await transaction`
        INSERT INTO activity_events (
          workspace_id, actor_user_id, event_type, subject_type, subject_id
        ) VALUES (
          ${workspaceId}::uuid,
          ${userId}::uuid,
          'workspace.created',
          'workspace',
          ${workspaceId}::uuid
        )
      `;

      return { userId, workspaceId };
    });
  } catch (error) {
    if (error instanceof SignupClosedError) {
      throw error;
    }
    if (isUniqueViolation(error)) {
      throw new EmailAlreadyExistsError();
    }
    throw error;
  }
}

export async function findUserForSignin(email: string): Promise<{
  id: string;
  passwordHash: string;
} | null> {
  const rows = await db()`
    SELECT id, password_hash
    FROM users
    WHERE email_normalized = ${normalizedEmail(email)} AND status = 'active'
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    return null;
  }
  return { id: String(row.id), passwordHash: String(row.password_hash) };
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db()`
    INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES (${userId}::uuid, ${tokenHash(token)}, ${expiresAt})
  `;
  return token;
}

export async function revokeSession(token: string): Promise<void> {
  await db()`
    UPDATE sessions
    SET revoked_at = now()
    WHERE token_hash = ${tokenHash(token)} AND revoked_at IS NULL
  `;
}

export async function sessionContext(token: string): Promise<SessionContext | null> {
  if (!token) {
    return null;
  }
  const rows = await db()`
    SELECT
      s.id AS session_id,
      u.id AS user_id,
      u.email,
      w.id AS workspace_id,
      w.name AS workspace_name,
      w.kind AS workspace_kind
    FROM sessions s
    JOIN users u ON u.id = s.user_id AND u.status = 'active'
    JOIN workspace_memberships membership ON membership.user_id = u.id
    JOIN workspaces w ON w.id = membership.workspace_id
    WHERE
      s.token_hash = ${tokenHash(token)}
      AND s.revoked_at IS NULL
      AND s.expires_at > now()
      AND w.kind = 'personal'
      AND w.created_by_user_id = u.id
    ORDER BY w.created_at ASC
    LIMIT 1
  `;
  const row = rows[0];
  if (row?.workspace_kind !== "personal") {
    return null;
  }

  return {
    sessionId: String(row.session_id),
    user: { email: String(row.email), id: String(row.user_id) },
    workspace: {
      id: String(row.workspace_id),
      kind: "personal",
      name: String(row.workspace_name),
    },
  };
}

export async function workspaceRagDatasetIds(workspaceId: string): Promise<string[]> {
  // Keep deployment bootstrap configuration durable for workspaces created by
  // older releases. This repairs a missing binding without replacing any
  // workspace-specific sources that are already stored.
  for (const datasetId of configuredBootstrapDatasets()) {
    await db()`
      INSERT INTO workspace_evidence_sources (workspace_id, provider, external_id)
      SELECT ${workspaceId}::uuid, 'ragflow', ${datasetId}
      WHERE EXISTS (
        SELECT 1
        FROM workspaces
        WHERE id = ${workspaceId}::uuid AND kind = 'personal'
      )
      ON CONFLICT DO NOTHING
    `;
  }

  const rows = await db()`
    SELECT external_id
    FROM workspace_evidence_sources
    WHERE workspace_id = ${workspaceId}::uuid AND provider = 'ragflow'
    ORDER BY created_at ASC
  `;
  return rows.map((row) => String(row.external_id));
}
