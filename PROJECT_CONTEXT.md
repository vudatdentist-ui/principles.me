# PROJECT CONTEXT — Principles

**Status:** product reset baseline  
**Effective date:** 2026-08-23

This document is the source of truth for product and architecture context. If another document, issue, branch, old component, or previous implementation conflicts with this file, this file wins until it is deliberately updated.

## 1. Product mission

Principles is a **management platform for both personal life and businesses**.

The long-term product should help a person or a team organize information, operate recurring work, make plans, track execution, and use AI across their own data. The exact modules and workflows are **not defined yet** and must be designed from new product requirements.

The product is not a decision-only application, a thinker simulator, a knowledge graph visualization, or a multi-agent council product.

## 2. What exists today

Only the following capability is considered implemented and reusable:

### Knowledge Q&A

- A user asks a question.
- RAGFlow retrieves relevant chunks from configured datasets.
- Retrieved chunks are normalized into inspectable evidence references.
- DeepSeek generates a streamed answer using the question and retrieved evidence.
- Source keys such as `[R1]` can be cited in the answer and inspected by the user.
- The system must never fabricate a RAG citation.

Supporting technical assets that remain valid:

- the RAGFlow bootstrap and document seeding flow;
- the generic RAGFlow evidence provider;
- the generic DeepSeek provider and stream parser;
- Docker/Traefik production delivery infrastructure after removal of legacy product assumptions.

## 3. What does NOT exist yet

Treat all of the following as greenfield unless a future requirement explicitly defines them:

- identity and authentication for the rebuilt product;
- personal profiles and personal workspace data;
- organizations, teams, roles, permissions, and tenancy;
- tasks and recurring work;
- projects and planning;
- notes, documents, files, and structured knowledge management beyond current RAG ingestion;
- contacts, customers, CRM, sales, or support;
- finance, budgets, accounting, expenses, or reporting;
- HR, people operations, hiring, leave, or payroll;
- goals, OKRs, habits, reviews, dashboards, or analytics;
- calendars, scheduling, reminders, automations, and integrations;
- durable chat history or AI memory;
- business workflows or domain-specific agents.

These are examples of possible management domains, **not a committed roadmap**.

## 4. Legacy concepts that are retired

Do not restore, reference as current architecture, or use as product requirements without a new explicit decision:

- Thinker Machine;
- Council / Council agents;
- Brain / My Brain / Team Brain visual product model;
- historical-thinker personas;
- Principles Graph / constellation visualization;
- Decision Workspace / Decision Brief / DecisionRun product model;
- Review and decision-outcome loops from the previous V2 architecture;
- V2 route hierarchy and V2-specific contracts;
- the old landing/login prototype and its fake product sections.

Git history is the archive. Deleted legacy source does not need to remain in the active tree for reference.

## 5. Architecture baseline

The active system should remain deliberately small until new domains are defined.

```text
Browser
  |
  +-- Knowledge Q&A UI
          |
          v
      /api/ask
          |
          +--> RAGFlow provider --> normalized evidence
          |
          +--> DeepSeek provider --> streamed answer
```

Active boundaries:

- `features/ask`: user-facing Q&A capability.
- `features/evidence`: retrieval contracts and RAGFlow integration.
- `lib/ai/providers`: model-provider infrastructure.
- `app/api/ask`: composition boundary between retrieval and generation.

Do not create a large generic domain layer before a real product module needs it.

## 6. Design direction for the rebuilt management product

When product modules begin, use these constraints unless superseded by a deliberate architecture decision:

1. **Personal and business use share a platform, not necessarily every workflow.** Common infrastructure should support both a personal workspace and organization workspaces without forcing business concepts into personal use.
2. **Workspace/tenant boundaries must be explicit before durable business data is added.** Do not bolt multi-tenancy on after domain tables proliferate.
3. **AI is an assistance layer, not the system of record.** Source data and user actions remain authoritative.
4. **RAG is a reusable knowledge service.** Do not couple retrieval to one future domain such as tasks, CRM, or finance.
5. **Evidence must remain inspectable.** Model output must not masquerade as retrieved source truth.
6. **Each new module starts with requirements and a data model.** Do not resurrect a deleted schema because it happens to be available in Git history.
7. **Prefer boring, composable boundaries.** Feature folders should map to actual product capabilities, not speculative abstractions.
8. **Keep production operable.** Health checks, provider errors, smoke tests, and deployment rollback remain first-class concerns.

## 7. Rules for AI coding agents and contributors

Before implementing a feature:

- read this file;
- assume only RAG + AI Q&A is complete;
- verify whether the requested domain has a current specification;
- do not infer requirements from closed PRs or deleted V2 files;
- do not introduce `brain`, `council`, `decision`, `thinker`, or `principles graph` architecture unless the user explicitly reintroduces that concept;
- keep changes scoped to a real feature boundary;
- update this context when a product decision becomes durable.

When uncertain whether legacy behavior should be preserved, default to **not preserving it** unless it belongs to the RAG/AI Q&A baseline or current production infrastructure.

## 8. Near-term product work

The next meaningful product step is not to rebuild every management module at once. It is to define the foundation that future personal and business modules can safely share:

- workspace and tenancy semantics;
- identity/authorization requirements;
- navigation/information architecture;
- the first concrete management domain to ship;
- how AI Q&A is scoped to a user's or organization's permitted data.

Those decisions should be captured as new product requirements before database schema work begins.
