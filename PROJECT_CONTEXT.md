# PROJECT CONTEXT — Principles

**Status:** Phase 6 — Product Recenter / Evolution Engine — **in progress / production**  
**Effective date:** 2026-09-14  
**Completed major phases:** 0–5  
**Current production UI recenter merge:** `cb88fa9dbfdb3ff9c0c8ed680868a818a1045cc8`  
**Next major phase after Phase 6:** **not defined**

This file is the current product/architecture source of truth. `AGENTS.md` is the short operating map. Historical Phase 1–5 architecture documents explain durable decisions but do not override this file or the current Phase 6 contract.

## 1. Mission

Principles is an **evolution system for people first and organizations second**.

The product is organized around three nested ideas:

```text
Dream + Reality + Determination → Successful Life

5 Steps to Get What You Want
Goal → Problem → Diagnosis → Design → Do

Pain + Reflection → Progress
```

They map onto one durable learning loop:

```text
Dream / Goal
  ↓
Reality
  ↓
Problem
  ↓
Diagnosis
  ↓
Design
  ↓
Actions / Do
  ↓
Outcome (observed Reality)
  ↓
Pain / Surprise
  ↓
Reflection
  ↓
Principle under test
  ↓
Learning Pattern
  ↓
Evolve ↺
```

The product is not a generic task manager, OKR dashboard, journal, CRM, HR suite, employee-ranking system, personality profiler, analytics dashboard or autonomous agent council.

## 2. Truth invariants

- Dream / desired Reality defines what matters; actual Reality informs the path.
- Goal, Problem, Diagnosis, Design, Action and Outcome remain distinct.
- Action completion is not evidence that the Design worked. Outcome requires observed Reality.
- Evidence/Observation are not the same as inference.
- AI output is never accepted truth solely because AI produced it.
- Pain/Outcome + Reflection should feed learning and future machine changes.
- Reflection may produce no Principle when evidence is insufficient.
- Principles are revisable hypotheses to test, not immutable rules.
- Self Model means evidence-backed, user-correctable Pattern hypotheses — not fixed identity labels.
- Radical Transparency requires attribution and inspectable evidence; it does not override authorization.
- Believability is contextual track-record evidence, not a global score or fixed judgment about a person.
- Product UI presents current Reality and the next meaningful action before internal ontology.
- Knowledge does not silently write durable personal/organization state.
- Product analytics and operational logs do not collect raw Goal, Reflection, Principle or prompt content.

## 3. Current product surfaces

Authenticated primary navigation is:

```text
Me · Organization · Knowledge · Learning
```

### Me

A person may pursue multiple Goals in parallel. Each Goal has an independent lineage through Reality → Problem → Diagnosis → Design → Do → Outcome → Reflection. The surface shows a compact goal portfolio and one detailed lane at a time.

The 5 Steps are an interactive execution backbone, not a decorative progress bar. Lived/current/upcoming steps remain inspectable while the next meaningful action retains priority.

### Organization

Organization extends the same truth model into a governed collective machine. Owners manage structure; members can record attributable Issues, Disagreements and contextual evidence. No anonymous culture score, global believability score, employee ranking or personality label exists.

### Knowledge

Knowledge is framed as `Think from principles.` Shared Principles knowledge, bounded personal context and public live search remain separately attributable. Public live search receives only the public query, never private personal-history excerpts. Knowledge is read-only with respect to durable personal state unless a future explicit confirmation contract is added.

### Learning

Learning is the longitudinal home for Principles, Reflections and Patterns. Principles are visible living hypotheses under test; recurring Patterns remain evidence-backed and correctable; evidence/counter-evidence/uncertainty are progressively disclosed.

## 4. Phase 6 delivery reality

Phase 6 started explicitly on 2026-09-08. It did not create a parallel `evolution_cycles` system of record. Existing goal-scoped durable records remain authoritative and are projected through `EvolutionState`.

Delivered tranches include:

- Phase 6 foundation: `EvolutionState` read projection and explicit contract;
- complete personal evolution orchestration over existing durable records;
- multi-goal Me surface and first-class manually-authored / reflection-distilled Principles;
- recentered Knowledge, Learning and Organization surfaces;
- editorial interaction system across Me / Organization / Knowledge / Learning / Auth;
- interactive 5 Steps explorer with lived/current/upcoming inspection, keyboard semantics and browser coverage;
- responsive/reduced-motion behavior;
- production exact-SHA deployment verification after the UI recenter.

Phase 6 remains the current phase until source-of-truth closeout explicitly declares it complete. Do not infer a Phase 7.

## 5. Product-learning boundary

Engineering correctness is no longer the only bottleneck. Product learning is measured from existing privacy-safe activity metadata rather than raw user text.

