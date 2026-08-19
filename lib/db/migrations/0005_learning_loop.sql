CREATE TYPE "decision_review_quality" AS ENUM ('yes', 'no', 'unclear');
CREATE TYPE "reasoning_review_quality" AS ENUM ('yes', 'no', 'partially');
CREATE TYPE "assumption_review_verdict" AS ENUM ('correct', 'incorrect', 'unclear');
CREATE TYPE "principle_review_action" AS ENUM ('keep', 'revise', 'retire');

ALTER TABLE "DecisionOutcome" ADD COLUMN "decisionQuality" "decision_review_quality" DEFAULT 'unclear' NOT NULL;
ALTER TABLE "DecisionOutcome" ADD COLUMN "reasoningQuality" "reasoning_review_quality" DEFAULT 'partially' NOT NULL;

CREATE TABLE "DecisionAssumptionReview" (
  "assumptionText" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "decisionId" uuid NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "note" text,
  "outcomeId" uuid NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "userId" uuid NOT NULL,
  "verdict" "assumption_review_verdict" DEFAULT 'unclear' NOT NULL
);

CREATE TABLE "DecisionPrincipleReview" (
  "action" "principle_review_action" NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "decisionId" uuid NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "outcomeId" uuid NOT NULL,
  "previousRevision" integer NOT NULL,
  "previousStatement" text NOT NULL,
  "principleId" uuid NOT NULL,
  "resultingRevision" integer NOT NULL,
  "resultingStatement" text NOT NULL,
  "userId" uuid NOT NULL
);

ALTER TABLE "DecisionAssumptionReview" ADD CONSTRAINT "DecisionAssumptionReview_decisionId_Decision_id_fk" FOREIGN KEY ("decisionId") REFERENCES "public"."Decision"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "DecisionAssumptionReview" ADD CONSTRAINT "DecisionAssumptionReview_outcomeId_DecisionOutcome_id_fk" FOREIGN KEY ("outcomeId") REFERENCES "public"."DecisionOutcome"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "DecisionAssumptionReview" ADD CONSTRAINT "DecisionAssumptionReview_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "DecisionPrincipleReview" ADD CONSTRAINT "DecisionPrincipleReview_decisionId_Decision_id_fk" FOREIGN KEY ("decisionId") REFERENCES "public"."Decision"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "DecisionPrincipleReview" ADD CONSTRAINT "DecisionPrincipleReview_outcomeId_DecisionOutcome_id_fk" FOREIGN KEY ("outcomeId") REFERENCES "public"."DecisionOutcome"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "DecisionPrincipleReview" ADD CONSTRAINT "DecisionPrincipleReview_principleId_Principle_id_fk" FOREIGN KEY ("principleId") REFERENCES "public"."Principle"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "DecisionPrincipleReview" ADD CONSTRAINT "DecisionPrincipleReview_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "Decision_user_review_idx" ON "Decision" USING btree ("userId", "reviewAt");
CREATE INDEX "DecisionAssumptionReview_decision_idx" ON "DecisionAssumptionReview" USING btree ("decisionId");
CREATE INDEX "DecisionAssumptionReview_outcome_idx" ON "DecisionAssumptionReview" USING btree ("outcomeId");
CREATE INDEX "DecisionAssumptionReview_user_idx" ON "DecisionAssumptionReview" USING btree ("userId");
CREATE INDEX "DecisionPrincipleReview_decision_idx" ON "DecisionPrincipleReview" USING btree ("decisionId");
CREATE INDEX "DecisionPrincipleReview_outcome_idx" ON "DecisionPrincipleReview" USING btree ("outcomeId");
CREATE INDEX "DecisionPrincipleReview_principle_idx" ON "DecisionPrincipleReview" USING btree ("principleId");
CREATE INDEX "DecisionPrincipleReview_user_idx" ON "DecisionPrincipleReview" USING btree ("userId");
