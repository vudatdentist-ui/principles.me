# Principles v2 architecture

## Status

Accepted foundation for the selective rewrite. Production remains on the legacy surface until the v2 vertical slice passes its integration and deployment gates.

## Product invariant

The system may be sophisticated, but the user experience must remain one loop:

```text
Ask -> Decision Brief -> Act -> Review -> Learn
```

RAG, live data, reasoning lenses, evidence audits, retries, and persistence are implementation details. They must not become primary navigation or require the user to understand agent orchestration.

## Why a selective rewrite

The repository already contains valuable infrastructure: RAGFlow retrieval, citation validation, DeepSeek integration, decision and principle tables, deployment automation, and the custom Brain renderer. Replacing those systems would add risk without improving the product boundary.

The current product surface is intentionally treated as legacy because routing, orchestration, and presentation are concentrated in a small number of large files. V2 is built beside it so behavior can be compared and rolled back.

## Runtime boundaries

```text
Minimal product UI
        |
Typed Decision API
        |
Decision application service
   |          |          |
Context    Evidence      AI
   |       providers   provider
   |          |          |
Postgres   RAGFlow,    DeepSeek
           web, market
```

### Product UI

Owns input, progressive status, the structured Decision Brief, evidence disclosure, acceptance, and review. It never consumes provider-specific payloads.

### Decision API

Owns authentication, request validation, cancellation, NDJSON transport, and safe error mapping. It does not contain prompts, SQL, or provider HTTP code.

### Decision application service

Owns the state machine: load context, plan retrieval, collect evidence, generate a structured brief, audit it, revise at most once in product mode, and persist an immutable run snapshot.

### Evidence providers

RAGFlow, web, market, and user context implement one provider contract and return normalized `EvidenceReference` values.

### AI provider

The provider owns model transport, streaming, timeout, cancellation, and normalized errors. Decision prompts stay in the application layer.

### Persistence

Each model run receives a run identifier. Context, evidence, model metadata, audit output, and the exact Decision Brief shown to the user are saved as a historical snapshot.

### Brain

Brain remains an optional visualization route. It must be dynamically loaded and must not enter the Home bundle. Product data flows into Brain through a graph adapter; production rendering must not depend on hard-coded thinker fixtures.

## Initial routes

```text
/v2
/v2/decisions/[id]
/v2/history
/v2/brain
```

The legacy root route is unchanged during the foundation phase.

## Initial delivery order

1. Freeze contracts and ownership.
2. Extract evidence and AI providers.
3. Add decision persistence and run snapshots.
4. Build the Decision Orchestrator.
5. Build the minimal UI against fixtures.
6. Connect API, UI, review loop, and optional Brain.
7. Cut over only after CI and production smoke tests pass.

## Non-goals for the first vertical slice

- Goals dashboard
- Team Brain and organization permissions
- simulated historical personalities
- believability rankings
- global graph on Home
- custom workflow builder
- autonomous financial actions
- personality testing
- gamification
