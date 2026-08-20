import "server-only";

import { classifyDecision } from "@/lib/council/lenses";
import { retrieveCouncilEvidence } from "@/lib/council/retrieval";
import type { CouncilPlan } from "@/lib/council/types";
import { getPersonalContext } from "@/lib/db/personal-brain-queries";
import type {
  CortexAnswers,
  CortexExternalBundle,
  CortexExternalEvidenceProvider,
  CortexMemoryBundle,
  CortexMemoryProvider,
  CortexRunInput,
} from "./types";

function answerText(answers: CortexAnswers) {
  const entries = Object.entries(answers);
  return entries.length
    ? entries.map(([key, value]) => `${key}: ${value}`).join("\n")
    : "";
}

function combinedContext(input: CortexRunInput, answers: CortexAnswers) {
  return [input.context ?? "", answerText(answers)]
    .filter(Boolean)
    .join("\n\n");
}

export const cortexPersonalMemoryProvider: CortexMemoryProvider = {
  async retrieve({ userId, input, answers }): Promise<CortexMemoryBundle> {
    const personal = await getPersonalContext({
      context: combinedContext(input, answers),
      currentDecisionId: input.decisionId,
      question: input.input,
      userId,
    });

    return {
      contradictions: personal.contradictions,
      evidence: [
        ...personal.principles.map((item) => ({
          id: item.id,
          key: `P:${item.id}`,
          kind: "custom_principle" as const,
          statement: item.statement,
        })),
        ...personal.similarDecisions.map((item) => ({
          excerpt: item.judgment
            ? `${item.question}\nPrior judgment: ${item.judgment}`
            : item.question,
          id: item.id,
          key: `D:${item.id}`,
          kind: "personal_memory" as const,
          title: item.title,
        })),
      ],
    };
  },
};

export const cortexExternalEvidenceProvider: CortexExternalEvidenceProvider = {
  async retrieve({ input, answers }): Promise<CortexExternalBundle> {
    const context = combinedContext(input, answers);
    const base = `${input.input}\nContext: ${context}`.trim();
    const lenses = classifyDecision(base);
    const plan: CouncilPlan = {
      lenses,
      members: [],
      mode: "auto",
      retrievalQueries: [
        {
          id: "cortex-input",
          kind: "base",
          label: "Cortex input",
          query: base,
        },
        ...lenses.slice(0, 6).map((lens) => ({
          id: lens.id,
          kind: "lens" as const,
          label: lens.label,
          query: `${base}\nFocus: ${lens.label}. ${lens.retrievalHint}`,
        })),
      ],
    };
    const retrieval = await retrieveCouncilEvidence(plan);

    return {
      evidence: retrieval.references.map((reference) => ({
        chunkId: reference.chunkId,
        documentId: reference.documentId,
        excerpt: reference.text,
        key: reference.key,
        kind: "external_evidence" as const,
        score: reference.score,
        title: reference.title,
      })),
      lenses,
      reason: retrieval.reason,
    };
  },
};
