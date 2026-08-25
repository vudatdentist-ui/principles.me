CREATE OR REPLACE FUNCTION enforce_organization_profile_workspace()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM workspaces
    WHERE id = NEW.workspace_id
      AND kind = 'organization'
  ) THEN
    RAISE EXCEPTION 'organization profile requires an organization workspace';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS organization_profiles (
  workspace_id uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  handle text NOT NULL UNIQUE CHECK (handle ~ '^org_[a-z0-9]{12,32}$'),
  purpose text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS organization_profile_workspace_guard ON organization_profiles;
CREATE TRIGGER organization_profile_workspace_guard
BEFORE INSERT OR UPDATE OF workspace_id ON organization_profiles
FOR EACH ROW EXECUTE FUNCTION enforce_organization_profile_workspace();

CREATE TABLE IF NOT EXISTS organization_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES organization_profiles(workspace_id) ON DELETE CASCADE,
  name text NOT NULL,
  purpose text,
  decision_scope text,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS organization_responsibilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES organization_profiles(workspace_id) ON DELETE CASCADE,
  role_id uuid NOT NULL,
  statement text NOT NULL,
  expected_outcome text,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  FOREIGN KEY (role_id, workspace_id)
    REFERENCES organization_roles(id, workspace_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS organization_role_assignments (
  workspace_id uuid NOT NULL REFERENCES organization_profiles(workspace_id) ON DELETE CASCADE,
  role_id uuid NOT NULL,
  user_id uuid NOT NULL,
  assigned_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, role_id, user_id),
  FOREIGN KEY (role_id, workspace_id)
    REFERENCES organization_roles(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, user_id)
    REFERENCES workspace_memberships(workspace_id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS organization_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES organization_profiles(workspace_id) ON DELETE CASCADE,
  name text NOT NULL,
  purpose text,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS organization_team_members (
  workspace_id uuid NOT NULL REFERENCES organization_profiles(workspace_id) ON DELETE CASCADE,
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  assigned_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, team_id, user_id),
  FOREIGN KEY (team_id, workspace_id)
    REFERENCES organization_teams(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, user_id)
    REFERENCES workspace_memberships(workspace_id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS organization_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES organization_profiles(workspace_id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL,
  title text NOT NULL,
  observed_reality text NOT NULL,
  tension text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolution text,
  resolved_by_user_id uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  FOREIGN KEY (workspace_id, created_by_user_id)
    REFERENCES workspace_memberships(workspace_id, user_id),
  FOREIGN KEY (workspace_id, resolved_by_user_id)
    REFERENCES workspace_memberships(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS organization_issues_workspace_status_idx
  ON organization_issues (workspace_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS organization_disagreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES organization_profiles(workspace_id) ON DELETE CASCADE,
  issue_id uuid NOT NULL,
  raised_by_user_id uuid NOT NULL,
  statement text NOT NULL,
  reasoning text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolution text,
  resolved_by_user_id uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  FOREIGN KEY (issue_id, workspace_id)
    REFERENCES organization_issues(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, raised_by_user_id)
    REFERENCES workspace_memberships(workspace_id, user_id),
  FOREIGN KEY (workspace_id, resolved_by_user_id)
    REFERENCES workspace_memberships(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS organization_disagreements_issue_idx
  ON organization_disagreements (workspace_id, issue_id, created_at ASC);

CREATE TABLE IF NOT EXISTS organization_context_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES organization_profiles(workspace_id) ON DELETE CASCADE,
  subject_user_id uuid NOT NULL,
  created_by_user_id uuid NOT NULL,
  context text NOT NULL,
  observation text NOT NULL,
  evidence_for text,
  evidence_against text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  FOREIGN KEY (workspace_id, subject_user_id)
    REFERENCES workspace_memberships(workspace_id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, created_by_user_id)
    REFERENCES workspace_memberships(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS organization_context_evidence_subject_idx
  ON organization_context_evidence (workspace_id, subject_user_id, created_at DESC);
