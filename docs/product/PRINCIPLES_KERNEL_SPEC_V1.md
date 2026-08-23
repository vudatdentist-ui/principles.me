# Principles Kernel Specification v1

**Status:** proposed product foundation  
**Date:** 2026-08-23  
**Applies to:** Principles for People first; Principles for Organizations later  
**Source of truth:** this document is subordinate to `PROJECT_CONTEXT.md`, but once merged it defines the domain language and product invariants for kernel work.

## 1. Purpose

Principles is not being designed as a goal tracker, task manager, journal, AI chatbot, OKR system, or management dashboard with AI added on top.

The product is being designed as an **evolution system**: a system that helps a person or an organization repeatedly determine what they want, see reality more accurately, identify what prevents the desired reality, change the machine that produces outcomes, execute, learn from the difference between expected and actual results, and convert that learning into reusable principles.

The product should make this process easier to practice every day without forcing the user to think in software concepts.

The core loop is:

```text
WHAT DO I WANT?
      |
      v
     GOAL
      |
      v
WHAT IS ACTUALLY TRUE?
      |
      v
   REALITY
      |
      v
     GAP
      |
      v
   PROBLEM
      |
      v
  DIAGNOSIS
      |
      v
    DESIGN
      |
      v
  EXECUTION
      |
      v
   OUTCOME
      |
      v
PAIN / SURPRISE / ERROR
      |
      v
 REFLECTION
      |
      v
  PRINCIPLE
      |
      v
UPDATE THE MACHINE
      |
      v
    EVOLVE
      |
      +---------------------> repeat
```

The purpose of the kernel is to make this loop representable, observable, assistable by AI, and reusable across personal and organizational contexts.

## 2. Philosophical commitments

The kernel is informed by three central ideas from Ray Dalio's *Principles*, plus several supporting mechanisms required to make them operational.

### 2.1 Dreams + Reality + Determination

The product must preserve the tension between aspiration and reality.

- **Dreams** express a desired future. They should not be prematurely constrained by the current state.
- **Reality** is the best available understanding of what is actually true now.
- **Determination** is the capacity to keep acting through the difficulty of changing reality.

Reality exists to improve the path to the dream, not to automatically shrink the dream.

The application must therefore avoid treating a goal as merely a metric that can be projected from the current trend. It should help the user distinguish what they truly want from status symbols, short-term desires, inherited expectations, or convenient proxies.

### 2.2 The 5-Step Process

The operating algorithm is:

1. have clear goals;
2. identify the problems preventing those goals;
3. diagnose problems to reach root causes;
4. design changes to the machine;
5. do what is needed to produce the desired result.

The kernel must preserve the separation between these stages. In particular:

- problem identification is not diagnosis;
- diagnosis is not solution generation;
- planning is not execution;
- an outcome is not automatically proof that the diagnosis was correct;
- repeated failure at one step should become observable over time.

The system should discourage the common shortcut:

```text
problem -> task
```

and encourage:

```text
problem -> evidence -> diagnosis -> design -> action -> outcome
```

### 2.3 Pain + Reflection = Progress

Pain is treated as a learning signal, not merely an emotion and not something to glorify.

A pain signal may be:

- a missed goal;
- an unexpected result;
- a repeated delay;
- a conflict;
- negative feedback;
- a decision that produced a poor outcome;
- a recurring frustration;
- an inconsistency between a stated priority and actual behavior;
- any event that suggests the current model of self, reality, or machine may be wrong.

Reflection must aim to produce learning that can change future behavior or the machine. A reflection that only records feelings is valid human expression, but it is not sufficient as the product's learning loop.

The intended transformation is:

```text
experience
  -> discrepancy
  -> reflection
  -> pattern
  -> lesson
  -> principle candidate
  -> machine change
  -> future evidence
```

### 2.4 Radical truth and radical open-mindedness

The entire loop depends on the quality of the user's model of reality. The system therefore needs mechanisms that distinguish:

- what happened;
- what someone observed;
- what someone believes;
- what AI inferred;
- what remains unknown;
- what evidence contradicts a belief.

AI should help challenge assumptions, ego-protective explanations, confirmation bias, and blind spots without pretending to be an unquestionable judge.

### 2.5 Look at the machine from the higher level

A poor outcome should not default to blaming the most visible action or person.

