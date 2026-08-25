# Phase 5 Architecture — Principles for Organizations

**Status:** Complete  
**Date:** 2026-08-25  
**Merge:** `0fa12577636715437f3208e8289d71931433aa61`  
**Production deploy:** run `32844721161`  
**Baseline:** Phases 0–5 Complete on `main`

## 1. Goal achieved

Phase 5 extends the proven People kernel from a personal machine to a governed collective machine without turning Principles into HR software, a generic project manager, an org chart, or a people-scoring product.

A real group can now establish a bounded Organization Workspace, make its machine explicit, surface reality and disagreement, and preserve accountable governance:

```text
Organization
  → People / Roles / Responsibilities / Teams
  → observed Issues
  → explicit Disagreements
  → contextual track-record evidence
  → accountable resolution
```

The philosophical kernel remains:

```text
Goal → Reality → Problem → Diagnosis → Design → Actions
  → Outcome → Reflection → Principle → Learning → Evolve
```

Phase 5 adds collective actors and governance; it does not replace that loop.

## 2. Acceptance outcome

### Account entry — achieved

- normal account creation no longer exposes or accepts a Setup key;
- only explicit `AUTH_SIGNUP_MODE=disabled` closes signup;
- legacy `AUTH_SIGNUP_MODE=bootstrap` behaves as open instead of leaving production behind a hidden secret;
- signup still creates one owned Personal Workspace and preserves first-workspace RAG bootstrap behavior;
- origin checks, password requirements, rate limiting and session security remain intact.

### Organization boundary — achieved

- authenticated user can create an Organization Workspace and becomes its owner;
- browser/API identifiers use a safe `org_...` handle and do not expose the underlying Workspace UUID;
- a user can read only organizations in which they hold membership;
- structural writes are authorized before mutation;
- cross-organization role/team/member references are rejected by PostgreSQL constraints, not only application code.

### Collective machine — achieved

- owner can add an existing Principles account by email;
- owner can define roles with purpose and decision scope;
- owner can attach responsibilities to roles and assign roles to members;
- owner can create teams and assign members to teams;
- ordinary members cannot mutate membership, roles, responsibilities, role assignments, teams or team assignments.

### Reality, disagreement and contextual believability — achieved

- any organization member can record an Issue as observed reality plus tension;
- any organization member can raise an attributable Disagreement against an Issue;
- owners can resolve Issues and Disagreements while preserving original statements;
- members can record attributable, context-specific evidence about a member's relevant track record;
- contextual evidence stores observation, evidence-for and evidence-against and never produces a global score, ranking, personality label or fixed identity judgment;
- culture in v1 is observable through attributable Issues, Disagreements and contextual evidence rather than anonymous culture scoring.

### Client projection / UI — achieved

- `/organization` is authenticated and sparse;
- UI supports create/select organization, machine structure, issues/disagreements and contextual evidence without becoming a dashboard;
- Workspace UUIDs and User UUIDs are not projected to the browser; organization handles and member emails are used for client actions;
- People, Knowledge and Learning retain their existing private Personal Workspace behavior.

## 3. Domain model

The Organization Workspace remains a row in `workspaces(kind = 'organization')` so ownership, Activity Events and future kernel records keep the existing workspace boundary.

Phase 5 adds:

- `organization_profiles` — safe public handle and purpose for an Organization Workspace;
- `organization_roles` — named machine roles with purpose and decision scope;
- `organization_responsibilities` — durable responsibilities belonging to a role;
- `organization_role_assignments` — member ↔ role assignments;
- `organization_teams` and `organization_team_members` — minimal team structure;
- `organization_issues` — observed reality/tension records;
- `organization_disagreements` — attributable disagreement tied to an Issue;
- `organization_context_evidence` — context-specific evidence for/against a member's relevant track record, with no aggregate score.

`workspace_memberships.role` remains the authorization primitive for Phase 5 v1: `owner` controls machine structure; `member` participates in collective reality and disagreement.

