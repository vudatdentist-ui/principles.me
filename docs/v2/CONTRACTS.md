# V2 contract policy

## Frozen contracts

The following files are architecture-owned during parallel implementation:

```text
features/decision/contracts.ts
features/decision/stream-events.ts
features/evidence/contracts.ts
```

Feature agents consume these contracts. They do not make breaking edits inside their implementation pull requests.

## Contract versions

The initial public application contracts use schema version `1`.

### Decision Brief

A Decision Brief is the primary product output. It is structured data, not an unbounded Markdown response. It includes:

- recommendation
- confidence level and explanation
- reasons classified as fact, inference, or user context
- strongest counter-case
- unknowns
- next action
- review trigger
- valid-as-of timestamp
- normalized evidence references

A factual reason must cite at least one source key. Every citation key must exist in the attached sources.

### Evidence Reference

An evidence reference preserves provenance across RAGFlow, web, structured market data, and user context. Provider payloads must be normalized before entering the application service.

Citation prefixes are reserved:

```text
R - RAGFlow
W - web research
M - structured market data
C - user context
```

### Decision stream

The v1 NDJSON stream supports:

```text
started
status
evidence
brief
error
done
```

Every line is validated before it is emitted and again when it is consumed. Malformed or unknown events are protocol errors; the client must not silently discard them.

## Change process

A contract change request must include:

1. the user or system behavior that cannot be represented;
2. an example payload;
3. whether the change is additive or breaking;
4. fixture updates;
5. migration and compatibility impact.

Architecture updates the contract in a dedicated pull request. Dependent branches rebase after that pull request merges.

## Compatibility rule

Additive optional fields may remain in the same version when old consumers continue to work. Renaming fields, changing semantics, or making optional data required creates a new version or an explicit compatibility adapter.
