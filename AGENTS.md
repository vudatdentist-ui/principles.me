# Principles agent map

This file is a map, not a specification. Keep it short. Follow the current source-of-truth documents below instead of reconstructing product direction from old commits or historical phase documents.

## CURRENT SOURCE OF TRUTH

Read in this order for material work:

1. `AGENTS.md` — repository map, commands and red zones.
2. `PROJECT_CONTEXT.md` — current product state, boundaries and production reality.
3. `docs/product/PHASE_6_ARCHITECTURE.md` — current evolution-system contract.
4. `docs/product/UI_PRINCIPLES.md` — interface constraints.
5. `docs/product/INTERACTION_DESIGN.md` — interaction semantics.
6. `docs/product/PRODUCT_MEASUREMENT.md` — product-learning metrics and privacy rules.
7. `docs/engineering/REVIEW_PROTOCOL.md` — risk-based review and release evidence.
8. `docs/security/THREAT_MODEL.md` and `docs/security/DATA_RETENTION.md` for auth, privacy, data or organization work.

`docs/product/PHASE_1_ARCHITECTURE.md` through `PHASE_5_ARCHITECTURE.md` are historical delivery records. They explain why durable structures exist but do not override current Phase 6 direction.

## What this product is

Principles is an evolution system for people first and organizations second.

Visible product model:

```text
Dream + Reality + Determination → Successful Life

5 Steps
Goal → Problem → Diagnosis → Design → Do

Outcome → Pain / Surprise → Reflection → Principle → Evolve ↺
```

Primary authenticated navigation:

```text
Me · Organization · Knowledge · Learning
```

## Core truth invariants

- Desired Reality defines what matters; observed Reality constrains the path.
- Goal, Problem, Diagnosis, Design, Action and Outcome are distinct concepts.
- Completing Actions never proves a Design worked. Outcome requires observed Reality.
- Evidence and Observation are not inference.
- AI output is a proposal or hypothesis until the user reviews it.
- Reflection may legitimately produce no Principle.
- Principles are living hypotheses that may be tested, revised, challenged or retired.
- Self Model patterns are correctable hypotheses, never fixed identity labels.
- Organization evidence is attributable and contextual; never create global people scores.
- Authorization and tenant isolation outrank Radical Transparency.
- Knowledge must not silently write durable personal or organization state.

## Interaction rules

- Show current Reality and one meaningful next action before internal ontology.
- Interaction must help the user understand, choose, act, inspect evidence or reflect.
- Do not use animation as decoration.
- Prefer typography, whitespace, sequence, state and progressive disclosure over card/pill UI.
- Do not hide uncertainty or provenance for visual simplicity.
- Do not log personal text merely to measure product usage.

## Repository map

```text
app/                 Next.js routes and API boundaries
features/auth/       first-party identity/session
features/people/     durable personal evolution writes
features/evolution/  current read model + Me orchestration
features/learning/   longitudinal patterns/principles
features/organization/ governed collective machine
features/evidence/   private/public evidence provider boundaries
features/analytics/  privacy-safe product measurement
features/account/    export/deletion lifecycle
features/security/   rate controls/security helpers
lib/ai/providers/    model-provider transport/fallback
lib/db/              PostgreSQL client/config/health
db/migrations/       append-only checksum-bound migrations
tests/integration/   real-Postgres boundary tests
tests/e2e/           authenticated browser journeys
scripts/             migration/deploy/smoke/security/restore tooling
```

## Verification commands

Run the gates appropriate to the change. Material changes should finish with all of them:

```bash
pnpm install --frozen-lockfile
pnpm security:secrets
pnpm quality:gate
pnpm db:migrate
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm restore:drill
pnpm build
pnpm lint
pnpm test:e2e
```

For privacy-safe product learning on an operator machine with DB access:

```bash
pnpm product:insights 30
```

## Red zones

Treat these as high blast radius and require stronger review/evidence:

- authentication, password reset, sessions and cookies;
- tenant/workspace authorization or client projections;
- organization membership, roles and contextual evidence;
- destructive migrations or account deletion;
- production database, backup/restore and deployment scripts;
- secrets, provider credentials and network boundaries;
- anything that can expose personal Goal/Reflection/Principle content;
- automated durable AI writes.

## Never do

- Never accept a client-supplied user/workspace id as authorization.
- Never weaken workspace predicates to make a test pass.
- Never equate Action completion with Outcome.
- Never turn AI confidence into factual certainty.
- Never send private personal-history excerpts to public live search.
- Never put raw Goal, Reflection, Principle, evidence content, email, prompts or credentials into analytics/logs.
- Never bypass failed CI to merge a material change.
- Never call a builder's self-review an independent review.
- Never rewrite an applied migration; add a new migration.
- Never resurrect retired architectures without an explicit product decision.

## Delivery loop

```text
understand outcome
→ lock invariants / acceptance
→ implement
→ run falsifying tests
→ independent/static/security review
→ fix findings
→ rerun exact final SHA
→ merge only on green gates
→ verify exact merged SHA in production
→ update source of truth
```

Human judgment remains required for large product tradeoffs, irreversible data decisions and external security review. Agents may make routine implementation decisions inside these boundaries.