## 4. Governance rules

```text
Owner
  create organization
  add member
  create role / responsibility
  assign role
  create team / assign team member
  resolve issue / disagreement
  + all member capabilities

Member
  read organization state
  record issue
  raise disagreement
  add attributable contextual evidence
```

There are no anonymous culture signals. Radical Transparency requires attribution, and authorization still precedes retrieval or mutation.

## 5. Privacy / believability boundary

Phase 5 explicitly does **not** create a global believability score.

A contextual evidence record means only:

> In context X, actor A recorded observation Y about member B, with evidence for and/or against the observation.

It does not mean:

> B has a universal numeric quality, fixed trait, or should be trusted in every context.

This leaves room for future context-aware decision support while keeping evidence inspectable, attributable and correctable.

## 6. Audit findings and fixes

The requested self-reinforcing loop found and corrected:

1. obsolete Setup-key unit coverage still importing the removed bootstrap module;
2. organization-switcher ARIA semantics rejected by repository lint/accessibility rules;
3. new Phase 5 CSS `!important` warning debt;
4. a Playwright locator that ambiguously matched both the visible member and a role-assignment `<option>`.

No review threads or review blockers remained at final merge.

## 7. Verification

Final pre-merge head `424764e8855d37c4b961ab968386dc409e0d7b85`:

- Foundation #189 ✅ — PostgreSQL 16, migrations 0001–0005, typecheck, unit tests, real-Postgres integration tests and production build;
- Lint #524 ✅;
- Playwright #291 ✅ — no Setup key, two-account Organization collaboration, member governance denial, Issue → Disagreement → contextual evidence → owner resolution, plus existing browser smoke.

Post-merge main `0fa12577636715437f3208e8289d71931433aa61`:

- Foundation #190 ✅;
- Lint #525 ✅;
- Playwright #292 ✅;
- production deploy run `32844721161` ✅.

Production proof:

- `DEPLOY_DATABASE_READY=1`;
- `DEPLOY_DATABASE_BACKUP_READY=1`;
- `MIGRATION_APPLIED=0005_organizations.sql`;
- `DEPLOY_MIGRATIONS_READY=1`;
- `AUTH_BOUNDARY_SMOKE=1`;
- `DEPLOY_CANARY_SMOKE=1`;
- `DEPLOY_INTERNAL_HEALTH=1`;
- `DEPLOY_PUBLIC_ROUTE_READY=1`;
- `DEPLOY_ZERO_DOWNTIME_SWAP=1`;
- public `/api/health` returned `status: ok` and exact version `0fa12577636715437f3208e8289d71931433aa61`.

## 8. Expected versus actual outcome

**Expected:** a real group can make its collective machine explicit, surface reality/disagreement and preserve accountable decision rights without reducing people to scores.

**Actual:** achieved. A real browser path creates two accounts without Setup key, creates an Organization, adds a member, proves owner/member permission separation, records an Issue and Disagreement, records contextual evidence, and lets the owner resolve the collective reality while preserving attribution. Real-Postgres tests separately prove cross-workspace constraints.

## 9. Scope limits after Phase 5

Deferred:

- email invite delivery / magic invitation links;
- SSO/SCIM and enterprise directory sync;
- arbitrary custom permission matrices;
- anonymous surveys or employee engagement/culture scoring;
- compensation/performance-management workflows;
- global people rankings;
- organizational AI pattern generation across unlimited history;
- Slack/CRM/finance/HR connectors;
- generic project/task management.

## 10. Next boundary

No next major phase is implied by completion of Phase 5. A future major phase requires an explicit product decision, a new goal/acceptance contract and the same execution/audit loop.

## 11. Execution loop used

```text
Understand requirements
  → lock goal / acceptance contract
  → implement
  → audit
  → compare against goal
  → fix gaps
  → re-audit
  → production verification
  → close source of truth
```
