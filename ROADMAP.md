# Principles Me roadmap

## Current baseline

- Home is a landing page that leads into the workspace.
- Thinker Machine keeps the question input and streamed synthesis in one view.
- Each reasoning pass has an independent context; no pass is a historical personality.
- RAGFlow is the evidence service, DeepSeek is the synthesis service, and the Brain remains the visual operating system.

## Priority 1 — Make Thinker Machine dependable

1. Persist a conversation session so follow-up questions can reference the user’s prior questions without sharing module contexts.
2. Add cancel/retry controls and explicit retrieval, reasoning and synthesis states.
3. Store the raw evidence packet and final answer together so Sources always matches the answer that was shown.
4. Add evaluation questions for each source collection: retrieval recall, citation correctness, unsupported-claim rate and latency.
5. Finish the one-time RAGFlow reparse and expose document status, chunk count and index freshness in the Library.

## Priority 2 — Build the Principles knowledge layer

1. Define the Principles graph model: source, passage, claim, principle, concept, question, decision and relationship.
2. Link every accepted claim to an exact source passage; never create a graph edge from uncited model output.
3. Let the Brain morph between machine state, graph state and constellation state using this native model.
4. Add source ingestion review: approve, reject, merge duplicate sources and mark extraction problems.

## Priority 3 — Turn answers into a personal system

1. My Brain: save a claim, principle, open question or decision from a response.
2. Decisions: record context, options, assumptions, evidence coverage and later outcome.
3. Team Brain: permissions, shared sources, conflicting principles and review history.
4. Add feedback loops so outcomes can refine principles without rewriting source evidence.

## Priority 4 — Product foundation

1. Connect real authentication and workspace persistence; the current Login screen is only the entry surface.
2. Add background ingestion jobs with CPU-aware scheduling for large PDFs and EPUB conversion.
3. Add observability for RAGFlow health, parse failures, DeepSeek latency, token usage and citation validation.
4. Add production browser tests for landing → login → Thinker Machine → follow-up question → Sources.

## Explicit non-goals

- Do not model Ray Dalio, Charlie Munger, Warren Buffett or other thinkers as separate agents.
- Do not show uncited model knowledge as evidence.
- Do not replace the Brain renderer with a generic chatbot or a sphere.
