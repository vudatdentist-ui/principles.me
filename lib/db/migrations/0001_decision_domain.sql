CREATE TABLE IF NOT EXISTS "Decision" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "title" text NOT NULL,
  "question" text NOT NULL,
  "context" text,
  "objective" text,
  "status" varchar NOT NULL DEFAULT 'open',
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "Judgment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "decisionId" uuid NOT NULL REFERENCES "Decision"("id"),
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "summary" text NOT NULL,
  "selectedOption" text,
  "rationale" text,
  "confidence" varchar,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "Principle" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "sourceDecisionId" uuid REFERENCES "Decision"("id"),
  "statement" text NOT NULL,
  "description" text,
  "status" varchar NOT NULL DEFAULT 'active',
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "DecisionPrinciple" (
  "decisionId" uuid NOT NULL REFERENCES "Decision"("id"),
  "principleId" uuid NOT NULL REFERENCES "Principle"("id"),
  "relation" varchar NOT NULL DEFAULT 'applied',
  PRIMARY KEY ("decisionId", "principleId")
);

CREATE TABLE IF NOT EXISTS "DecisionOutcome" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "decisionId" uuid NOT NULL REFERENCES "Decision"("id"),
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "result" text NOT NULL,
  "lessons" text,
  "verdict" varchar NOT NULL DEFAULT 'too_early',
  "createdAt" timestamp DEFAULT now() NOT NULL
);
