## Outcome

What user/system outcome changes?

## Invariants / do not break

- 

## Risk

- [ ] Low
- [ ] Medium
- [ ] High — auth / authorization / privacy / destructive data / production infrastructure

## What changed

- 

## Product / privacy evidence

- Does this add/change analytics or logs? If yes, list fields and why no private content is collected.
- Does this change data export/deletion/retention or an external data destination?

## Verification

- [ ] `pnpm security:secrets`
- [ ] `pnpm quality:gate`
- [ ] database migrations applied if relevant
- [ ] typecheck
- [ ] unit tests
- [ ] real-Postgres integration tests
- [ ] restore drill
- [ ] build
- [ ] lint
- [ ] Playwright / browser behavior
- [ ] CodeQL / security workflow

## Independent findings

List static/security/browser/reviewer findings and how each was resolved. Builder self-review alone is not an independent finding.

## Not verified / residual risk

- 

## Production actions

- [ ] none
- [ ] exact-SHA production verification required
- [ ] migration / backup / restore considerations documented
- [ ] human security review required before meaningful production exposure
