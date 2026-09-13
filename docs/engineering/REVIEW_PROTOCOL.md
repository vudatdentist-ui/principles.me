# Principles review protocol

**Status:** required engineering guidance for material changes

## Purpose

The builder is responsible for producing a change. The verification system is responsible for challenging it.

A builder reading its own diff is useful but is **not independent review**. Material changes must provide evidence from checks that can disagree with the implementation: compiler/types, deterministic tests, real database constraints, browser execution, static analysis, security scans and production verification.

## Review packet

Every material PR should make these explicit:

```text
USER / SYSTEM OUTCOME
INVARIANTS NOT TO BREAK
RISK LEVEL
WHAT CHANGED
AUTOMATED PROOF
INDEPENDENT / STATIC FINDINGS
WHAT IS NOT VERIFIED
PRODUCTION ACTIONS
```

Do not use line count or number of tests as proof of correctness.

## Risk levels

### Low

Examples: copy, docs, localized visual polish with no behavioral/data change.

Required:

- lint/type/build as applicable;
- visual/browser check when rendered UI changes;
- no unexplained unrelated diff.

### Medium

Examples: normal product interactions, new API behavior, non-destructive schema additions, AI/provider behavior.

Required:

- Foundation gate;
- lint;
- relevant unit + real-Postgres integration tests;
- Playwright for user-visible behavior;
- secret/quality gate;
- CodeQL/static security analysis;
- explicit privacy/tenant-isolation review when state crosses boundaries.

### High

Examples:

- authentication/session/password reset;
- tenant/workspace authorization;
- organization membership/contextual evidence;
- account export/deletion;
- destructive migration;
- production database/backup/restore/deployment;
- credentials/network boundaries.

Required:

- all Medium evidence;
- threat-model comparison;
- failure/abuse-case tests;
- restore/rollback evidence where data can be affected;
- independent human security specialist review before substantial production exposure.

Automated CodeQL/security gates do not substitute for the final human specialist requirement at meaningful scale.

## Required repository gates

Material PR final SHA should pass:

```bash
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

GitHub Security / CodeQL provides an additional independent static analyzer.

A failure should be treated as evidence, not friction. Fix the root cause and rerun on the new exact SHA. Do not merge a new commit based on green results from an older SHA.

## Product UI review

For brand-defining UI, review the rendered product rather than only CSS/JS diffs.

Evaluate:

- hierarchy;
- current Reality / next meaningful action;
- interaction meaning;
- spacing/density;
- mobile behavior;
- keyboard/focus semantics;
- uncertainty/evidence visibility;
- generic AI/SaaS drift.

An interaction that only decorates should normally be removed.

## Security/privacy review questions

- Can another user/workspace reach this object by changing an id?
- Does authorization happen server-side before state is loaded/mutated?
- Can private context cross into public search or logs?
- Can model output become durable truth without review?
- Does a failure response leak SQL/provider/prompt/credential detail?
- Does export contain credentials or data belonging to another user?
- Can deletion destroy shared Organization data without explicit confirmation?
- Does a migration have backup/restore/rollback evidence?

## Regression rule

Serious failures should become permanent protection:

```text
reproduce
→ regression test / mechanized check
→ root-cause fix
→ search for same pattern elsewhere
→ rerun affected + full gates
```

Do not fix only the exact URL/selector/record that exposed the pattern when the same bug class can exist elsewhere.

## Merge and release

Before merge:

- final head SHA green;
- unresolved review threads: none;
- risk packet complete;
- diff scope matches intended outcome.

Merge with expected head SHA to avoid a race.

After merge:

- wait for main-branch verification;
- production deploy must report exact merged SHA;
- health and canonical route checks must pass;
- if production verification fails, treat the release as failed even if PR CI was green.

## Human responsibility

Human judgment remains the gate for:

- product taste and strategic tradeoffs;
- irreversible/high-impact data decisions;
- risk acceptance;
- security sign-off where automated evidence is insufficient.

The purpose of agent autonomy is to reduce implementation micromanagement, not eliminate accountable judgment.
