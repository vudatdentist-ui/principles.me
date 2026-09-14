# Principles observability

**Status:** current operational contract  
**Goal:** make failures, latency and fallback visible without collecting private user content.

## Signals

### Deployment/readiness

`GET /api/health` remains the deployment readiness contract. It verifies database configuration/reachability/schema readiness, AI provider availability, RAGFlow readiness and required live-search configuration. Production deploy verifies the exact `APP_VERSION` SHA.

When readiness is degraded, the server emits a structured `health.degraded` event containing only readiness booleans and release version.

### Database

Database health failures emit:

```text
database.health.failed
```

Safe error fields are limited to error name/code/retryability where available. SQL, connection strings and raw error messages are not logged by this helper.

### AI providers

Provider wrapper events:

```text
ai.request.started
ai.request.succeeded
ai.request.failed
ai.fallback.used
```

Permitted fields:

- provider id;
- operation (`generateObject`, `generateText`, `streamText`);
- duration milliseconds;
- emitted token/chunk count for streaming;
- normalized error code/name/retryability;
- primary/fallback provider identifiers.

Do not log prompts, questions, model output, private context or provider raw responses.

## Structured log format

Application observability events are single-line JSON:

```json
{
  "event": "ai.request.succeeded",
  "level": "info",
  "timestamp": "...",
  "provider": "...",
  "operation": "generateObject",
  "durationMs": 812
}
```

The logger redacts field names resembling authorization, cookie, password, secret, token, API key, prompt, content, question, reflection, goal or email.

Redaction is defense in depth, not permission to pass sensitive objects to the logger. Callers should construct safe metadata first.

## Product learning vs operational logs

Do not infer product usage by scraping arbitrary logs. Product learning uses durable semantic `activity_events` and the privacy contract in `docs/product/PRODUCT_MEASUREMENT.md`.

Operational logs answer questions such as:

- Is a provider timing out?
- Is fallback being used unusually often?
- Is database readiness failing?
- Which release is degraded?

Product metrics answer questions such as:

- Are users reaching Reality/Problem?
- Are they returning to Reflection?

Keep those concerns separate.

## Minimum incident workflow

```text
production symptom
→ identify exact release SHA
→ health/readiness state
→ structured error/fallback events
→ reproduce safely
→ add regression test if possible
→ fix root cause
→ rerun full gates
→ exact-SHA deploy verification
```

Never paste production secrets or intimate user content into an issue/PR to make diagnosis easier. Use identifiers only when they are non-secret and necessary; prefer aggregate/event metadata.

## Alerting boundary

This repository provides machine-readable structured events and health checks. External log shipping/alert routing is an infrastructure choice and is intentionally not hard-wired to a vendor here.

At meaningful usage scale, alert at minimum on sustained:

- health endpoint failures;
- database readiness failures;
- AI provider failure/fallback rate changes;
- deploy verification failures.

Thresholds should be based on observed production baselines rather than invented before traffic exists.
