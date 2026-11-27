CREATE TABLE practice_cases (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  situation text NOT NULL CHECK (length(situation) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, id)
);

CREATE INDEX practice_cases_recent ON practice_cases (workspace_id, updated_at DESC, id);

-- A note is a case with no turns. Each turn stores one complete exchange.
CREATE TABLE practice_turns (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  case_id uuid NOT NULL,
  parent_id uuid,
  reply text CHECK (length(reply) BETWEEN 1 AND 2000),
  counterpart text NOT NULL CHECK (length(counterpart) BETWEEN 1 AND 3000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, case_id, id),
  FOREIGN KEY (workspace_id, case_id) REFERENCES practice_cases(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, case_id, parent_id) REFERENCES practice_turns(workspace_id, case_id, id) ON DELETE CASCADE,
  CHECK ((parent_id IS NULL) = (reply IS NULL))
);

CREATE UNIQUE INDEX practice_turns_one_opening ON practice_turns (case_id) WHERE parent_id IS NULL;
