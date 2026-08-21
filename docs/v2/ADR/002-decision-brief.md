# ADR 002: Decision Brief is the primary product output

- Status: Accepted
- Date: 2026-08-21

## Context

An unbounded chat answer encourages long prose, hides uncertainty, and makes persistence and review inconsistent. The product needs a stable unit that can be inspected, accepted, revisited, and evaluated against an outcome.

## Decision

The default AI output is a versioned `DecisionBrief` object. UI may render prose from its fields, but the source of truth remains structured data.

## Consequences

- Recommendation, reasons, uncertainty, counter-case, action, review, and sources are always addressable.
- Factual reasons can be mechanically checked for citations.
- Provider and model changes do not require UI payload changes.
- Novel cases that do not fit the contract require an explicit contract change rather than silent Markdown expansion.
