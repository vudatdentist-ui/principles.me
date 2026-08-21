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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "DecisionRun_decision_idx"
  ON "DecisionRun" USING btree ("decisionId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "DecisionRun_user_decision_idx"
  ON "DecisionRun" USING btree ("userId", "decisionId");