The system should allow the user to ask:

- What machine produced this outcome?
- Which parts of the design made the outcome likely?
- Which capabilities, roles, incentives, habits, processes, or constraints mattered?
- Is this a one-time event or a repeated pattern?

For a person, the machine includes routines, behavior, environment, capabilities, habits, relationships, decision rules, and constraints.

For an organization, the machine expands to include people and culture, roles, responsibilities, processes, systems, incentives, governance, capital, and information flows.

### 2.6 Operate by principles and systemize learning

A principle is not a quote or a motivational statement. In Principles, it is a reusable rule for handling recurring reality.

The product should therefore convert repeated learning into living principles that can be tested and revised.

A principle is expected to answer something close to:

```text
When situation X occurs,
I currently believe Y is generally true,
therefore I should tend to do Z,
because experiences A/B/C taught me this,
subject to these exceptions.
```

Principles should become more useful as the user's history grows.

## 3. Product thesis

### 3.1 Principles for People

Principles for People helps an individual become both the **operator** and the **designer** of their own machine.

The system should gradually understand:

- what the person truly wants;
- what they prioritize when goals conflict;
- their observed strengths and weaknesses;
- recurring problems;
- behavioral patterns;
- which part of the 5-Step Process they tend to fail at;
- which principles have held up under experience;
- where their stated beliefs and behavior diverge;
- which parts of their personal machine may need redesign.

This is not a fixed personality profile. It is an evidence-backed, evolving self-model.

### 3.2 Principles for Organizations

Principles for Organizations extends the same kernel from one mind to many minds and from one personal machine to a collective machine.

The organization layer will eventually add concepts such as:

- people;
- roles;
- responsibilities;
- teams;
- culture signals;
- issues;
- disagreements;
- decision rights;
- relevant track records;
- domain-specific believability;
- governance.

The kernel loop itself remains the same:

```text
organization goal
  -> organization reality
  -> problem
  -> diagnosis
  -> machine design
  -> execution
  -> outcome
  -> reflection
  -> organizational principle
  -> improved machine
```

Organizations must not require a different philosophical core.

## 4. Kernel invariants

These are rules that implementation must preserve.

1. **Evidence is not interpretation.** Retrieved or recorded facts must remain distinguishable from conclusions.
2. **AI output is not the system of record.** AI may propose observations, diagnoses, designs, reflections, and principles, but important durable statements must retain provenance and acceptance state.
3. **Goal is not a KPI.** Measures can indicate progress toward a goal but cannot define the full meaning of the goal.
4. **Reality may contradict the user.** The product must be able to surface contradictory evidence without silently rewriting the user's beliefs.
5. **Problem is defined relative to a desired reality.** Not every negative observation is a meaningful problem.
6. **Diagnosis must be separable from remedy.** The system must be able to state "we do not yet know the root cause."
7. **Machine changes are first-class.** A plan should be able to change processes, roles, habits, systems, or constraints, not only create tasks.
8. **Outcomes feed learning.** Execution without later comparison to reality is an incomplete loop.
9. **Principles remain revisable.** No personal or organizational principle becomes permanent truth merely because AI generated it.
10. **The interface hides structural complexity by default.** Users should experience a small number of meaningful states and actions rather than the ontology itself.
11. **Private data boundaries come before organizational intelligence.** Workspace and permission scope must be enforced before retrieval and model access.
12. **Progress is not screen count.** A phase is complete only when its intended behavioral loop works end-to-end.

## 5. Core domain primitives

These are conceptual primitives. They are not yet a SQL schema and should not be implemented mechanically without Phase 1 design work.

### 5.1 Workspace

A boundary of ownership, visibility, and context.

Initial forms:

- Personal Workspace
- Organization Workspace

A workspace determines which evidence, goals, principles, activity history, and machine state may be used for a request.

### 5.2 Actor

The entity that performed, observed, asserted, accepted, rejected, or revised something.

In People v0 the actor is primarily the user. Organization mode later introduces multiple people and system actors.

### 5.3 Goal

A chosen desired reality that matters enough to organize attention, trade-offs, diagnosis, and action around it.

A goal is richer than `title + target + deadline`.

Conceptual properties include:

