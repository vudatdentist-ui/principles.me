# PROJECT CONTEXT — Principles

**Status:** product reset baseline  
**Effective date:** 2026-08-23

This document is the source of truth for product and architecture context. If another document, issue, branch, old component, or previous implementation conflicts with this file, this file wins until it is deliberately updated.

## 1. Product mission

Principles is a **management platform for both personal life and businesses**.

The product should become an intelligent operating system that helps a person or team understand reality, organize information, operate recurring work, make plans, execute, and learn. The interface should stay minimal; complexity belongs inside the system rather than in dense screens or excessive text.

The product is not a decision-only application, thinker simulator, knowledge-graph visualization, or multi-agent council product.

## 2. What exists today

The implemented product baseline is **hybrid knowledge Q&A**:

- a user asks a question;
- RAGFlow retrieves relevant private/internal knowledge;
- a live-search policy decides whether current public evidence is needed;
- Brave Search retrieves current public web results when enabled and needed;
- private and live evidence are normalized into one inspectable evidence contract;
- DeepSeek receives the question plus normalized evidence and streams one answer;
- private evidence uses citation keys such as `[R1]`;
- live public evidence uses citation keys such as `[W1]`;
- the answer must not fabricate citation keys;
- conflicts between private knowledge and current public evidence must be surfaced rather than silently hidden.

Supporting technical assets that remain valid:

- RAGFlow bootstrap and document seeding;
- RAGFlow evidence provider;
- Brave live-search evidence provider;
- shared evidence contracts and retrieval policy;
- DeepSeek provider and stream parser;
- Docker/Traefik production delivery infrastructure.

## 3. Knowledge architecture

Principles separates **knowledge** from **current reality**.

```text
User question
      |
      v
Retrieval policy
      |
      +-------------------+
      |                   |
      v                   v
Private knowledge     Current reality
RAGFlow               Live web search
[R#]                  [W#]
      |                   |
      +---------+---------+
                |
                v
        Normalized evidence
                |
                v
             DeepSeek
                |
                v
      Answer + citations
```

Rules:

1. RAGFlow is the authority for the user's own documents and internal knowledge.
2. Live search is for public facts that may have changed.
3. Live search never receives RAG excerpts or retrieved private documents.
4. `LIVE_SEARCH_MODE=auto` is the default. Freshness/current-data cues trigger live retrieval. `always` and `off` are supported operational overrides.
5. Live web evidence is best-effort unless `LIVE_SEARCH_REQUIRED=true` is deliberately enabled.
6. Current claims without current evidence must be identified as unverified rather than presented as live fact.
7. Evidence remains inspectable and timestamped.

## 4. What does NOT exist yet

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
- business workflows or domain-specific agents;
- live structured business connectors such as accounting, CRM, banking, ERP, or analytics APIs.

These are possible management domains, **not a committed roadmap**.

## 5. Legacy concepts that are retired

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

## 6. Active architecture boundaries

The active system should remain deliberately small until real management domains are defined.

```text
Browser
  |
  +-- Minimal Q&A UI
          |
          v
      /api/ask
          |
          +--> retrieval policy
          |       +--> RAGFlow
          |       +--> Brave Search
          |               |
          +<-- normalized evidence
          |
          +--> DeepSeek --> streamed answer
```

Active boundaries:

- `features/ask`: user-facing Q&A capability;
- `features/evidence`: evidence contracts, live-search policy, RAGFlow and Brave integrations;
- `lib/ai/providers`: model-provider infrastructure;
- `app/api/ask`: composition boundary between retrieval and generation.

Do not create a large generic domain layer before a real product module needs it.

## 7. Design direction

1. **Reality first.** Internal knowledge and current external reality are separate inputs and both should be inspectable.
2. **Minimal interface.** Prefer compact state, clear hierarchy, and progressive disclosure over dashboards full of text.
3. **Personal and business use share a platform, not necessarily every workflow.**
4. **Workspace/tenant boundaries must be explicit before durable business data is added.**
5. **AI is an intelligence layer, not the system of record.**
6. **Evidence must remain inspectable.** Model output must not masquerade as source truth.
7. **Freshness is a first-class property.** Current facts require current evidence and timestamps.
8. **Private data boundaries are explicit.** Public search providers must never receive private RAG excerpts.
9. **Each new module starts with requirements and a data model.** Do not resurrect a deleted schema from Git history.
10. **Keep production operable.** Health checks, provider errors, smoke tests, and rollback remain first-class concerns.

## 8. Rules for AI coding agents and contributors

Before implementing a feature:

- read this file;
- assume only hybrid RAG + live-search + AI Q&A is complete;
- verify whether the requested management domain has a current specification;
- do not infer requirements from closed PRs or deleted V2 files;
- do not introduce `brain`, `council`, `decision`, `thinker`, or `principles graph` architecture unless the user explicitly reintroduces it;
- preserve private/public evidence boundaries;
- keep changes scoped to a real feature boundary;
- update this context when a product decision becomes durable.

When uncertain whether legacy behavior should be preserved, default to **not preserving it** unless it belongs to the current knowledge/reality/AI baseline or production infrastructure.

## 9. Near-term product work

The next foundation work should define:

- workspace and tenancy semantics;
- identity/authorization requirements;
- navigation/information architecture;
- the first concrete management domain to ship;
- how AI Q&A is scoped to permitted personal or organization data;
- the future connector boundary for live structured business state.

Those decisions should be captured as new requirements before database schema work begins.
