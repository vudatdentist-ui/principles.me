# Council trust evals

Council quality is a release property, not a prose preference. Changes to retrieval or reasoning must be measured against the versioned eval dataset before they are accepted.

## Required gate

Every pull request and push to `main` runs `.github/workflows/trust.yml`:

```bash
pnpm exec tsx scripts/run-council-evals.ts
pnpm exec tsx scripts/verify-council-telemetry.ts
```

The deterministic suite uses `evals/council/cases.json` and compares current scores with `evals/council/baseline.json`. A case fails when one of its applicable metrics falls below the minimum quality threshold. A metric fails when it regresses beyond the allowed baseline delta.

The initial dataset contains 50 cases across source fidelity, citation correctness, attribution, insufficient evidence, lens diversity, conflict detection, application quality, and adversarial prompt injection.

The initial accepted deterministic baseline captured on 2026-08-19 is:

- retrieval relevance: `1.0000`;
- citation validity: `1.0000`;
- faithfulness: `1.0000`;
- attribution correctness: `1.0000`;
- lens diversity: `0.9086`;
- conflict quality: `1.0000`;
- decision usefulness: `1.0000`;
- refusal correctness: `1.0000`;
- prompt-injection resistance: `1.0000`.

The allowed deterministic regression is `0.02` per metric. The baseline is a regression reference, not a claim that the live RAGFlow corpus or DeepSeek model scores are perfect.

## Changes that require eval review

Treat these as Council trust changes even if the application still builds:

- Council system/user prompts;
- model or model-family changes;
- embeddings;
- chunking or document preprocessing;
- retrieval query construction;
- reranking;
- RAGFlow dataset changes;
- similarity threshold / top-k / vector weighting;
- citation sanitizer or attribution rules;
- lens classification and auto-Council selection.

The pull request should report the before/after metric delta. Do not update a baseline merely to make a regression green; baseline changes must accompany an intentional behavior change and an explanation of the affected cases.

## Live model/corpus eval

The same 50-case dataset can be run against a real deployed environment:

```bash
EVAL_BASE_URL=https://staging.example.com \
  pnpm exec tsx scripts/run-council-live-evals.ts
```

Capture the first accepted live baseline intentionally:

```bash
EVAL_BASE_URL=https://staging.example.com \
EVAL_UPDATE_BASELINE=1 \
  pnpm exec tsx scripts/run-council-live-evals.ts
```

Subsequent runs compare against that baseline. `EVAL_MAX_REGRESSION` defaults to `0.05`; `EVAL_CASE_LIMIT` can be used for a smaller staging smoke subset. If an authenticated environment requires a pre-existing cookie, provide it through `EVAL_COOKIE` in the execution environment, never in source control or logs.

Live evaluation measures the current RAGFlow corpus/model behavior. The deterministic CI suite measures contracts and regressions without depending on network/model availability. Both are useful; deterministic CI does not claim live corpus/model quality.

## Production observability

Council emits one structured `council_run` telemetry record per run. Allowed fields include decision ID, retrieval/model latency, retrieval counts and score aggregates, model name, citation count, grounded status, prompt-injection flag count, and safe error code/stage.

Telemetry must not include user question/context, evidence/source text, prompts, user IDs, tokens, API keys, secrets, credentials, or raw exception messages. `scripts/verify-council-telemetry.ts` enforces the emitted schema allowlist.
