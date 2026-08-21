# ADR 003: Evidence before confidence

- Status: Accepted
- Date: 2026-08-21

## Context

Citations alone do not make a claim trustworthy. Sources can be stale, topically adjacent, duplicated, or unable to support the claim being made.

## Decision

All source-backed claims use normalized evidence references with provenance and time metadata. Factual Decision Brief reasons require citations, unknown citation keys are rejected, and absent evidence must be displayed as an evidence gap rather than replaced with general model knowledge.

## Consequences

- RAGFlow, web, market, and user context share one application contract.
- Facts, inferences, and user-specific context remain visibly distinct.
- Historical decisions retain their original evidence snapshot.
- Evidence providers must preserve timestamps and origin identifiers.
