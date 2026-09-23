# Record-led narrative workspaces

**Decision:** 2026-09-23, user-requested narrative refinement.
**Scope:** presentation and authored interface copy. Existing domain records,
permissions, AI-review requirements and persistence contracts remain authoritative.

## Evidence and interpretation

The user asked for the narrative direction of https://learn.w4gz.com and removal
of generic AI-like slogans after reviewing the current Principles UI.

Public browser inspection covered the three welcome chapters and the home page.
The welcome sequence uses one dominant idea per scene, a bounded reading area,
numbered chapter controls and a continuous visual line. The public course listing
returned a fetch error; no course lessons or authenticated learning workspace were
inspected. These observations are a composition reference, not proof of usability.

For Principles, the relevant adaptation is reading order and orientation, not the
reference's illustrations, brand copy or full-screen introduction. A returning user
must reach their actual work without replaying a story or scrolling past slogans.

## What the narrative contains

- **Me:** selected Goal, observed Reality and Gap, the current accepted context and
  an executable next action. The accepted Design names the Do scene. Earlier
  decisions and results remain inspectable in the record below the five-step rail.
- **Learning:** an experience before its interpretation; then Patterns supported
  by cases; then Principles under test. Chapter navigation opens the library
  directly, and pending review remains visible at the top.
- **Knowledge:** the user's Question, its Answer, then inspectable Sources. The
  user's question is the answer heading, not a repeated generic maxim.
- **Organization:** the actual name and Purpose, an open Issue, observed Reality
  and Tension, competing models, Responsibility and attributed Evidence. Governed
  operations remain available without duplicating the whole schema in the hero.

These are reading chapters, not additional numbered steps in the domain model.
Only Goal, Problem, Diagnosis, Design and Do are the five numbered execution steps.

## Copy boundary

Replace generic rhetorical headings and repeated exhortations with actual records,
state labels or actions. Empty states describe what is absent and offer an available
action. They do not imply that a lesson or pattern has been established.

Never rewrite user-authored goals, purpose, observations or principles because they
resemble a slogan. Do not hide source attribution, counter-evidence or uncertainty.
Action completion still requires a separate observed Outcome.

The two locales share the same hierarchy. A language switch translates interface
copy, not stored content. Preserve the Vietnamese display-font fix.

## Verification contract

`tests/e2e/narrative-records.spec.ts` covers populated Me, Learning, Knowledge and
Organization in Vietnamese at 1440 and 390 pixels and English at 1024 pixels. It
retains fresh screenshots and checks visible content, DOM chapter order, direct
library access, document overflow, persisted action completion without an invented
Outcome, and unchanged user text that happens to match a retired slogan.

Existing browser journeys still exercise goal switching/draft preservation,
keyboard five-step inspection, capture, revision, streaming and governed organization
mutations. Layout assertions retain bounded reading widths rather than viewport
expansion. The narrower Organization stage has an explicit 1120px bound.

`scripts/check-ui-contracts.mjs` rejects a small, explicit set of retired authored
UI literals. Its unit regression deliberately allows user records and the
completion-versus-outcome warning. This guard is not a claim to detect every form
of weak copy; rendered review remains necessary.

Before release, run the repository's gates on the final head and inspect its fresh
browser images. Do not equate a stored screenshot with a visual review or a green
pull-request run with a healthy production deployment.