- **desired state** — what should become true;
- **why it matters** — the underlying value or meaning;
- **priority** — what wins when goals conflict;
- **horizon** — the relevant time horizon, if one exists;
- **success conditions** — qualitative or quantitative conditions that indicate the desired reality;
- **measures** — observable signals, not the goal itself;
- **trade-offs** — costs the user knowingly accepts;
- **non-goals / boundaries** — what must not be sacrificed or optimized;
- **conflicting desires** — short-term wants or competing outcomes that may work against the goal;
- **confidence / clarity** — whether the goal is still being discovered or has been consciously chosen.

Goal formation should usually be a **discovery process**, not form filling.

### 5.4 Evidence

A traceable input describing something that may be relevant to reality.

Evidence may come from:

- RAGFlow private documents;
- Brave live public search;
- direct user statements;
- future structured metrics;
- future calendar, finance, CRM, or other connectors;
- recorded activity events;
- previous outcomes.

Evidence must include provenance and freshness where applicable.

### 5.5 Observation

A bounded statement about reality derived directly from evidence with minimal interpretation.

Examples:

- "Revenue recorded for August is 620M."
- "11 approval events were performed by the founder this week."
- "The project deadline was missed by 12 days."

An observation should point back to evidence.

### 5.6 Belief

A proposition held by a person or organization as likely true.

Beliefs are not facts. They may be:

- user-stated;
- inferred and pending confirmation;
- strongly supported;
- contradicted by evidence;
- revised over time.

Example:

> "Growth requires the founder to approve senior hires."

The system should be able to ask what evidence would make the user change this belief.

### 5.7 Problem

A meaningful obstacle that prevents or threatens a chosen goal.

A problem is not merely an undesirable event. It exists relative to a desired state.

Conceptual properties:

- related goal;
- observed gap;
- severity;
- persistence;
- first observed / latest observed;
- evidence;
- tolerance state;
- whether it is an event or a repeated pattern.

### 5.8 Diagnosis

A cause-and-effect explanation of why a problem is occurring.

Diagnoses should distinguish:

- symptoms;
- proximate causes;
- root causes;
- evidence supporting the diagnosis;
- evidence against it;
- alternative hypotheses;
- confidence;
- whether the user has accepted the diagnosis.

AI should be allowed to say "insufficient evidence."

### 5.9 Machine

The system that repeatedly produces outcomes.

For People, relevant machine components may include:

- habits;
- routines;
- calendar structure;
- environment;
- capabilities;
- relationships;
- resources;
- decision rules;
- constraints.

For Organizations, machine components expand to:

- people;
- culture;
- roles;
- responsibilities;
- processes;
- software systems;
- incentives;
- decision rights;
- governance;
- information flow;
- capital allocation.

Machine modeling should begin minimal and expand only where real cases require it.

### 5.10 Design

A proposed change to the machine intended to address a diagnosed root cause.

A design may include actions, but is not reducible to a task list.

Examples:

- delegate hiring authority to a defined role;
- change a meeting cadence;
- create a new qualification rule;
- remove a recurring commitment;
- introduce an escalation threshold;
- redesign an onboarding process.

The system should preserve the rationale connecting design to diagnosis.

### 5.11 Action

A concrete commitment in the execution of a design.

Actions eventually need ownership, timing, state, and completion evidence, but Phase 1 does not require a complete task-management product.

### 5.12 Outcome

What actually happened after actions or time passed.

Outcomes create the comparison point between expectation and reality.

They may be:

- metric changes;
- completed or failed commitments;
- observed behavior;
- qualitative results;
- externally observed events.

### 5.13 Pain Signal

An event or pattern indicating that reality differs meaningfully from expectation, desire, principle, or goal.

Pain signals may be manual or system-detected.

They are prompts for reflection, not automatic judgments.

### 5.14 Reflection

A structured learning process applied to an experience, discrepancy, or pain signal.

A useful reflection should be able to establish:

- what happened;
- what was expected;
- what was surprising or painful;
- what evidence matters;
- what may have caused the gap;
- whether the same pattern appeared before;
- what was learned;
- whether an existing principle should be challenged;
- whether the machine should change.

The user should not have to answer a long questionnaire. AI may construct this structure from a short conversation and ask only the unresolved high-value questions.

### 5.15 Principle

A reusable, revisable rule for handling recurring reality.

Conceptual fields:

