CREATE TABLE IF NOT EXISTS organization_issue_kernel_links (
  workspace_id uuid NOT NULL REFERENCES organization_profiles(workspace_id) ON DELETE CASCADE,
  issue_id uuid NOT NULL,
  goal_id uuid NOT NULL,
  evidence_id uuid NOT NULL,
  observation_id uuid NOT NULL,
  problem_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, issue_id),
  UNIQUE (workspace_id, problem_id),
  FOREIGN KEY (issue_id, workspace_id)
    REFERENCES organization_issues(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (goal_id, workspace_id)
    REFERENCES goals(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (evidence_id, workspace_id)
    REFERENCES evidence_records(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (observation_id, workspace_id, goal_id)
    REFERENCES observations(id, workspace_id, goal_id) ON DELETE CASCADE,
  FOREIGN KEY (problem_id, workspace_id, goal_id)
    REFERENCES problems(id, workspace_id, goal_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS organization_issue_kernel_goal_idx
  ON organization_issue_kernel_links (workspace_id, goal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS organization_design_assignments (
  workspace_id uuid NOT NULL REFERENCES organization_profiles(workspace_id) ON DELETE CASCADE,
  design_id uuid NOT NULL,
  user_id uuid NOT NULL,
  assigned_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, design_id),
  FOREIGN KEY (design_id, workspace_id)
    REFERENCES designs(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, user_id)
    REFERENCES workspace_memberships(workspace_id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, assigned_by_user_id)
    REFERENCES workspace_memberships(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS organization_design_assignments_user_idx
  ON organization_design_assignments (workspace_id, user_id, created_at DESC);
