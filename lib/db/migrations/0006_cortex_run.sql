CREATE TABLE "CortexRun" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL,
  "decisionId" uuid,
  "input" jsonb NOT NULL,
  "answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" varchar(16) NOT NULL,
  "clarification" jsonb,
  "result" jsonb,
  "evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "CortexRun_status_check" CHECK ("status" IN ('clarify', 'complete'))
);

ALTER TABLE "CortexRun" ADD CONSTRAINT "CortexRun_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "CortexRun_user_idx" ON "CortexRun" USING btree ("userId");
CREATE INDEX "CortexRun_user_updated_idx" ON "CortexRun" USING btree ("userId", "updatedAt");
