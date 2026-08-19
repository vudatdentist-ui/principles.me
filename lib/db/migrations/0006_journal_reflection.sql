CREATE TABLE "JournalEntry" (
  "body" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "occurredAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "userId" uuid NOT NULL
);

CREATE TABLE "JournalReflection" (
  "adoptedPrincipleId" uuid,
  "candidateId" uuid,
  "candidateRationale" text,
  "candidateStatement" text,
  "candidateStatus" varchar(16),
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "entryId" uuid NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "observation" text,
  "text" text NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "userId" uuid NOT NULL,
  CONSTRAINT "JournalReflection_candidate_status_check" CHECK ("candidateStatus" IS NULL OR "candidateStatus" IN ('pending', 'adopted', 'rejected'))
);

CREATE TABLE "JournalPrincipleLink" (
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "entryId" uuid NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "principleId" uuid NOT NULL,
  "reflectionId" uuid NOT NULL,
  "relation" varchar(16) DEFAULT 'origin' NOT NULL,
  "userId" uuid NOT NULL,
  CONSTRAINT "JournalPrincipleLink_relation_check" CHECK ("relation" IN ('origin', 'supports'))
);

ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "JournalReflection" ADD CONSTRAINT "JournalReflection_adoptedPrincipleId_Principle_id_fk" FOREIGN KEY ("adoptedPrincipleId") REFERENCES "public"."Principle"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "JournalReflection" ADD CONSTRAINT "JournalReflection_entryId_JournalEntry_id_fk" FOREIGN KEY ("entryId") REFERENCES "public"."JournalEntry"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "JournalReflection" ADD CONSTRAINT "JournalReflection_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "JournalPrincipleLink" ADD CONSTRAINT "JournalPrincipleLink_entryId_JournalEntry_id_fk" FOREIGN KEY ("entryId") REFERENCES "public"."JournalEntry"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "JournalPrincipleLink" ADD CONSTRAINT "JournalPrincipleLink_principleId_Principle_id_fk" FOREIGN KEY ("principleId") REFERENCES "public"."Principle"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "JournalPrincipleLink" ADD CONSTRAINT "JournalPrincipleLink_reflectionId_JournalReflection_id_fk" FOREIGN KEY ("reflectionId") REFERENCES "public"."JournalReflection"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "JournalPrincipleLink" ADD CONSTRAINT "JournalPrincipleLink_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "JournalEntry_user_occurred_idx" ON "JournalEntry" USING btree ("userId", "occurredAt");
CREATE UNIQUE INDEX "JournalReflection_entry_unique" ON "JournalReflection" USING btree ("entryId");
CREATE INDEX "JournalReflection_user_idx" ON "JournalReflection" USING btree ("userId");
CREATE INDEX "JournalPrincipleLink_principle_idx" ON "JournalPrincipleLink" USING btree ("principleId");
CREATE UNIQUE INDEX "JournalPrincipleLink_reflection_principle_unique" ON "JournalPrincipleLink" USING btree ("reflectionId", "principleId");
CREATE INDEX "JournalPrincipleLink_user_idx" ON "JournalPrincipleLink" USING btree ("userId");
