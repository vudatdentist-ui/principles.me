CREATE TABLE team_practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES organization_profiles(workspace_id) ON DELETE CASCADE,
  initiator uuid NOT NULL,
  partner uuid NOT NULL CHECK (partner <> initiator),
  scenario text NOT NULL CHECK (length(trim(scenario)) BETWEEN 1 AND 1200),
  -- Four immutable entries in participant order A, B, A, B. The switch
  -- between the two rounds advances the revision without adding an entry.
  replies text[] NOT NULL DEFAULT '{}',
  revision smallint NOT NULL DEFAULT 0 CHECK (revision BETWEEN 0 AND 5),
  CHECK (cardinality(replies) = revision - CASE WHEN revision >= 3 THEN 1 ELSE 0 END),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, initiator) REFERENCES workspace_memberships ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, partner) REFERENCES workspace_memberships ON DELETE CASCADE
);
CREATE INDEX team_practice_initiator_idx ON team_practice_sessions (initiator, created_at DESC);
CREATE INDEX team_practice_partner_idx ON team_practice_sessions (partner, created_at DESC);