Current operator metrics:

```text
Activation       Goal → Reality → Problem in order
Time to insight  workspace.created → first Problem recognized
Reflection return
                 Reflection completed on at least two distinct days
Learning loop    Outcome reviewed → Principle accepted/revised
Stage reach      workspaces reaching each major evolution state
```

`pnpm product:insights 30` reads only `workspace_id`, `event_type` and `happened_at` from `activity_events`. These metrics are directional product-learning signals, not employee/user scores and not proof of user value by themselves.

See `docs/product/PRODUCT_MEASUREMENT.md`.

## 6. Production architecture

- first-party email/password identity and opaque hashed sessions;
- email verification and password recovery via Brevo;
- PostgreSQL 16 durable system of record;
- Workspace authorization/provenance constraints and safe browser projections;
- Organization Workspaces with owner/member governance;
- Activity Events and user-reviewed AI Suggestions;
- LiteLLM/OpenAI-compatible primary model path with DeepSeek fallback;
- RAGFlow private retrieval and optional Brave public search kept at separate privacy boundaries;
- checksum-bound append-only migrations and DB-aware health;
- self-contained production Node runtime;
- pre-migration DB backup, canary health/smoke, exact-SHA public deployment verification and zero-downtime swap.

Material repository changes must pass migration, typecheck, unit, real-Postgres integration, build, lint and Playwright gates. Hardening additionally requires secret scan, privacy/quality gate, backup restore drill and CodeQL.

## 7. Security / privacy boundaries

High-blast-radius surfaces are auth/session/password reset, tenant isolation, Organization governance/evidence, account deletion, migrations/backups/deploy and AI/provider credentials.

Current account data controls:

- authenticated export requires password re-authentication and rate limiting;
- export excludes password/session/token hashes and excludes raw external private-RAG/live-web chunks;
- account deletion requires exact destructive confirmation + password re-authentication;
- Personal Workspace data is deleted by cascade;
- a deleted identity is disabled and pseudonymized when shared Organization history must retain referential integrity;
- Organization Workspaces owned by the deleting user require an additional explicit deletion choice rather than being silently destroyed.

See `docs/security/THREAT_MODEL.md` and `docs/security/DATA_RETENTION.md`.

## 8. Observability boundary

Operational logging is structured JSON and metadata-only. Allowed examples include provider id, operation, latency, retryability, fallback use and readiness booleans. Logs must not contain raw prompts, questions, Goal/Reflection/Principle content, credentials, cookies, tokens or emails.

The health route remains the deployment liveness/readiness contract; provider fallback and DB-health failures produce structured events for diagnosis without user content.

See `docs/operations/OBSERVABILITY.md`.

## 9. Agent and review model

Agents execute inside repository/CI boundaries. They may decide routine implementation details but must not bypass durable invariants or failed verification.

A builder's own review is not an independent review. Material changes use independent/falsifying signals: compiler/types, deterministic tests, real PostgreSQL integration, browser E2E, repository quality/privacy gate, secret scanning, CodeQL and production exact-SHA checks. High-blast-radius changes additionally warrant human security review before meaningful scale.

See `AGENTS.md` and `docs/engineering/REVIEW_PROTOCOL.md`.

## 10. Current known limits / product questions

The main unresolved question is no longer whether the repository can implement the kernel safely. It is whether the system creates enough user value to change behavior and earn return usage.

Current priorities are therefore:

1. learn from activation/return/core-loop evidence without collecting intimate content;
2. improve the product where real use shows friction;
3. preserve runtime/security evidence and regression protection;
4. resist adding major architecture/modules until user evidence justifies them.

Additional enterprise scope — SSO/SCIM, arbitrary permissions, HR/compensation workflows, anonymous culture surveys, people ranking, generic project management and broad business connectors — remains deferred unless an explicit product decision pulls it in.

## 11. Source-of-truth hierarchy

For current work:

```text
AGENTS.md
→ PROJECT_CONTEXT.md
→ docs/product/PHASE_6_ARCHITECTURE.md
→ docs/product/UI_PRINCIPLES.md
→ docs/product/INTERACTION_DESIGN.md
→ docs/product/PRODUCT_MEASUREMENT.md
→ security / operations / review docs
```

Phase 1–5 architecture docs and retired V2/Council-era materials are historical context only. When historical text conflicts with the hierarchy above, current source of truth wins.

## 12. Delivery rule

```text
Understand outcome
→ lock acceptance / invariants
→ implement
→ test with falsifying checks
→ independent static/security/browser evaluation
→ fix gaps
→ rerun exact final SHA
→ merge only on green gates
→ verify exact merged SHA in production
→ update source of truth
→ report
```
