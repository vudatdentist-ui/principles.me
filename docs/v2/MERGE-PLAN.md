# V2 merge plan

## Foundation

`V2-000` freezes contracts, creates isolated routes, adds fixtures, documents ownership, and introduces contract verification. Every agent branch starts from the foundation commit.

## Wave 1: independent infrastructure

These pull requests can run in parallel after foundation:

```text
V2-101 Evidence providers
V2-102 AI provider
V2-103 Decision persistence
V2-104 Product shell
V2-105 Brain isolation
```

They must not edit one another's owned paths.

## Wave 2: application and experience

```text
V2-201 Decision Orchestrator
  depends on V2-101, V2-102, V2-103

V2-202 Decision UI
  depends on V2-000 and uses fixtures until integration

V2-203 Decision API
  depends on V2-201 and V2-103

V2-204 Review loop
  depends on V2-103 and the Decision UI contract
```

## Integration pull requests

Architecture owns composition files and opens narrow integration pull requests:

```text
INT-01 Compose product shell
INT-02 Connect UI to Decision API
INT-03 Connect review loop
INT-04 Connect optional Brain
INT-05 Cut over root and move legacy surface
```

## Merge gates

A pull request is mergeable only when:

- its dependency pull requests are merged;
- contract verification passes;
- type checking passes;
- repository checks pass;
- tests use fakes or fixtures rather than production providers;
- changed paths match declared ownership;
- the pull request includes verification commands and known risks.

## Production rule

The `main` branch deploys to `principles.me`. No feature branch is merged to `main` merely because its local implementation is complete. The integration owner verifies the full diff, checks, migration impact, and rollback path before production merge.
