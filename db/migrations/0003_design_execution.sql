CREATE TABLE IF NOT EXISTS diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  goal_id uuid NOT NULL,
  problem_id uuid NOT NULL,
  origin_ai_suggestion_id uuid,
  symptom text NOT NULL,
  proximate_cause text,
  root_cause_hypothesis text NOT NULL,
  supporting_evidence text,
  contradicting_evidence text,
  alternative_hypotheses text,
  uncertainty text,
  confidence double precision
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  acceptance_state text NOT NULL
    CHECK (acceptance_state IN ('accepted', 'revised')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  UNIQUE (id, workspace_id, goal_id, problem_id),
  FOREIGN KEY (goal_id, workspace_id)
    REFERENCES goals(id, workspace_id),
  FOREIGN KEY (problem_id, workspace_id, goal_id)
    REFERENCES problems(id, workspace_id, goal_id),
  FOREIGN KEY (origin_ai_suggestion_id, workspace_id)
    REFERENCES ai_suggestions(id, workspace_id)
);

CREATE INDEX IF NOT EXISTS diagnoses_workspace_problem_idx
  ON diagnoses (workspace_id, problem_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS one_diagnosis_per_ai_suggestion
  ON diagnoses (workspace_id, origin_ai_suggestion_id)
  WHERE origin_ai_suggestion_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS diagnosis_evidence (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  diagnosis_id uuid NOT NULL,
  evidence_id uuid NOT NULL,
  PRIMARY KEY (workspace_id, diagnosis_id, evidence_id),
  FOREIGN KEY (diagnosis_id, workspace_id)
    REFERENCES diagnoses(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (evidence_id, workspace_id)
    REFERENCES evidence_records(id, workspace_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  goal_id uuid NOT NULL,
  problem_id uuid NOT NULL,
  diagnosis_id uuid NOT NULL,
  origin_ai_suggestion_id uuid,
  machine_change text NOT NULL,
  rationale text NOT NULL,
  expected_result text NOT NULL,
  success_signal text NOT NULL,
  acceptance_state text NOT NULL
    CHECK (acceptance_state IN ('accepted', 'revised')),
  lifecycle_state text NOT NULL DEFAULT 'active'
    CHECK (lifecycle_state IN ('active', 'evaluated', 'retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  UNIQUE (id, workspace_id, goal_id, problem_id, diagnosis_id),
  FOREIGN KEY (goal_id, workspace_id)
    REFERENCES goals(id, workspace_id),
  FOREIGN KEY (problem_id, workspace_id, goal_id)
    REFERENCES problems(id, workspace_id, goal_id),
  FOREIGN KEY (diagnosis_id, workspace_id, goal_id, problem_id)
    REFERENCES diagnoses(id, workspace_id, goal_id, problem_id),
  FOREIGN KEY (origin_ai_suggestion_id, workspace_id)
    REFERENCES ai_suggestions(id, workspace_id)
);

CREATE INDEX IF NOT EXISTS designs_workspace_diagnosis_idx
  ON designs (workspace_id, diagnosis_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS one_design_per_ai_suggestion
  ON designs (workspace_id, origin_ai_suggestion_id)
  WHERE origin_ai_suggestion_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS execution_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  design_id uuid NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  commitment text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  UNIQUE (design_id, workspace_id, position),
  FOREIGN KEY (design_id, workspace_id)
    REFERENCES designs(id, workspace_id) ON DELETE CASCADE,
  CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status <> 'completed' AND completed_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS execution_actions_workspace_design_idx
  ON execution_actions (workspace_id, design_id, position);

CREATE UNIQUE INDEX IF NOT EXISTS observations_id_workspace_goal_unique
  ON observations (id, workspace_id, goal_id);

CREATE TABLE IF NOT EXISTS outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  goal_id uuid NOT NULL,
  problem_id uuid NOT NULL,
  diagnosis_id uuid NOT NULL,
  design_id uuid NOT NULL,
  evidence_id uuid NOT NULL,
  observation_id uuid NOT NULL,
  expected_result text NOT NULL,
  actual_result text NOT NULL,
  comparison text NOT NULL
    CHECK (comparison IN ('improved', 'mixed', 'worse', 'unclear')),
  observed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  UNIQUE (id, workspace_id, goal_id, problem_id),
  FOREIGN KEY (design_id, workspace_id, goal_id, problem_id, diagnosis_id)
    REFERENCES designs(id, workspace_id, goal_id, problem_id, diagnosis_id),
  FOREIGN KEY (evidence_id, workspace_id)
    REFERENCES evidence_records(id, workspace_id),
  FOREIGN KEY (observation_id, workspace_id, goal_id)
    REFERENCES observations(id, workspace_id, goal_id)
);

CREATE INDEX IF NOT EXISTS outcomes_workspace_design_idx
  ON outcomes (workspace_id, design_id, observed_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS reflections_id_workspace_goal_problem_unique
  ON reflections (id, workspace_id, goal_id, problem_id);

CREATE TABLE IF NOT EXISTS outcome_reflections (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  reflection_id uuid NOT NULL,
  outcome_id uuid NOT NULL,
  goal_id uuid NOT NULL,
  problem_id uuid NOT NULL,
  PRIMARY KEY (workspace_id, reflection_id),
  UNIQUE (workspace_id, outcome_id),
  FOREIGN KEY (reflection_id, workspace_id, goal_id, problem_id)
    REFERENCES reflections(id, workspace_id, goal_id, problem_id) ON DELETE CASCADE,
  FOREIGN KEY (outcome_id, workspace_id, goal_id, problem_id)
    REFERENCES outcomes(id, workspace_id, goal_id, problem_id) ON DELETE CASCADE
);
