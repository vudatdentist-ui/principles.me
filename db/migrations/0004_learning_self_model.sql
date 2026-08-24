CREATE TABLE IF NOT EXISTS learning_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  origin_ai_suggestion_id uuid,
  kind text NOT NULL
    CHECK (kind IN (
      'recurring_pattern',
      'design_learning',
      'principle_effectiveness',
      'constraint_hypothesis'
    )),
  statement text NOT NULL,
  implication text NOT NULL,
  supporting_evidence text,
  contradicting_evidence text,
  uncertainty text,
  confidence double precision
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  acceptance_state text NOT NULL
    CHECK (acceptance_state IN ('accepted', 'revised')),
  lifecycle_state text NOT NULL DEFAULT 'active'
    CHECK (lifecycle_state IN ('active', 'applied', 'challenged', 'retired')),
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  FOREIGN KEY (origin_ai_suggestion_id, workspace_id)
    REFERENCES ai_suggestions(id, workspace_id),
  CHECK (
    (lifecycle_state = 'applied' AND applied_at IS NOT NULL)
    OR (lifecycle_state <> 'applied' AND applied_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS learning_patterns_workspace_created_idx
  ON learning_patterns (workspace_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS one_learning_pattern_per_ai_suggestion
  ON learning_patterns (workspace_id, origin_ai_suggestion_id)
  WHERE origin_ai_suggestion_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS learning_pattern_cases (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  pattern_id uuid NOT NULL,
  reflection_id uuid NOT NULL,
  goal_id uuid NOT NULL,
  problem_id uuid NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  PRIMARY KEY (workspace_id, pattern_id, reflection_id),
  UNIQUE (pattern_id, workspace_id, position),
  FOREIGN KEY (pattern_id, workspace_id)
    REFERENCES learning_patterns(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (reflection_id, workspace_id, goal_id, problem_id)
    REFERENCES reflections(id, workspace_id, goal_id, problem_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS learning_pattern_cases_workspace_reflection_idx
  ON learning_pattern_cases (workspace_id, reflection_id);

CREATE OR REPLACE FUNCTION require_completed_learning_reflection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM reflections
    WHERE id = NEW.reflection_id
      AND workspace_id = NEW.workspace_id
      AND goal_id = NEW.goal_id
      AND problem_id = NEW.problem_id
      AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Learning Pattern cases require completed matching Reflections'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS learning_pattern_cases_require_completed_reflection
  ON learning_pattern_cases;
CREATE TRIGGER learning_pattern_cases_require_completed_reflection
BEFORE INSERT OR UPDATE OF reflection_id, goal_id, problem_id
ON learning_pattern_cases
FOR EACH ROW
EXECUTE FUNCTION require_completed_learning_reflection();

CREATE OR REPLACE FUNCTION assert_learning_pattern_case_count(
  target_pattern uuid,
  target_workspace uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  case_count integer;
BEGIN
  SELECT count(*)::integer
    INTO case_count
  FROM learning_pattern_cases
  WHERE pattern_id = target_pattern
    AND workspace_id = target_workspace;

  IF case_count < 2 THEN
    RAISE EXCEPTION 'Learning Patterns require at least two distinct Reflection cases'
      USING ERRCODE = '23514';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION check_learning_pattern_case_count_from_pattern()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_learning_pattern_case_count(NEW.id, NEW.workspace_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION check_learning_pattern_case_count_from_case()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (
      SELECT 1
      FROM learning_patterns
      WHERE id = OLD.pattern_id
        AND workspace_id = OLD.workspace_id
    ) THEN
      PERFORM assert_learning_pattern_case_count(OLD.pattern_id, OLD.workspace_id);
    END IF;
    RETURN OLD;
  END IF;

  PERFORM assert_learning_pattern_case_count(NEW.pattern_id, NEW.workspace_id);

  IF TG_OP = 'UPDATE'
     AND (OLD.pattern_id <> NEW.pattern_id OR OLD.workspace_id <> NEW.workspace_id)
     AND EXISTS (
       SELECT 1
       FROM learning_patterns
       WHERE id = OLD.pattern_id
         AND workspace_id = OLD.workspace_id
     ) THEN
    PERFORM assert_learning_pattern_case_count(OLD.pattern_id, OLD.workspace_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS learning_patterns_require_two_cases ON learning_patterns;
CREATE CONSTRAINT TRIGGER learning_patterns_require_two_cases
AFTER INSERT OR UPDATE ON learning_patterns
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_learning_pattern_case_count_from_pattern();

DROP TRIGGER IF EXISTS learning_pattern_cases_keep_two_cases ON learning_pattern_cases;
CREATE CONSTRAINT TRIGGER learning_pattern_cases_keep_two_cases
AFTER INSERT OR UPDATE OR DELETE ON learning_pattern_cases
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_learning_pattern_case_count_from_case();

CREATE TABLE IF NOT EXISTS principle_learning_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  principle_id uuid NOT NULL,
  pattern_id uuid NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  previous_trigger text NOT NULL,
  previous_rule text NOT NULL,
  previous_rationale text,
  revised_trigger text NOT NULL,
  revised_rule text NOT NULL,
  revised_rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  UNIQUE (workspace_id, pattern_id),
  FOREIGN KEY (principle_id, workspace_id)
    REFERENCES principles(id, workspace_id),
  FOREIGN KEY (pattern_id, workspace_id)
    REFERENCES learning_patterns(id, workspace_id)
);

CREATE INDEX IF NOT EXISTS principle_learning_revisions_workspace_principle_idx
  ON principle_learning_revisions (workspace_id, principle_id, created_at DESC);

CREATE OR REPLACE FUNCTION require_active_learning_pattern_for_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM learning_patterns
    WHERE id = NEW.pattern_id
      AND workspace_id = NEW.workspace_id
      AND acceptance_state IN ('accepted', 'revised')
      AND lifecycle_state = 'active'
  ) THEN
    RAISE EXCEPTION 'Only active accepted Learning Patterns may revise Principles'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS principle_learning_revisions_require_active_pattern
  ON principle_learning_revisions;
CREATE TRIGGER principle_learning_revisions_require_active_pattern
BEFORE INSERT ON principle_learning_revisions
FOR EACH ROW
EXECUTE FUNCTION require_active_learning_pattern_for_revision();
