# Principles threat model

**Status:** current baseline  
**Scope:** production web application, personal/organization Workspaces, PostgreSQL, AI/evidence providers and deployment path.

## 1. Sensitive assets

Highest-sensitivity product data includes:

- identity/email and authentication state;
- Goals/Dreams and observed Reality;
- Problems, Diagnoses and Designs;
- Outcomes and Reflections;
- Principles and Learning Pattern hypotheses;
- organization membership, roles, Issues, Disagreements and contextual evidence;
- private retrieval bindings/evidence;
- provider and infrastructure credentials.

This data can expose personal intentions, perceived weaknesses, workplace conflict and inferred behavioral patterns. Privacy impact may be high even when the data is not legally classified as a special category.

## 2. Trust boundaries

```text
browser
  ↓ authenticated HTTPS
Next.js route boundary
  ↓ authorization / safe projection
application repositories
  ↓ workspace-scoped SQL / constraints
PostgreSQL

server → private RAGFlow
server → LiteLLM/OpenAI-compatible route / DeepSeek fallback
server → Brave public search
CI/GitHub → production VPS over SSH
```

Public live search receives only the public query. Private personal-history excerpts must not cross that boundary.

## 3. Primary threats and controls

### Account takeover

Threats: credential stuffing, brute force, session theft, reset-token theft.

Controls:

- scrypt password hashing with unique random salt;
- timing-safe password verification;
- sign-in/risky-action rate limits;
- opaque high-entropy session and reset tokens stored only as hashes;
- email verification;
- reset revokes active sessions;
- HttpOnly, SameSite=Lax and production Secure session cookie;
- sensitive export/deletion requires password re-authentication.

Residual risk: custom first-party auth has higher maintenance/security burden than a mature managed identity provider. Auth changes are a red zone and warrant human specialist review before meaningful scale.

### CSRF / cross-origin mutation

Threat: malicious origin submits authenticated mutations.

Controls:

- mutation routes use `assertTrustedOrigin`;
- SameSite=Lax session cookie;
- high-risk account routes explicitly enforce origin + re-authentication.

Rule: new authenticated mutation routes must follow the repository origin/session conventions.

### Cross-tenant access / IDOR

Threat: one user reads or mutates another Workspace's personal or organization records.

Controls:

- session resolves the owned Personal Workspace server-side;
- product repositories scope reads/writes by Workspace;
- composite foreign keys preserve same-Workspace provenance;
- Organization structural writes are role/owner governed;
- safe browser projections avoid exposing internal Workspace/evidence UUIDs when unnecessary;
- real-Postgres integration tests exercise isolation and cross-Workspace rejection.

Rule: never accept client `userId`/`workspaceId` as authorization.

### AI turning inference into durable truth

Threat: model hallucination or prompt influence silently creates authoritative personal/organization state.

Controls:

- AI suggestions are separate from accepted durable records;
- Problem/Diagnosis/Design/Principle paths preserve review/acceptance semantics;
- no autonomous durable AI writes;
- evidence, inference and user judgment stay semantically distinct;
- Principles remain revisable hypotheses.

### Prompt/data leakage to providers

Threat: private personal or organization history leaks to public search/logs/providers beyond intended context.

Controls:

- public live search receives only public query, not private RAG/personal-history excerpts;
- safe logging redacts content-shaped fields and AI instrumentation never logs prompt/output;
- product analytics uses only workspace/event/time metadata;
- external RAG/web evidence content is excluded from account export by default while provenance metadata may remain.

Residual risk: model/RAG providers still receive data required for their intended server-side function. Provider retention/contracts are an operational/legal concern outside application code and should be reviewed before sensitive production scale.

### Organization evidence misuse

Threat: contextual observations become covert employee scoring/profiling.

Controls:

- attributable evidence and disagreements;
- no global believability/employee score;
- no anonymous culture score;
- no fixed personality labels;
- contextual evidence remains inspectable and governed.

### Destructive account/data operation

Threat: accidental or malicious deletion destroys private/team history.

Controls:

- account deletion requires exact confirmation, re-authentication and rate limit;
- Personal Workspace deletion cascades deliberately;
- shared Organization history can preserve a disabled pseudonymous identity for referential integrity;
- Organizations owned by the deleting user require explicit additional confirmation before deletion;
- production takes a pre-migration backup and restore capability is exercised by CI/production deployment tooling.

### Migration/deployment failure

Threat: corrupt schema/data, wrong release, routing failure, unsafe rollback.

Controls:

- checksum-bound append-only migrations;
- pre-migration custom-format PostgreSQL dump;
- restore drill;
- canary + authenticated smoke;
- exact-SHA health verification;
- canonical routing verification;
- zero-downtime container swap.

### Secret exposure

Threat: committed credentials/private keys or logs leak secrets.

Controls:

- `.env.example` contains empty secret values;
- repository secret scanner blocks common token/key patterns and tracked secret-bearing filenames;
- GitHub secrets/server-owned production config supply runtime credentials;
- structured logger redacts credential-shaped fields;
- CodeQL and deterministic repository security gate run in CI.

## 4. Abuse cases to preserve as tests

High-value regression cases include:

- account B cannot read account A Goal/Reality/Problem/evidence;
- Organization member cannot perform owner-only structural mutation;
- cross-Organization references are rejected;
- password reset token is one-use/expiry-bound and revokes active sessions;
- direct URL/API access cannot bypass authorization;
- public search does not receive private context;
- Action completion cannot create/equate Outcome;
- export cannot contain password/session/reset hashes;
- deletion cannot silently delete owned Organizations;
- analytics/logs cannot select/store raw private content.

## 5. Security review tiers

### Low

Copy/layout changes without auth/data semantics: normal CI + browser review.

### Medium

New product writes, new provider integrations, non-destructive schema changes: full CI, CodeQL/security gate, domain isolation tests and independent review.

### High

Auth/session/password reset, authorization, account deletion, Organization privacy, secrets, production DB/migrations/backups: full gates plus explicit threat-model comparison and human security specialist review before substantial real-user scale.

Automated analysis is useful but is not a substitute for the high-tier human review.

## 6. Review cadence

Update this model when a change adds:

- new classes of personal/organization data;
- new external provider/data destination;
- new authentication factor/session mechanism;
- new organization permission model;
- new destructive/export flow;
- new production network/storage boundary.

Security findings should become permanent regression tests or mechanized checks whenever feasible.
