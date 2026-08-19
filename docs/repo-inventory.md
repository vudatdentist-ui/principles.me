# Repository inventory

This inventory prevents inherited Vercel-chatbot code from being confused with the current Principles product surface. It is intentionally conservative: code is not deleted until its dependency path is understood and a replacement is covered by CI.

## Active — current Principles product path

These files/directories are part of the live product or its current runtime/deployment path and should be treated as owned code:

- `app/page.tsx` — current root page; mounts `PrinciplesCouncil`.
- `app/layout.tsx`, `app/globals.css` — active application shell and visual system.
- `app/api/council/route.ts` — current RAGFlow retrieval + DeepSeek synthesis endpoint.
- `components/principles-council.tsx` — current product interaction surface.
- `components/brain-scene.tsx` — current Three.js/R3F visual surface.
- `lib/principles-graph.ts` — current thinker/graph domain model used by the product UI.
- `lib/db/schema.ts`, `lib/db/migrations/`, `lib/db/migrate.ts` — persistence foundation, including the new Decision domain.
- `scripts/verify-foundation-schema.mjs` — executable migration/cascade verification.
- `scripts/bootstrap-ragflow.ps1`, `scripts/seed-ragflow.mjs` — current RAGFlow bootstrap/ingestion tooling.
- `public/brain.glb` and the brain extraction tooling — active visual asset path.
- Docker/Hostinger deployment files and `infra/ragflow` bootstrap configuration — current deployment path.
- `.github/workflows/ci.yml` — canonical PR/release foundation gate.
- `tests/e2e/principles-smoke.test.ts` — current E2E product smoke suite.

## Legacy but retained for now

These areas come from the Vercel chatbot base or a previous application shape. They remain because later milestones may still reuse infrastructure or types, and deleting them in Foundation would mix cleanup with product changes:

- `lib/ai/` — inherited AI SDK abstractions. Council currently calls DeepSeek directly, but some utilities may be reusable when orchestration is modularized.
- `lib/artifacts/`, editor/document infrastructure and related dependencies — inherited artifact system; not part of the current Principles core loop.
- `lib/db/queries.ts` and the inherited `Chat`, `Message_v2`, `Vote_v2`, `Document`, `Suggestion`, `Stream` tables — old chatbot persistence. Keep until Milestone 2 replaces or explicitly migrates any remaining consumers.
- `components/ai-elements/`, `components/chat/`, `components/ui/`, `components/theme-provider.tsx` — inherited component libraries. The current root product uses only a small subset/direct product components, but removal should follow an import/dependency audit rather than assumption.
- package dependencies associated with the inherited chat/editor/artifact stack — remove only together with their last consumer so lockfile/build changes remain reviewable.
- `app/(chat)/` social preview assets — inherited route-group assets; harmless and not worth mixing into foundation deletion.

## Safe to remove later once Milestone 2 starts

These files are demonstrably tied to the old chatbot E2E surface and are no longer the canonical test suite:

- `tests/e2e/chat.test.ts` — asserts `multimodal-input`, `send-button`, `suggested-actions`, and `stop-button`, none of which describe the current Principles UI.
- `tests/e2e/model-selector.test.ts` — inherited chatbot model selector behavior.
- `tests/e2e/auth.test.ts` — inherited chatbot auth flow; internal Principles auth will be specified separately.
- `tests/e2e/api.test.ts` — inherited chatbot API contract rather than `/api/council` product behavior.
- `tests/fixtures.ts`, `tests/pages/`, `tests/prompts/`, and helpers that exist only to support the old chatbot tests.

They remain in the repository for this milestone, but `playwright.config.ts` intentionally runs only `principles-smoke.test.ts`. Removing the legacy test tree should be a focused cleanup PR after the Decision workspace/auth direction is implemented.

## Cleanup rule going forward

A file or dependency may be deleted when all three are true:

1. no active route/runtime path imports it;
2. no current test/build/deployment workflow depends on it;
3. CI stays green after removal.

This keeps cleanup evidence-based and prevents a broad template purge from destabilizing product work.
