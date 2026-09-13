# Principles data retention and account lifecycle

**Status:** current application-level policy  
**Scope:** data owned by the Principles application. Provider-side retention must be governed separately by provider configuration/contracts.

## Principles

1. Keep data because it serves the evolution/history model, not because storage is cheap.
2. Do not use intimate user content for product analytics when semantic event metadata is sufficient.
3. A user must be able to export their data and delete their private Personal Workspace.
4. Shared Organization records cannot be silently erased if deletion would corrupt other members' history; identity may be pseudonymized instead.
5. Backups are recovery artifacts, not a second analytics store.

## Active-account retention

Durable product records — Goals, Reality/Observations, Problems, Diagnoses, Designs, Actions, Outcomes, Reflections, Principles and Learning Patterns — remain while the Personal Workspace exists because longitudinal history is core product functionality.

`activity_events` also remain with their Workspace and cascade when that Personal Workspace is deleted.

Product insights read event metadata only; they do not create a second copy of private content.

## Authentication lifecycle

Current application semantics:

- session cookie maximum age: 30 days;
- sessions also have a database expiry and may be revoked earlier;
- email verification tokens expire after 24 hours and are one-use;
- password-reset tokens expire after 1 hour and are one-use;
- successful password reset revokes active sessions.

Expired token-row cleanup may be added as an operational housekeeping job when volume warrants it; expiry is enforced even before physical cleanup.

## Account export

Authenticated export requires:

- an active session;
- trusted request origin;
- password re-authentication;
- rate limiting.

The export contains the user's personal durable evolution records and their own attributable Organization participation.

It excludes:

- password hashes;
- session hashes;
- email verification/reset token hashes;
- credentials/secrets;
- other members' email addresses;
- raw external private-RAG/live-web evidence chunks by default.

The response is `no-store` JSON attachment data.

## Account deletion

Deletion requires:

- active authenticated session;
- trusted request origin;
- exact `DELETE MY ACCOUNT` confirmation;
- password re-authentication;
- rate limiting.

Personal Workspace deletion is destructive and cascades through personal durable records.

The underlying user identity is disabled and pseudonymized rather than unconditionally hard-deleted because shared Organization records can hold foreign-key references to that person. Pseudonymization removes the original account email/password usability while preserving referential integrity for other members' shared history.

## Owned Organizations

If the deleting account created/owns Organization Workspaces, deletion stops with a conflict response unless the caller explicitly chooses to delete those owned Organizations too.

This prevents account deletion from silently destroying team data.

When an owned Organization is explicitly deleted, its Organization-scoped records cascade according to schema constraints.

Organization membership/history in Organizations not owned by the deleting user remains as shared organizational history, attached to the disabled pseudonymous identity where schema references require it.

## Production backups

Production deployment creates a PostgreSQL custom-format pre-migration dump in a separate backup volume.

The deployment script keeps the seven most recent pre-migration dumps. Retention is therefore release-count based rather than a fixed number of days.

Backups are for recovery. Do not query backup copies for analytics or operational convenience.

A backup is not considered sufficient evidence of recoverability until restore has been exercised. CI performs a dump → fresh database → `pg_restore` → schema verification drill; production deployment also verifies restoration of the fresh pre-migration snapshot before proceeding with migrations.

## External providers

Application deletion cannot by itself prove erasure from external model, email, search or RAG provider infrastructure. Before sensitive scale, operator/provider configuration and contractual retention must be reviewed for:

- LiteLLM/upstream model route;
- DeepSeek fallback;
- RAGFlow/private retrieval stores;
- Brave Search request handling;
- Brevo transactional email.

Do not state that provider-side deletion has occurred unless it has actually been executed/verified under that provider's controls.

## Product analytics and logs

Forbidden by default:

- raw Goal/Reality/Problem/Reflection/Principle content;
- prompt/model output;
- evidence chunks;
- email;
- credentials/tokens;
- Organization Issue/Disagreement prose.

See `docs/product/PRODUCT_MEASUREMENT.md` and `docs/operations/OBSERVABILITY.md`.

## Future housekeeping

When volume justifies scheduled retention tasks, they should be explicit and tested. Candidates include physical deletion of expired verification/reset tokens, revoked/expired sessions, and operational logs according to infrastructure policy.

Do not introduce silent content expiry for longitudinal product records without a separate product/data decision because history is part of the learning model.
