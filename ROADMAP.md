# Principles roadmap

This roadmap starts from the 2026-08-23 product reset. The implemented intelligence baseline is **RAG + live public search + AI Q&A**. All management domains remain greenfield.

## Baseline — Knowledge + Reality + AI

Current objective: make the intelligence layer dependable before adding management domains.

- Keep RAGFlow as the private/internal knowledge layer.
- Keep live search as the current public-reality layer.
- Keep private `[R#]` and live `[W#]` evidence inspectable and timestamped.
- Surface conflicts between internal knowledge and current public information.
- Keep live search routing privacy-aware; never send RAG excerpts to a public search provider.
- Add focused retrieval/answer evaluations before expanding AI behavior.
- Keep production health and canary smoke tests independent from unbuilt product domains.

Next intelligence steps, only when justified:

1. better retrieval ranking using relevance + freshness + authority;
2. explicit source-conflict detection;
3. optional full-page live content extraction for high-value sources;
4. live structured business connectors after workspace permissions exist.

## Foundation — define the platform before domain tables

Before building personal/business modules, define:

1. **Workspace model** — personal workspace, organization workspace, memberships.
2. **Identity and authorization** — authentication, roles, ownership, access rules.
3. **Information architecture** — minimal navigation and personal/business context selection.
4. **Shared primitives** — only primitives proven necessary by real modules.
5. **AI data scope** — permission filtering before retrieval or model access.

## First management module — choose from requirements

The first management domain must be selected deliberately. Possible domains include projects/tasks, notes/files, CRM, operations, goals, finance, or another user-defined area. These are candidates, not commitments.

For the chosen module:

- write workflow and success criteria first;
- define the smallest durable data model;
- add permission boundaries;
- build the non-AI workflow before AI convenience;
- expose permitted data to Q&A only after access control is correct.

## Expand incrementally

After the first domain proves the platform boundaries, add personal/business modules one at a time and extract shared infrastructure only when repetition is real.

## Explicitly retired roadmap items

The following old directions are not active:

- Thinker Machine modes and reasoning councils;
- Brain / constellation / Principles Graph surfaces;
- Decision Brief / Decision Workspace as the core product;
- historical-thinker simulation;
- building modules around the old V2 decision schema.

Git history preserves those experiments. They are not backlog items unless explicitly reintroduced.