- situation / trigger;
- current rule or response;
- rationale;
- supporting experiences and evidence;
- counterexamples;
- exceptions;
- confidence;
- lifecycle state;
- last challenged or revised date;
- owner / workspace.

Suggested lifecycle:

```text
candidate -> testing -> trusted -> challenged -> revised
```

A principle may also be retired if evidence no longer supports it.

### 5.16 Activity Event

An append-oriented record of something that happened in the product or imported reality.

Examples:

- goal created or revised;
- problem surfaced;
- diagnosis accepted;
- action completed;
- deadline missed;
- metric changed;
- reflection completed;
- principle revised;
- user rejected an AI suggestion.

Activity history is required for later pattern learning and self-model development.

## 6. Truth model: fact, observation, belief, and interpretation

One of the most important architecture decisions is to prevent the system from collapsing all language into "knowledge."

The intended structure is:

```text
SOURCE / EVENT
      |
      v
   EVIDENCE
      |
      v
 OBSERVATION
      |
      +--------------------+
      |                    |
      v                    v
   BELIEF             AI HYPOTHESIS
      |                    |
      +----------+---------+
                 |
                 v
             DIAGNOSIS
```

Examples:

```text
Evidence:
CRM export

Observation:
Median lead response time increased from 1.2h to 7.6h.

Belief:
Slow follow-up is reducing conversion.

AI hypothesis:
The routing process may be the root cause.

Diagnosis:
Accepted only after reviewing workload, ownership and routing evidence.
```

This structure allows Radical Open-Mindedness to become a product behavior. The system can ask:

- What do we actually know?
- What are we inferring?
- What evidence contradicts this?
- How confident should we be?
- What would falsify the belief?

## 7. Goal discovery model

Goal creation must not start with a generic CRUD form.

The system should help a user move from an initial desire to a consciously chosen desired reality.

Typical progression:

```text
initial desire
      |
      v
why do I want this?
      |
      v
what would this give me?
      |
      v
what conflicts with it?
      |
      v
what am I willing to trade off?
      |
      v
what am I unwilling to sacrifice?
      |
      v
which priority wins?
      |
      v
chosen goal
```

Example:

```text
Initial statement:
"I want the company to grow faster."

Possible deeper desired reality:
"I want to build a valuable company that can operate without depending on me."

Potential tension:
faster growth vs lower founder dependency

Clarifying question:
"If you had to choose for the next 12 months, which matters more?"
```

The product must allow goals that are partly qualitative and cannot honestly be reduced to a percentage.

Measures should be treated as reality signals rather than the definition of success.

## 8. Reality Engine

The current hybrid RAG + Live Search Q&A is the first implementation of a larger Reality Engine.

Current:

```text
Private knowledge --> RAGFlow ------+
                                    |
Current public web -> Brave Search -+--> normalized evidence
                                    |
                                    v
                                  DeepSeek
```

Future:

```text
Private documents -----------+
Live public web -------------+
User observations -----------+
Activity history ------------+
Metrics ---------------------+--> Evidence Layer --> Reality Engine
Calendar --------------------+
Finance / CRM / ERP ---------+
Other structured connectors -+
```

The Reality Engine should be able to answer four different questions:

1. **What evidence do we have?**
2. **What observations can we safely make from it?**
3. **Where do sources or beliefs conflict?**
4. **What important information is missing or stale?**

The system should not pretend that internet freshness equals truth. Source authority, freshness, relevance, and workspace relevance will later become ranking inputs.

## 9. AI roles

AI is an intelligence layer over evidence and durable product state. It should not be represented as a set of visible fictional agents.

The initial internal roles are:

### Observe

- retrieve relevant evidence;
- summarize bounded observations;
- identify freshness and contradictions;
- avoid turning inference into fact.

### Challenge

- expose assumptions;
- identify potential goal/desire conflicts;
- ask what evidence could disprove a belief;
- surface differences between stated priorities and observed behavior.

### Diagnose

- organize possible causes;
- distinguish symptom from proximate and root causes;
- search history for repeated patterns;
- state uncertainty.

### Design

- propose changes to the machine;
- compare alternative designs;
- consider second- and third-order consequences where useful;
- connect each design to the root cause it is supposed to address.

### Reflect

- reconstruct expected versus actual outcome;
- identify patterns across similar events;
- extract possible lessons;
- propose principle candidates or revisions.

