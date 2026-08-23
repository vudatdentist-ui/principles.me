# Principles roadmap

This roadmap starts from the 2026-08-23 product reset. Only RAG + AI knowledge Q&A is considered implemented. All management domains are greenfield.

## Baseline — clean and dependable Q&A

Current objective: keep the one finished capability reliable while the management product is being defined.

- Keep RAGFlow retrieval observable and source-backed.
- Keep DeepSeek streaming errors explicit and retryable where appropriate.
- Preserve inspectable evidence references.
- Add focused retrieval/answer evaluations before expanding AI behavior.
- Keep production health and canary smoke tests independent from unbuilt product domains.

## Foundation — define the platform before domain tables

Before building personal/business modules, define:

1. **Workspace model** — what a personal workspace is, what an organization workspace is, and whether a user can belong to multiple organizations.
2. **Identity and authorization** — authentication, membership, roles, ownership, and data access rules.
3. **Information architecture** — the primary navigation and how personal versus business context is selected.
4. **Shared primitives** — only primitives proven necessary by the first modules; avoid speculative universal-object systems.
5. **AI data scope** — which data can be retrieved for a user or organization and how permission filtering happens before RAG/model access.

## First management module — choose from requirements

The first real management domain must be selected deliberately. Possible domains include projects/tasks, notes/files, CRM, operations, goals, finance, or another user-defined area. These are candidates, not commitments.

For the chosen module:

- write the workflow and success criteria first;
- define the smallest durable data model;
- add permission boundaries;
- build the non-AI workflow before adding AI convenience;
- expose its permitted data to Q&A only after access control is correct.

## Expand incrementally

After the first domain proves the platform boundaries, add additional personal/business modules one at a time and extract shared infrastructure only when repetition is real.

## Explicitly retired roadmap items

The following old roadmap directions are not active:

- Thinker Machine modes and reasoning councils;
- Brain / constellation / Principles Graph product surfaces;
- Decision Brief / Decision Workspace as the core product;
- historical-thinker simulation;
- building product modules around the old V2 decision schema.

Git history preserves those experiments. They are not backlog items unless explicitly reintroduced.
