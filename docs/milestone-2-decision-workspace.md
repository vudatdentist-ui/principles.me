# Milestone 2 — Decision Workspace

Milestone 2 changes the primary product object from an ephemeral Council question to a persistent Decision.

## Primary navigation

- Ask
- Decisions
- My Principles
- Explore

Brain, Graph, Thinkers, Concepts, and Library are grouped under Explore. Team Brain is not exposed in the v1 shell.

## Decision flow

1. Start with messy context at **What are you deciding?**
2. The server derives a concise decision question while preserving the original context.
3. The Decision is persisted to PostgreSQL under the current workspace user.
4. Council analysis and evidence can be attached to the Decision.
5. The user records a Judgment, adopted Principles, and later an Outcome.
6. `/decisions/:id` reconstructs the complete Decision from PostgreSQL after reload.

## Lifecycle

`draft → exploring → decided → review_due → reviewed → archived`

Current automatic transitions:

- creation → `draft`
- saved Council analysis → `exploring`
- saved Judgment → `decided`
- saved Outcome → `reviewed`

`review_due` and `archived` remain valid lifecycle states for later review scheduling/archive controls.

## Ownership

Until account authentication is promoted into the primary product shell, each browser workspace receives a long-lived httpOnly workspace cookie mapped to a real `User` row. Every Decision, Judgment, Principle, link, and Outcome remains scoped by that `userId`.

This is deliberately server-backed persistence, not localStorage. The identity boundary can later be replaced by authenticated account identity without changing the domain ownership model.