AI may prepare durable changes, but acceptance should be explicit where the change materially affects the user's self-model, goals, diagnoses, or principles.

## 10. AI-generated state and provenance

Important AI-created fields should carry metadata conceptually equivalent to:

```text
generatedBy
generatedAt
evidenceIds[]
confidence
acceptanceState
acceptedBy
acceptedAt
```

Not every implementation must expose these fields to the user, but the system should retain enough provenance to answer:

> Why does Principles think this?

Potential acceptance states:

```text
suggested
accepted
rejected
superseded
```

The application must learn from rejections rather than repeatedly proposing the same interpretation as if it were accepted truth.

## 11. People self-model

The People product will eventually maintain an evolving model of the user.

Possible dimensions:

```text
Values
Priorities
Goals
Preferences
Strengths
Weaknesses
Capabilities
Recurring problems
Behavior patterns
Blind-spot candidates
5-Step failure patterns
Principles
Observed outcomes
```

The self-model must be evidence-backed and revisable.

It must never claim that a person "is" a fixed trait solely because an LLM inferred it from a small number of messages.

Useful statements are probabilistic and traceable, for example:

> Across five recent cases, difficult conversations were delayed after the problem was already recognized.

This is preferable to:

> You avoid conflict.

## 12. Organization extension

Principles for Organizations is built only after the People kernel is proven.

Additional organization concepts will include:

- Person
- Role
- Responsibility
- Team
- Culture signal
- Issue
- Disagreement
- Decision right
- Relevant experience
- Track record
- Believability by domain
- Governance rule

### Domain-specific believability

Believability must not become a single global score for a person.

It should be contextual to a domain and derived from evidence such as relevant experience, track record, and quality of reasoning.

Example:

```text
Person: Minh

Dental operations   strong evidence
Hiring              medium evidence
Finance             insufficient evidence
Marketing           strong evidence
```

The purpose is not ranking human worth. It is improving collective truth-seeking and decision quality.

### Transparency and permissions

Radical transparency must not be implemented as "everyone can see everything."

Organization mode must combine:

```text
truth can surface
+
permissions
+
accountability
+
governance
```

Sensitive evidence must remain permission-scoped before retrieval, before AI access, and before client rendering.

## 13. User experience model

The kernel is not the navigation.

Users should not need to operate screens named Diagnosis, Machine, Pain Signal, Evidence Graph, or Activity Event simply because these exist internally.

The product should translate the kernel into a small number of human moments:

- What matters now?
- What do you want?
- What is actually happening?
- What is getting in the way?
- Why does this keep happening?
- What should change?
- What did we learn?

A future People navigation may be as small as:

```text
Today
Goals
Reality
Principles
```

but even this is not committed until interaction prototypes validate it.

The detailed UI constraints are in `docs/product/UI_PRINCIPLES.md`.

## 14. Example vertical loop

Suppose a founder says:

> "I want to build a company that can operate without depending on me."

### Goal

```text
Desired reality:
The company can operate reliably without routine founder intervention.

Why:
Freedom and durable organizational value.
```

### Reality observation

Over a week the system observes or the user reports:

```text
11 hiring approvals were still made by the founder.
```

### Problem

```text
Hiring remains founder-dependent.
```

### Diagnosis

After gathering evidence:

```text
The organization has no explicit owner with final hiring authority for defined roles.
```

Alternative explanations may remain open until evidence supports one.

### Design

```text
Assign hiring decision rights to Head of People within defined thresholds.
Create escalation rules for exceptions.
```

### Execution

Concrete implementation actions are created.

### Outcome

Four weeks later:

```text
Founder approvals: 11/week -> 2/week
Hiring quality: stable
Time to hire: improved
```

### Reflection

The user reflects on what changed and what remained difficult.

### Principle candidate

```text
When a recurring operational decision has ambiguous ownership,
assign one clearly responsible decision owner and explicit escalation rules.
```

The principle remains a candidate until future cases test it.

This is the smallest complete expression of the product thesis.

## 15. Storage architecture direction

The durable kernel should use a relational system of record when implementation begins.

Direction:

```text
Postgres = durable product state and activity history
RAGFlow  = private knowledge retrieval
Brave    = current public web retrieval
DeepSeek = reasoning / synthesis
```

