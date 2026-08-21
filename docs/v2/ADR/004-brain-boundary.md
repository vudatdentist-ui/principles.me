# ADR 004: Brain is an optional visualization boundary

- Status: Accepted
- Date: 2026-08-21

## Context

The custom Three.js Brain is a valuable visual identity and exploration tool, but loading and animating it behind every task adds cognitive and runtime cost. The core daily job is making and reviewing decisions.

## Decision

Move Brain behind an isolated, dynamically loaded v2 route. Home and Decision Brief routes must not import the renderer. Production graph input comes through a data adapter rather than hard-coded thinker fixtures.

## Consequences

- The visual asset is preserved.
- Home remains fast and calm.
- Mobile and reduced-motion fallbacks are required.
- Brain development can proceed independently from the decision workflow.
