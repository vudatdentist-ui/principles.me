DO $$ BEGIN
  CREATE TYPE "decision_status" AS ENUM ('draft', 'exploring', 'decided', 'review_due', 'reviewed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "judgment_confidence" AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "principle_status" AS ENUM ('active', 'revised', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "decision_principle_relation" AS ENUM ('suggested', 'applied', 'challenged', 'created', 'adopted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "decision_outcome_verdict" AS ENUM ('positive', 'mixed', 'negative', 'too_early');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Decision" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "question" text NOT NULL,
  "context" text,
  "objective" text,
  "status" "decision_status" NOT NULL DEFAULT 'draft',
  "decidedAt" timestamp,
  "reviewAt" timestamp,
  "reviewedAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "Decision_user_idx" ON "Decision" ("userId");
CREATE INDEX IF NOT EXISTS "Decision_user_status_idx" ON "Decision" ("userId", "status");

CREATE TABLE IF NOT EXISTS "Judgment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "decisionId" uuid NOT NULL REFERENCES "Decision"("id") ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "summary" text NOT NULL,
  "selectedOption" text,
  "rationale" text,
  "confidence" "judgment_confidence",
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "Judgment_decision_idx" ON "Judgment" ("decisionId");
CREATE INDEX IF NOT EXISTS "Judgment_user_idx" ON "Judgment" ("userId");

CREATE TABLE IF NOT EXISTS "Principle" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "sourceDecisionId" uuid REFERENCES "Decision"("id") ON DELETE SET NULL,
  "statement" text NOT NULL,
  "description" text,
  "revision" integer NOT NULL DEFAULT 1,
  "status" "principle_status" NOT NULL DEFAULT 'active',
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "Principle_source_decision_idx" ON "Principle" ("sourceDecisionId");
CREATE INDEX IF NOT EXISTS "Principle_user_status_idx" ON "Principle" ("userId", "status");

CREATE TABLE IF NOT EXISTS "DecisionPrinciple" (
  "decisionId" uuid NOT NULL REFERENCES "Decision"("id") ON DELETE CASCADE,
  "principleId" uuid NOT NULL REFERENCES "Principle"("id") ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "relation" "decision_principle_relation" NOT NULL DEFAULT 'applied',
  "createdAt" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("decisionId", "principleId")
);

CREATE INDEX IF NOT EXISTS "DecisionPrinciple_principle_idx" ON "DecisionPrinciple" ("principleId");
CREATE INDEX IF NOT EXISTS "DecisionPrinciple_user_idx" ON "DecisionPrinciple" ("userId");

CREATE TABLE IF NOT EXISTS "DecisionOutcome" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "decisionId" uuid NOT NULL REFERENCES "Decision"("id") ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "result" text NOT NULL,
  "lessons" text,
  "verdict" "decision_outcome_verdict" NOT NULL DEFAULT 'too_early',
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "DecisionOutcome_decision_idx" ON "DecisionOutcome" ("decisionId");
CREATE INDEX IF NOT EXISTS "DecisionOutcome_user_idx" ON "DecisionOutcome" ("userId");