The relational model is preferred because the first requirements are ownership, permissions, lifecycle, provenance, constraints, and reliable transactions. A graph database is not justified merely because domain objects have relationships.

Vector retrieval remains a specialized retrieval capability, not the canonical storage model for all product state.

No SQL schema should be copied from deleted V2 history.

## 16. Security and privacy requirements

Before durable personal or organizational state is exposed to AI retrieval:

- identity must be established;
- workspace scope must be established;
- authorization must be checked before retrieval;
- public search must never receive private RAG excerpts;
- client citation payloads must be safe projections rather than indiscriminate server evidence objects;
- provider failures must not cause cross-workspace fallback;
- important audit events should be recorded;
- rate limits or quotas must prevent uncontrolled AI/search spending.

The current `/api/ask` baseline predates these requirements and should be hardened in the platform phase before private production workspaces are introduced.

## 17. Product evaluation

The product should not be judged primarily by message count, task count, or time spent.

Useful evaluation questions by maturity stage include:

### Early kernel

- Can the user express a meaningful goal without reducing it to a KPI?
- Can the system distinguish evidence from interpretation?
- Can a problem be connected to a goal and reality gap?
- Can a reflection produce a traceable lesson or principle candidate?

### People loop

- Does the system help the user surface meaningful problems earlier?
- Does it reduce premature solutioning before diagnosis?
- Does it help identify recurring patterns?
- Can the user explain why the system believes a pattern exists?
- Are principle revisions based on experience rather than generated prose?

### Execution

- Do designs address diagnosed root causes?
- Are actions completed?
- Are outcomes compared to expectations?

### Learning engine

- Can the system identify repeated failure points in the 5-Step Process?
- Can it distinguish one-off events from patterns?
- Does it learn from user rejection and correction?
- Does historical learning measurably improve later suggestions?

### Organizations

- Are disagreements surfaced clearly?
- Is relevant expertise represented without turning people into simplistic scores?
- Are permissions preserved while truth can still surface?
- Do machine changes improve repeated organizational outcomes?

## 18. Explicit non-goals

The kernel specification does **not** authorize building the following yet:

- a full task manager;
- CRM;
- HRIS;
- accounting;
- generic OKR software;
- social network;
- multi-agent council;
- personality scoring product;
- employee surveillance;
- global human ranking;
- an opaque AI memory that silently becomes truth;
- a dense executive dashboard;
- a universal graph abstraction before real requirements demand it.

These may later exist as domain products or integrations, but they must serve the kernel rather than replace it.

## 19. Phase relationship

The kernel is built through large sequential phases documented in `docs/product/PHASE_PLAN.md`.

The important rule is:

> **Only one major phase is active at a time. A phase is not complete until its expected behavioral outcome is demonstrated and `PROJECT_CONTEXT.md` is updated with the actual result.**

The first implementation phase after this specification will build the secure workspace foundation and smallest durable kernel state. It should not attempt to ship the entire ontology at once.

## 20. Official source basis

This specification is an original product interpretation rather than a reproduction of Ray Dalio's text. The primary official references used to ground the interpretation are:

- Principles — Life Principles overview and the framing of deciding what you want, what is true, and what to do: https://www.principles.com/principles/abd3ef46-c927-4828-bf2b-46a31f752bc2/
- Principles — Reality, evolution, pain, higher-level machine perspective, and systemized management: https://www.principles.com/principles/2801020f-b3c4-4605-b5c1-f4a18603aa41/
- Principles — Pain + Reflection = Progress and mistake-based learning: https://www.principles.com/principles/9decb01f-5551-48b9-adf8-667670f4853e/
- Principles — 5-Step Process details including problem identification, root-cause diagnosis, design, and completion: https://www.principles.com/principles/fd0a956b-659c-4f1b-9c10-80a841e0d7bb/
- Principles — organization as a machine of culture and people; looping from outcomes back to machine improvement: https://www.principles.com/principles/033b2d8c-77aa-44f5-b58c-02022530e84f
- Principles — Work Principles overview, decision-making machines, design, metrics, and organizations built around goals: https://www.principles.com/principles/0380fc53-a267-4548-9d5d-e99078a25f5d

Future product decisions should return to these philosophical sources before reducing the model to conventional productivity-software patterns.
