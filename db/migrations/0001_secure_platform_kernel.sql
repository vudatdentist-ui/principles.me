CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_normalized text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('personal', 'organization')),
  name text NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_personal_workspace_per_creator
  ON workspaces (created_by_user_id)
  WHERE kind = 'personal';

CREATE TABLE IF NOT EXISTS workspace_memberships (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS workspace_memberships_user_idx
  ON workspace_memberships (user_id, workspace_id);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_active_idx
  ON sessions (user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS workspace_evidence_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('ragflow')),
  external_id text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider, external_id)
);

CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  desired_state text NOT NULL,
  why_it_matters text,
  status text NOT NULL DEFAULT 'discovering'
    CHECK (status IN ('discovering', 'chosen', 'paused', 'completed', 'retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id)
);

CREATE INDEX IF NOT EXISTS goals_workspace_idx
  ON goals (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS evidence_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id uuid REFERENCES users(id),
  source_type text NOT NULL
    CHECK (source_type IN ('user_statement', 'private_rag', 'live_web', 'activity', 'system')),
  provider text NOT NULL,
  external_ref text,
  title text,
  content text NOT NULL,
  source_url text,
  published_at timestamptz,
  observed_at timestamptz,
  retrieved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id)
);

CREATE INDEX IF NOT EXISTS evidence_records_workspace_idx
  ON evidence_records (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id uuid REFERENCES users(id),
  statement text NOT NULL,
  acceptance_state text NOT NULL DEFAULT 'accepted'
    CHECK (acceptance_state IN ('proposed', 'accepted', 'rejected', 'revised')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id)
);

CREATE INDEX IF NOT EXISTS observations_workspace_idx
  ON observations (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS observation_evidence (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  observation_id uuid NOT NULL,
  evidence_id uuid NOT NULL,
  PRIMARY KEY (workspace_id, observation_id, evidence_id),
  FOREIGN KEY (observation_id, workspace_id)
    REFERENCES observations(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (evidence_id, workspace_id)
    REFERENCES evidence_records(id, workspace_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  goal_id uuid,
  happened text NOT NULL,
  expected text,
  surprise text,
  learning text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  FOREIGN KEY (goal_id, workspace_id)
    REFERENCES goals(id, workspace_id)
);

CREATE INDEX IF NOT EXISTS reflections_workspace_idx
  ON reflections (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS principles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  trigger text NOT NULL,
  rule text NOT NULL,
  rationale text,
  lifecycle_state text NOT NULL DEFAULT 'candidate'
    CHECK (lifecycle_state IN ('candidate', 'testing', 'trusted', 'challenged', 'revised', 'retired')),
  acceptance_state text NOT NULL DEFAULT 'pending'
    CHECK (acceptance_state IN ('pending', 'accepted', 'rejected', 'revised')),
  confidence double precision CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  last_challenged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id)
);

CREATE INDEX IF NOT EXISTS principles_workspace_idx
  ON principles (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS principle_evidence (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  principle_id uuid NOT NULL,
  evidence_id uuid NOT NULL,
  PRIMARY KEY (workspace_id, principle_id, evidence_id),
  FOREIGN KEY (principle_id, workspace_id)
    REFERENCES principles(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (evidence_id, workspace_id)
    REFERENCES evidence_records(id, workspace_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  requested_by_user_id uuid REFERENCES users(id),
  kind text NOT NULL,
  payload jsonb NOT NULL,
  acceptance_state text NOT NULL DEFAULT 'pending'
    CHECK (acceptance_state IN ('pending', 'accepted', 'rejected', 'revised')),
  model_provider text,
  model_name text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id)
);

CREATE INDEX IF NOT EXISTS ai_suggestions_workspace_idx
  ON ai_suggestions (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_suggestion_evidence (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  suggestion_id uuid NOT NULL,
  evidence_id uuid NOT NULL,
  PRIMARY KEY (workspace_id, suggestion_id, evidence_id),
  FOREIGN KEY (suggestion_id, workspace_id)
    REFERENCES ai_suggestions(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (evidence_id, workspace_id)
    REFERENCES evidence_records(id, workspace_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id),
  event_type text NOT NULL,
  subject_type text,
  subject_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  happened_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_events_workspace_time_idx
  ON activity_events (workspace_id, happened_at DESC);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  scope_key text NOT NULL,
  action text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL CHECK (count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_key, action, window_start)
);
