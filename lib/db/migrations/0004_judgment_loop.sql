ALTER TABLE "Decision" ADD COLUMN "principleCandidate" json;
ALTER TABLE "Judgment" ADD COLUMN "confidencePercent" integer;
ALTER TABLE "Judgment" ADD CONSTRAINT "Judgment_confidence_percent_check" CHECK ("confidencePercent" IS NULL OR ("confidencePercent" >= 0 AND "confidencePercent" <= 100));

CREATE TABLE "PrincipleRevision" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "principleId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "revision" integer NOT NULL,
  "statement" text NOT NULL,
  "description" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "PrincipleRevision_principleId_Principle_id_fk" FOREIGN KEY ("principleId") REFERENCES "public"."Principle"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "PrincipleRevision_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX "PrincipleRevision_principle_idx" ON "PrincipleRevision" USING btree ("principleId");
CREATE INDEX "PrincipleRevision_user_idx" ON "PrincipleRevision" USING btree ("userId");
CREATE UNIQUE INDEX "PrincipleRevision_principle_revision_unique" ON "PrincipleRevision" USING btree ("principleId", "revision");

INSERT INTO "PrincipleRevision" ("principleId", "userId", "revision", "statement", "description", "createdAt")
SELECT "id", "userId", "revision", "statement", "description", "createdAt"
FROM "Principle"
ON CONFLICT ("principleId", "revision") DO NOTHING;
