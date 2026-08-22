import postgres from "postgres";

const REQUIRED_DECISION_RUN_COLUMNS = [
  "id",
  "decisionId",
  "userId",
  "question",
  "contextSnapshot",
  "retrievalPlan",
  "evidenceSnapshot",
  "analysisSnapshot",
  "auditSnapshot",
  "decisionBrief",
  "model",
  "promptVersion",
  "startedAt",
  "completedAt",
  "failedAt",
  "errorCode",
];

class SafeSchemaError extends Error {}

function safeDatabaseError(error) {
  if (error instanceof SafeSchemaError) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const code = "code" in error && typeof error.code === "string" ? error.code : null;
    const name = "name" in error && typeof error.name === "string" ? error.name : null;
    return `Database operation failed (${code ?? name ?? "unknown"}).`;
  }

  return "Database operation failed (unknown).";
}

const connectionString = process.env.POSTGRES_URL?.trim();
if (!connectionString) {
  console.error("POSTGRES_URL is required for the V2 production schema check.");
  process.exit(1);
}

const sql = postgres(connectionString, {
  connect_timeout: 5,
  idle_timeout: 5,
  max: 1,
});

try {
  const [baseSchema] = await sql`
    SELECT
      to_regclass('public."User"') IS NOT NULL AS "userTable",
      to_regclass('public."Decision"') IS NOT NULL AS "decisionTable",
      to_regclass('public."DecisionRun"') IS NOT NULL AS "decisionRunTable"
  `;

  if (!baseSchema?.userTable || !baseSchema?.decisionTable) {
    throw new SafeSchemaError(
      "Base production schema is missing User or Decision; refusing automatic V2 schema repair."
    );
  }

  if (!baseSchema.decisionRunTable) {
    console.log("DecisionRun is missing; applying the additive V2 schema repair.");
    await sql.begin(async (transaction) => {
      await transaction.unsafe(`
        CREATE TABLE IF NOT EXISTS "DecisionRun" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "decisionId" uuid,
          "userId" uuid NOT NULL,
          "question" text NOT NULL,
          "contextSnapshot" json NOT NULL,
          "retrievalPlan" json NOT NULL,
          "evidenceSnapshot" json,
          "analysisSnapshot" json,
          "auditSnapshot" json,
          "decisionBrief" json,
          "model" text NOT NULL,
          "promptVersion" text NOT NULL,
          "startedAt" timestamp DEFAULT now() NOT NULL,
          "completedAt" timestamp,
          "failedAt" timestamp,
          "errorCode" text,
          CONSTRAINT "DecisionRun_userId_User_id_fk"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE cascade ON UPDATE no action,
          CONSTRAINT "DecisionRun_decisionId_Decision_id_fk"
            FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE set null ON UPDATE no action,
          CONSTRAINT "DecisionRun_completed_snapshot_check"
            CHECK (
              "completedAt" IS NULL OR (
                "evidenceSnapshot" IS NOT NULL
                AND "analysisSnapshot" IS NOT NULL
                AND "auditSnapshot" IS NOT NULL
                AND "decisionBrief" IS NOT NULL
              )
            ),
          CONSTRAINT "DecisionRun_decision_link_check"
            CHECK ("decisionId" IS NULL OR "completedAt" IS NOT NULL),
          CONSTRAINT "DecisionRun_failed_error_check"
            CHECK (
              ("failedAt" IS NULL AND "errorCode" IS NULL)
              OR ("failedAt" IS NOT NULL AND "errorCode" IS NOT NULL)
            ),
          CONSTRAINT "DecisionRun_terminal_state_check"
            CHECK (NOT ("completedAt" IS NOT NULL AND "failedAt" IS NOT NULL))
        )
      `);
      await transaction.unsafe(`
        CREATE INDEX IF NOT EXISTS "DecisionRun_decision_idx"
          ON "DecisionRun" USING btree ("decisionId")
      `);
      await transaction.unsafe(`
        CREATE INDEX IF NOT EXISTS "DecisionRun_user_decision_idx"
          ON "DecisionRun" USING btree ("userId", "decisionId")
      `);
    });
  }

  const columns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'DecisionRun'
  `;
  const presentColumns = new Set(columns.map((row) => row.column_name));
  const missingColumns = REQUIRED_DECISION_RUN_COLUMNS.filter(
    (column) => !presentColumns.has(column)
  );

  if (missingColumns.length > 0) {
    throw new SafeSchemaError(
      `DecisionRun exists but is missing required columns: ${missingColumns.join(", ")}.`
    );
  }

  console.log("V2 production schema is ready.");
} catch (error) {
  console.error(safeDatabaseError(error));
  process.exitCode = 1;
} finally {
  await sql.end();
}
