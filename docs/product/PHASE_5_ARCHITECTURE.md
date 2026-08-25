# Phase 5 Architecture — Principles for Organizations

**Status:** In progress  
**Date:** 2026-08-25  
**Branch:** `phase/5-organizations`  
**Baseline:** Phases 0–4 Complete on `main`

## 1. Goal

Extend the proven People kernel from a personal machine to a collective machine without turning Principles into HR software, a generic project manager, an org chart, or a people-scoring product.

The completed Phase 5 must let a real group establish a bounded Organization Workspace, make its machine explicit, surface reality and disagreement, and preserve accountable governance:

```text
Organization
  → People / Roles / Responsibilities / Teams
  → observed Issues
  → explicit Disagreements
  → contextual track-record evidence
  → machine changes with clear decision rights
```

The philosophical kernel remains:

```text
Goal → Reality → Problem → Diagnosis → Design → Actions
  → Outcome → Reflection → Principle → Learning → Evolve
```

Phase 5 adds collective actors and governance; it does not replace that loop.

## 2. Acceptance contract

Phase 5 is Ready only when all of the following are true.

### Account entry

- normal account creation no longer exposes or accepts a Setup key;
- legacy `AUTH_SIGNUP_MODE=bootstrap` does not leave production stuck behind a hidden secret; only explicit `disabled` closes signup;
- signup still creates one owned Personal Workspace and preserves the first-workspace RAG bootstrap behavior;
- origin checks, password requirements, rate limiting and session security remain intact.

### Organization boundary

- an authenticated user can create an Organization Workspace and becomes its owner;
- organization browser/API identifiers do not expose the underlying Workspace UUID;
- a user can only read an organization in which they hold membership;
- all structural writes are checked against membership before mutation;
- cross-organization role/team/member references are rejected by PostgreSQL constraints, not only application code.

### Collective machine

- an owner can add an existing Principles account by email;
- an owner can define roles with purpose and decision scope;
- an owner can attach responsibilities to roles and assign roles to members;
- an owner can create teams and assign members to teams;
- ordinary members cannot mutate membership, roles, responsibilities, role assignments, teams or team assignments.

### Reality, disagreement and contextual believability

- any organization member can record an Issue as observed reality plus the tension it creates;
- any organization member can raise an attributable Disagreement against an Issue;
- owners can resolve Issues and Disagreements while preserving the original statements;
- organization members can record attributable, context-specific evidence about a member's relevant track record;
- contextual evidence stores evidence-for, evidence-against and observation text; it never produces a global score, ranking, personality label or fixed identity judgment.

### Client projection / UI

- `/organization` is authenticated and sparse;
- the UI supports create/select organization, machine structure, issues/disagreements and contextual evidence without becoming a dashboard;
- Workspace UUIDs and User UUIDs are not projected to the browser; organization handles and member emails are used for client actions;
- People, Knowledge and Learning remain available and keep their existing private Personal Workspace behavior.

### Verification

- migration `0005_organizations.sql` applies on PostgreSQL 16 after migrations 0001–0004;
- unit/type/lint/build checks pass;
- real-Postgres integration tests prove owner/member authorization and cross-workspace constraints;
- Playwright proves no Setup key, multi-account organization collaboration, member governance denial, issue/disagreement flow and normal reload;
- after merge, production deploy applies migration 0005, canary/smoke pass, and public `/api/health` reports the exact merge SHA.

## 3. Domain model

The Organization Workspace remains a row in `workspaces(kind = 'organization')` so ownership, activity history and future kernel records keep the existing workspace boundary.

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

> B is an 8.2/10 person, has a fixed trait, or should be trusted everywhere.

The model is designed so future decision support can retrieve relevant track record by context while keeping the underlying evidence inspectable and correctable.

## 6. Scope limits

Deferred beyond Phase 5 v1:

- email invite delivery / magic invitation links;
- SSO/SCIM and enterprise directory sync;
- arbitrary custom permission matrices;
- anonymous surveys or employee engagement scoring;
- compensation/performance-management workflows;
- global people rankings;
- organizational AI pattern generation across unlimited history;
- Slack/CRM/finance/HR connectors;
- generic project/task management.

## 7. Execution loop

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
