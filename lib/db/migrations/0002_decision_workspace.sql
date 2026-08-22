ALTER TABLE "Decision"
  ADD COLUMN IF NOT EXISTS "councilAnalysis" text;

ALTER TABLE "Decision"
  ADD COLUMN IF NOT EXISTS "evidence" json;
