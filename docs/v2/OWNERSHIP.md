# V2 ownership map

## Architecture-owned files

Only the integration owner changes these files during parallel work:

```text
app/page.tsx
app/globals.css
components/principles-council.tsx
app/api/council/route.ts
package.json
pnpm-lock.yaml
features/decision/contracts.ts
features/decision/stream-events.ts
features/evidence/contracts.ts
```

`lib/db/schema.ts` belongs exclusively to the persistence workstream while its migration pull request is open.

## Workstream ownership

| Workstream | Owned paths | Forbidden overlap |
| --- | --- | --- |
| Evidence providers | `features/evidence/providers/**` | API routes, UI, database |
| AI provider | `lib/ai/providers/**` | prompts, evidence logic, UI |
| Persistence | `lib/db/schema.ts`, migrations, decision repositories | API and UI |
| Product shell | `features/shell/**`, `features/ui-v2/**`, `styles/v2/**` | legacy CSS and Brain |
| Brain isolation | `features/brain/**`, v2 Brain client | legacy renderer and Home |
| Orchestrator | `features/decision/application/**` | provider internals, routes, UI |
| Decision UI | `features/decision/components/**`, decision client | application service and API |
| Review loop | `features/review/**`, accept/review routes | schema and orchestrator |
| Testing | `tests/v2/**`, v2 Playwright config, CI workflow | production feature code |
| Observability | `lib/observability/**`, decision telemetry helpers | schema, providers, UI |

## General rules

- One pull request has one objective.
- No opportunistic cleanup outside the owned path.
- No new dependency without an architecture decision.
- No live AI or retrieval calls in CI.
- No placeholder analytics or fake production data.
- No provider payload may cross directly into UI code.
- No SQL, prompt, or provider secret belongs in an API route.
- Legacy behavior remains unchanged until cutover.
