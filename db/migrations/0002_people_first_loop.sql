ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS accepted_tradeoffs text,
  ADD COLUMN IF NOT EXISTS non_negotiables text,
  ADD COLUMN IF NOT EXISTS success_conditions text,
  ADD COLUMN IF NOT EXISTS measures text;

ALTER TABLE observations
  ADD COLUMN IF NOT EXISTS goal_id uuid;

ALTER TABLE observations
  ADD CONSTRAINT observations_goal_workspace_fk
  FOREIGN KEY (goal_id, workspace_id)
  REFERENCES goals(id, workspace_id);

CREATE INDEX IF NOT EXISTS observations_workspace_goal_idx
  ON observations (workspace_id, goal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  goal_id uuid NOT NULL,
  origin_ai_suggestion_id uuid,
  statement text NOT NULL,
  gap text,
  status text NOT NULL DEFAULT 'recognized'
    CHECK (status IN ('recognized', 'resolved', 'retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  UNIQUE (id, workspace_id, goal_id),
  FOREIGN KEY (goal_id, workspace_id)
    REFERENCES goals(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (origin_ai_suggestion_id, workspace_id)
    REFERENCES ai_suggestions(id, workspace_id)
);

CREATE INDEX IF NOT EXISTS problems_workspace_goal_idx
  ON problems (workspace_id, goal_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS one_problem_per_ai_suggestion
  ON problems (workspace_id, origin_ai_suggestion_id)
  WHERE origin_ai_suggestion_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS problem_evidence (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  problem_id uuid NOT NULL,
  evidence_id uuid NOT NULL,
  PRIMARY KEY (workspace_id, problem_id, evidence_id),
  FOREIGN KEY (problem_id, workspace_id)
    REFERENCES problems(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (evidence_id, workspace_id)
    REFERENCES evidence_records(id, workspace_id) ON DELETE CASCADE
);

ALTER TABLE reflections
  ADD COLUMN IF NOT EXISTS problem_id uuid,
  ADD COLUMN IF NOT EXISTS recurring boolean,
  ADD COLUMN IF NOT EXISTS recurrence_note text;

ALTER TABLE reflections
  ADD CONSTRAINT reflections_problem_goal_workspace_fk
  FOREIGN KEY (problem_id, workspace_id, goal_id)
  REFERENCES problems(id, workspace_id, goal_id);

ALTER TABLE principles
  ADD COLUMN IF NOT EXISTS origin_reflection_id uuid,
  ADD COLUMN IF NOT EXISTS origin_ai_suggestion_id uuid;

ALTER TABLE principles
  ADD CONSTRAINT principles_origin_reflection_workspace_fk
  FOREIGN KEY (origin_reflection_id, workspace_id)
  REFERENCES reflections(id, workspace_id);

ALTER TABLE principles
  ADD CONSTRAINT principles_origin_ai_suggestion_workspace_fk
  FOREIGN KEY (origin_ai_suggestion_id, workspace_id)
  REFERENCES ai_suggestions(id, workspace_id);

CREATE UNIQUE INDEX IF NOT EXISTS one_principle_per_ai_suggestion
  ON principles (workspace_id, origin_ai_suggestion_id)
  WHERE origin_ai_suggestion_id IS NOT NULL;
