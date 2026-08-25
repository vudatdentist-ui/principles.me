# Principles Major Phase Plan

**Status:** execution plan  
**Date:** 2026-08-25  
**Completed on `main`:** Phases 0–5  
**Next major phase:** **Not defined; requires an explicit product decision**

## Phase execution protocol

```text
Understand requirements
  → lock goal / acceptance criteria
  → implement
  → audit
  → compare against goal
  → fix gaps
  → re-audit
  → production verification
  → close source of truth
  → report
```

`Complete` means the phase is accepted/merged, production is verified when applicable, and source-of-truth reflects the actual outcome. `Ready` means implementation and verification are complete on a branch but merge has not happened.

## Program view

| Phase | Name | Status | Outcome |
| --- | --- | --- | --- |
| 0 | Kernel Definition | **Complete** | Shared product language, philosophical invariants, UI constraints and execution rules. |
| 1 | Secure Platform + Durable Kernel | **Complete** | Safe durable private state with authorization, provenance and bounded provider usage. |
| 2 | Principles for People — First Complete Loop | **Complete** | Goal → Reality → Problem → Reflection → Principle produces durable user-owned learning. |
| 3 | Design + Execution | **Complete** | Diagnosis → machine Design → Actions → Outcome → Review turns learning into observed machine change. |
| 4 | Learning Engine + Self Model | **Complete** | Longitudinal history produces useful, inspectable and correctable Pattern hypotheses that can improve a Principle. |
| 5 | Principles for Organizations | **Complete** | A governed collective machine makes responsibilities, reality, disagreement and contextual track record explicit without people scoring. |

---

# Phase 0 — Kernel Definition

**Status:** Complete

Established the Principles Kernel, Goal as chosen desired Reality rather than KPI CRUD, Evidence/interpretation distinction, Problem/Diagnosis/Design/Outcome/Reflection/Principle language, people/organizations as redesignable machines, AI roles, People-first thesis and minimal UI governance.

---

# Phase 1 — Secure Platform + Durable Kernel

**Status:** Complete  
**Merge:** `ce332d64db54c45d2c95a10c01aee50156e711d0`

Identity/session, Personal Workspace, PostgreSQL 16, tenant/provenance constraints, Activity Events, AI Suggestions, RAGFlow, authenticated Knowledge Q&A, Brave + DeepSeek, provider controls, safe client projection and deployment-safety foundations.

---

# Phase 2 — Principles for People: First Complete Loop

**Status:** Complete  
**Merge:** `601e0ef442bb3edc92bb3869c93ef1caa5089f81`

```text
Goal Discovery → Reality → Problem → Reflection → Principle Candidate
```

Goal Discovery is progressive and measures are optional. Reality is Goal-scoped Evidence + Observation. Problems and Principles remain AI-assisted but user-reviewed. Accepted Principles enter testing, never automatically trusted.

---

# Phase 3 — Design + Execution

**Status:** Complete  
**Merge:** `c30a2f8828f24fdb4c41a151e3d0fe0b483b13c8`

```text
Problem → Diagnosis → Design → Actions → Outcome → Review / Reflection
```

Diagnosis separates symptom/proximate/root-cause hypothesis and preserves evidence/uncertainty. Design changes the machine rather than becoming a task list. Actions only execute Design. Outcome compares expected vs actual Reality and evaluates the Design only after observed Reality exists. Post-Outcome Review becomes a linked Reflection.

---

# Phase 4 — Learning Engine + Self Model

**Status:** Complete  
**Merge:** `9bbabb1ecb90eba0a8cf518b69a77a8b4530a16d`  
**Production deploy:** run `32838276392`

## Objective

Make Principles compound value from the person's own durable history without converting AI inference into fixed truth about identity.

```text
History
  → Pattern hypothesis
  → inspect cases / evidence / counter-evidence / uncertainty
  → accept / revise / reject
  → optional Principle revision
  → test again
```

Delivered a correctable Self Model, bounded recent-history retrieval, ephemeral model keys, PostgreSQL recurring-pattern semantics, safe client projection and explicit Pattern→Principle revision that returns a Principle to testing.

Final pre-merge: Foundation #180 ✅ · Lint #515 ✅ · Playwright #282 ✅.  
Post-merge: Foundation #181 ✅ · Lint #516 ✅ · Playwright #283 ✅ · production `32838276392` ✅.

---

# Phase 5 — Principles for Organizations

**Status:** **Complete**  
**Merge:** `0fa12577636715437f3208e8289d71931433aa61`  
**Production deploy:** run `32844721161`

