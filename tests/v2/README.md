# V2 test harness

This directory owns deterministic tests for the V2 product surface. It intentionally does not exercise the legacy chatbot UI.

## Current coverage

- `/v2` readiness and smoke rendering.
- Product Shell brand, History navigation, Brain navigation, and workspace state.
- Negative checks for legacy Thinker/model/dashboard concepts on the V2 home surface.
- Frozen `DecisionBrief` and `DecisionStreamEvent` fixtures.
- NDJSON encoding/chunk-decoding helpers for future Decision API integration.
- A generic Playwright mock transport that requires the caller to provide the endpoint.

## No-live-network policy

V2 smoke tests block requests to non-local hosts. Decision fixtures and unit tests are in-memory only. CI does not provide DeepSeek, Tavily, RAGFlow, Postgres, Redis, or production auth secrets.

## Decision flow follow-ups

Issue #34 (`V2-202`) owns the transport-agnostic Decision UI. Once its public component/state API lands, add interaction coverage for submit, running/status, Decision Brief rendering, evidence disclosure, retryable error state, Accept, and Adjust using the fixtures in this directory.

Issue #35 (`V2-203`) owns `POST /api/v2/decisions` and NDJSON transport. Once that public endpoint lands, wire `installMockDecisionTransport` to the endpoint in an integration test and verify lifecycle handling without calling live providers or the database.

Until those public interfaces exist on `main`, this harness deliberately avoids guessing their selectors, callback names, or route implementation details.
