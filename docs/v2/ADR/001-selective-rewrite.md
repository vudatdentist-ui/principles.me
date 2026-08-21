# ADR 001: Selective rewrite in the existing repository

- Status: Accepted
- Date: 2026-08-21

## Context

The repository contains working retrieval, evidence validation, AI orchestration, domain schema, deployment automation, and a custom renderer. The current product surface nevertheless concentrates routing and feature presentation in a large client component, while the main API route concentrates provider transport and application logic.

## Decision

Build v2 beside the current product in the same repository. Preserve infrastructure and domain assets, replace the product surface and application boundaries incrementally, and keep legacy behavior available until cutover.

## Consequences

- Work can be divided by stable filesystem ownership.
- V2 can be reviewed and previewed without changing production root behavior.
- Temporary duplication is accepted.
- Architecture must remove compatibility code after cutover rather than allowing two permanent products.
