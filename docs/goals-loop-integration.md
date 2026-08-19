# Goals / 5-Step Loop integration notes

## Domain

Goals owns four records: `Goal`, `Problem`, `Diagnosis`, and `GoalAction`.

The progression is:

`Goal -> Problem -> Diagnosis -> Principle -> Action`

Principles are not duplicated. A Problem stores only a temporary `principleCandidate` string. Adopting it creates a normal `Principle`, writes revision 1 to `PrincipleRevision`, and links it through `ProblemPrinciple`. Existing owned principles can also be linked with relation `applied`.

## Schema additions

Migration `0006_goals_loop.sql` adds:

- enums: `goal_status`, `problem_status`, `goal_action_status`, `problem_principle_relation`
- tables: `Goal`, `Problem`, `Diagnosis`, `GoalAction`, `ProblemPrinciple`
- owner/parent indexes and foreign keys
- one Diagnosis per Problem

All records carry `userId`; queries verify both user ownership and parent identity before mutations.

### Multi-agent migration note

This branch adds one entry to `lib/db/migrations/meta/_journal.json` for `0006_goals_loop`. Other parallel branches may also claim migration index/tag `0006`. Integration should preserve the SQL unchanged but reconcile the filename, journal index, timestamp, and generated snapshot order after branches are combined. No earlier migration was modified.

## API

- `GET/POST /api/goals`
- `GET/PATCH /api/goals/:id`
- `POST /api/goals/:id/problems`
- `PATCH /api/goals/:id/problems/:problemId`

Problem PATCH uses a discriminated `command` payload for the bounded loop operations: update problem, save diagnosis, add/update action, link principle, adopt candidate, and invoke Cortex.

## Cortex boundary

`lib/goals/cortex.ts` defines `GoalsCortexClient.analyzeProblem(input)` and exports an unavailable stub. The feature remains fully manual. The Cortex workstream can replace/inject this boundary without changing Goals persistence or UI contracts.

## UI

`/goals` is implemented by `components/goals/goals-workspace.tsx`. It uses a compact goal/problem selector and a single focused progression instead of five kanban columns. No global shell/navigation files are changed in this branch.

## Tests

`tests/e2e/goals-loop.test.ts` covers:

- persistence across the whole loop, including PrincipleRevision creation;
- ownership isolation with two independent workspace contexts;
- the focused 1 Problem / 2 Diagnosis / 3 Principle / 4 Action UI progression.
