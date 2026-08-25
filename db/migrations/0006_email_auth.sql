ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

-- Accounts that predate email verification were already admitted by the app.
-- New accounts leave this nullable until the Brevo verification link is used.
UPDATE users
SET email_verified_at = created_at
WHERE email_verified_at IS NULL;

CREATE INDEX IF NOT EXISTS users_email_verification_idx
  ON users (email_verified_at)
  WHERE email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_verification_tokens_user_idx
  ON email_verification_tokens (user_id, expires_at DESC)
  WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
  ON password_reset_tokens (user_id, expires_at DESC)
  WHERE used_at IS NULL;