## Objective

Extend the proven People kernel from a personal machine to a collective machine without turning Principles into HR software, a generic org chart, project-management software or a people-scoring product.

```text
Organization
  → People / Roles / Responsibilities / Teams
  → observed Issues
  → explicit Disagreements
  → contextual track-record evidence
  → accountable resolution
```

## Delivered

### Account entry

- Setup key removed from normal signup UI and API;
- signup is open unless `AUTH_SIGNUP_MODE=disabled`;
- legacy `AUTH_SIGNUP_MODE=bootstrap` behaves as open instead of requiring a hidden secret;
- Personal Workspace creation, first-workspace RAG bootstrap behavior, origin checks, password rules, rate limits and session security remain intact.

### Organization boundary and governance

- authenticated user can create an Organization Workspace and becomes owner;
- safe `org_...` handle is projected instead of Workspace UUID;
- organization reads require membership;
- owner manages members, roles, responsibilities, role assignments, teams and team assignments;
- ordinary members cannot mutate machine structure;
- cross-organization role/team/member references are rejected by PostgreSQL constraints.

### Collective Reality

- any member can record an attributable Issue as observed reality + tension;
- any member can raise an attributable Disagreement tied to an Issue;
- owner can resolve Issues and Disagreements while preserving original statements;
- members can record context-specific evidence for/against another member's relevant track record;
- culture in v1 is represented through attributable Issues, Disagreements and contextual evidence rather than anonymous sentiment scoring.

### Believability boundary

Contextual evidence is evidence about a person **in a specific context**. It does not create a global score, ranking, personality label, clinical inference or fixed identity judgment.

### UI

`/organization` is an authenticated sparse secondary surface with progressive disclosure for Organization creation/selection, machine structure, Issues/Disagreements and contextual evidence. People, Knowledge and Learning keep their Personal Workspace behavior.

## Audit findings corrected

- stale Setup-key unit coverage importing the removed bootstrap module;
- organization switcher accessibility semantics rejected by lint rules;
- new Phase 5 CSS warning debt;
- an ambiguous browser assertion matching both a visible member and a role-assignment option.

## Verification

Final pre-merge head `424764e8855d37c4b961ab968386dc409e0d7b85`:

- Foundation #189 ✅ — PostgreSQL 16, migrations 0001–0005, typecheck, unit tests, real-Postgres integration and production build;
- Lint #524 ✅;
- Playwright #291 ✅ — Setup-key-free signup, two-account organization collaboration, member governance denial, Issue → Disagreement → contextual evidence → owner resolution and existing browser smoke.

Post-merge main `0fa12577636715437f3208e8289d71931433aa61`:

- Foundation #190 ✅;
- Lint #525 ✅;
- Playwright #292 ✅;
- production deploy run `32844721161` ✅;
- `MIGRATION_APPLIED=0005_organizations.sql` ✅;
- backup, migration, canary, internal health, public route, exact-SHA health and zero-downtime swap ✅.

## Expected versus actual outcome

**Expected:** a real group can make its collective machine explicit, surface reality/disagreement and preserve accountable decision rights without reducing people to scores.

**Actual:** achieved, merged and production-verified. A browser path creates two accounts without Setup key, creates an Organization, adds a member, proves owner/member permission separation, records an Issue and Disagreement, records contextual evidence, and lets the owner resolve the collective reality while preserving attribution.

## Limitations carried forward

- owner adds an existing Principles account by email; no invitation email/magic-link delivery;
- owner/member authorization only; no arbitrary permission matrix;
- `/organization` remains a secondary surface rather than a global workspace shell;
- no anonymous culture survey or culture score;
- no global people ranking;
- no organization-wide AI Pattern generation across unlimited history;
- no SSO/SCIM, compensation/performance-management workflows or structured business connectors;
- no generic project/task management.

---

# Next major phase

**Status:** Not defined.

Do not infer Phase 6. A new major phase requires an explicit product decision, a new goal/acceptance contract and the same execution/audit loop.

---

# Cross-phase invariants

- authorization before private retrieval/AI;
- evidence/provenance boundaries;
- observation ≠ inference;
- AI suggestion ≠ truth;
- contextual track record ≠ identity-level people score;
- Radical Transparency does not bypass authorization;
- public live search never receives private RAG excerpts;
- minimal UI without explanatory filler;
- database tenant/semantic invariants where practical;
- no resurrection of retired Council/V2 architecture without explicit product decision.
