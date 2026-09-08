import { z } from "zod";
import type { SessionContext } from "@/features/auth/contracts";
import { assertTrustedOrigin, UntrustedOriginError } from "@/features/auth/origin";
import { workspaceRagDatasetIds } from "@/features/auth/repository";
import { requireSession, UnauthorizedError } from "@/features/auth/session";
import { projectEvidenceForClient } from "@/features/evidence/client-reference";
import type { EvidenceReference } from "@/features/evidence/contracts";
import { liveSearchMode, shouldUseLiveSearch } from "@/features/evidence/live-search-policy";
import { BraveSearchEvidenceProvider } from "@/features/evidence/providers/brave-search-provider";
import { RagflowEvidenceProvider } from "@/features/evidence/providers/ragflow-provider";
import type { EvolutionState } from "@/features/evolution/contracts";
import { loadEvolutionState } from "@/features/evolution/service";
import { recordActivity } from "@/features/kernel/activity";
import { consumeRateLimit, workspaceRateScope } from "@/features/security/rate-limit";
import { createAiProvider } from "@/lib/ai/providers/factory";
import { AiProviderError } from "@/lib/ai/providers/provider-error";

export const maxDuration = 90;

const requestSchema = z.object({
  question: z.string().trim().min(3).max(4000),
});

type RetrievalState = "disabled" | "empty" | "ok" | "unavailable";
type PersonalContextState = "empty" | "ok";

type RetrievalResult = {
  live: RetrievalState;
  private: RetrievalState;
  references: EvidenceReference[];
};

function line(event: Record<string, unknown>): string {
  return `${JSON.stringify(event)}\n`;
}

function clipped(value: string | null | undefined, max = 900): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  return normalized.length > max ? `${normalized.slice(0, max)}…` : normalized;
}

function formatEvolutionContext(state: EvolutionState): {
  state: PersonalContextState;
  text: string;
} {
  if (!state.dream && !state.reality && !state.problem) {
    return { state: "empty", text: "NO PERSONAL EVOLUTION CONTEXT HAS BEEN RECORDED YET." };
  }

  const lines = [
    `CURRENT STAGE: ${state.stage}`,
    clipped(state.dream?.desiredState) ? `DREAM: ${clipped(state.dream?.desiredState)}` : null,
    clipped(state.reality?.statement) ? `CURRENT REALITY: ${clipped(state.reality?.statement)}` : null,
    clipped(state.problem?.gap) ? `GAP: ${clipped(state.problem?.gap)}` : null,
    clipped(state.problem?.statement) ? `PROBLEM: ${clipped(state.problem?.statement)}` : null,
    clipped(state.diagnosis?.rootCauseHypothesis)
      ? `ROOT-CAUSE HYPOTHESIS: ${clipped(state.diagnosis?.rootCauseHypothesis)}`
      : null,
    clipped(state.diagnosis?.uncertainty)
      ? `DIAGNOSIS UNCERTAINTY: ${clipped(state.diagnosis?.uncertainty)}`
      : null,
    clipped(state.design?.machineChange) ? `MACHINE DESIGN: ${clipped(state.design?.machineChange)}` : null,
    clipped(state.outcome?.actualResult) ? `LATEST OUTCOME: ${clipped(state.outcome?.actualResult)}` : null,
    state.outcome ? `OUTCOME COMPARISON: ${state.outcome.comparison}` : null,
    clipped(state.reflection?.learning) ? `LATEST REFLECTION: ${clipped(state.reflection?.learning)}` : null,
    clipped(state.principle?.rule) ? `PRINCIPLE UNDER REVIEW/TEST: ${clipped(state.principle?.rule)}` : null,
    clipped(state.principle?.trigger) ? `PRINCIPLE TRIGGER: ${clipped(state.principle?.trigger)}` : null,
  ].filter((value): value is string => Boolean(value));

  return { state: "ok", text: lines.join("\n") };
}

function formatEvidence(references: readonly EvidenceReference[]): string {
  if (references.length === 0) {
    return "NO PRIVATE OR LIVE EVIDENCE WAS RETRIEVED.";
  }

  return references
    .slice(0, 15)
    .map((reference) => {
      const provenance = [
        `type=${reference.sourceType === "live_web" ? "live_web" : "private_rag"}`,
        `provider=${reference.provider}`,
        reference.datasetId ? `dataset=${reference.datasetId}` : null,
        reference.documentId ? `document=${reference.documentId}` : null,
        reference.chunkId ? `chunk=${reference.chunkId}` : null,
        reference.score === null ? null : `score=${reference.score.toFixed(3)}`,
        reference.publishedAt ? `published=${reference.publishedAt}` : null,
        `retrieved=${reference.retrievedAt}`,
        reference.url ? `url=${reference.url}` : null,
      ]
        .filter((item): item is string => item !== null)
        .join(" · ");

      return [
        `[${reference.key}] ${reference.title}`,
        `PROVENANCE: ${provenance}`,
        `EXCERPT:\n${reference.text.slice(0, 3200)}`,
      ].join("\n");
    })
    .join("\n\n");
}

function createCitationGuard(allowedKeys: ReadonlySet<string>) {
  let pending = "";

  const push = (chunk: string): string => {
    let output = "";
    for (const character of chunk) {
      if (!pending) {
        if (character === "[") pending = character;
        else output += character;
        continue;
      }

      pending += character;
      if (character === "]") {
        const citation = /^\[((?:R|W)\d+)\]$/.exec(pending);
        if (!citation || allowedKeys.has(citation[1] ?? "")) output += pending;
        pending = "";
        continue;
      }

      if (pending.length > 14 || character === "\n") {
        output += pending;
        pending = "";
      }
    }
    return output;
  };

  const finish = (): string => {
    const tail = pending;
    pending = "";
    return tail;
  };

  return { finish, push };
}

async function retrieveEvidence(
  question: string,
  datasetIds: readonly string[],
  signal: AbortSignal
): Promise<RetrievalResult> {
  const mode = liveSearchMode(process.env.LIVE_SEARCH_MODE);
  const wantsLive = shouldUseLiveSearch(question, mode);
  const liveConfigured = Boolean(process.env.BRAVE_SEARCH_API_KEY?.trim());
  const useLive = wantsLive && liveConfigured;

  const [ragResult, liveResult] = await Promise.allSettled([
    new RagflowEvidenceProvider().retrieve({ datasetIds, question }, signal),
    useLive
      ? new BraveSearchEvidenceProvider().retrieve({ question }, signal)
      : Promise.resolve(null),
  ]);

  if (signal.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");

  const references: EvidenceReference[] = [];
  let privateState: RetrievalState = datasetIds.length === 0 ? "empty" : "unavailable";
  if (ragResult.status === "fulfilled") {
    references.push(...ragResult.value.references);
    privateState = ragResult.value.references.length > 0 ? "ok" : "empty";
  } else {
    console.error(JSON.stringify({ event: "ask_retrieval_failed", provider: "ragflow" }));
  }

  let live: RetrievalState = "disabled";
  if (wantsLive && !liveConfigured) {
    live = "unavailable";
  } else if (useLive && liveResult.status === "fulfilled" && liveResult.value) {
    references.push(...liveResult.value.references);
    live = liveResult.value.references.length > 0 ? "ok" : "empty";
  } else if (useLive && liveResult.status === "rejected") {
    live = "unavailable";
    console.error(JSON.stringify({ event: "ask_retrieval_failed", provider: "brave" }));
  }

  return { live, private: privateState, references };
}

function safeError(error: unknown): {
  code: string;
  message: string;
  retryable: boolean;
} {
  if (error instanceof AiProviderError) {
    const messages: Record<string, string> = {
      aborted: "The request was cancelled.",
      invalid_model_output: "The AI returned an invalid answer.",
      invalid_response: "The AI returned an invalid response.",
      provider_error: "The AI service is temporarily unavailable.",
      rate_limited: "The AI service is busy. Please try again.",
      timeout: "The AI service took too long to respond.",
      unauthorized: "The AI service is not configured correctly.",
    };
    return {
      code: error.code,
      message: messages[error.code] ?? "The AI request failed.",
      retryable: error.retryable,
    };
  }
  return { code: "internal_error", message: "The Q&A request could not be completed.", retryable: true };
}

export async function POST(request: Request): Promise<Response> {
  let session: SessionContext;
  try {
    assertTrustedOrigin(request);
    session = await requireSession(request);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }
    if (error instanceof UntrustedOriginError) {
      return Response.json({ error: "Request rejected." }, { status: 403 });
    }
    throw error;
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Question is invalid." }, { status: 400 });
  }

  const quota = await consumeRateLimit({
    action: "ai.ask",
    limit: Number(process.env.ASK_RATE_LIMIT_PER_HOUR || 30),
    scopeKey: workspaceRateScope(session.workspace.id),
    windowSeconds: 60 * 60,
  });
  if (!quota.allowed) {
    return Response.json(
      { error: "Usage limit reached." },
      { headers: { "retry-after": String(quota.retryAfterSeconds) }, status: 429 }
    );
  }

  const [datasetIds, evolutionState] = await Promise.all([
    workspaceRagDatasetIds(session.workspace.id),
    loadEvolutionState(session.workspace.id),
  ]);
  const personalContext = formatEvolutionContext(evolutionState);
  const { question } = parsed.data;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const write = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(line(event)));
      };

      let completed = false;
      let retrievalSummary: RetrievalResult | null = null;
      try {
        write({ message: "Searching…", stage: "retrieving", type: "status" });

        // Only the user's question is sent to public live search. Personal context stays
        // inside the authenticated model prompt and is never appended to Brave queries.
        const retrieval = await retrieveEvidence(question, datasetIds, request.signal);
        retrievalSummary = retrieval;
        const references = retrieval.references;

        write({
          live: retrieval.live,
          personal: personalContext.state,
          private: retrieval.private,
          references: references.map(projectEvidenceForClient),
          type: "sources",
        });
        write({ message: "Thinking from principles…", stage: "answering", type: "status" });

        const allowedKeys = new Set(references.map((reference) => reference.key));
        const citationGuard = createCitationGuard(allowedKeys);
        const evidence = formatEvidence(references);
        const provider = createAiProvider({
          maxTokens: Number(process.env.LITELLM_MAX_TOKENS || process.env.DEEPSEEK_MAX_TOKENS || 2200),
        });

        for await (const rawToken of provider.streamText({
          maxTokens: Number(process.env.DEEPSEEK_MAX_TOKENS || 2200),
          messages: [
            {
              content:
                "You are the intelligence layer inside Principles. Help the user think from reality, evidence, the 5 Steps (Goal, Problem, Diagnosis, Design, Do), and Pain + Reflection → Progress. PRIVATE PERSONAL EVOLUTION CONTEXT is authenticated user-owned context and may be used when relevant, but it is not a citation source and must never be invented or expanded beyond what is supplied. [R#] sources are shared Principles RAG evidence. [W#] sources are live public web evidence. Cite every material claim derived from RAG or web with the exact source key. Never invent citation keys, quotes, URLs, dates, or evidence. Distinguish observation from inference, surface uncertainty and counter-evidence when material, and do not tell the user a hypothesis is true merely because AI proposed it. If live evidence is needed but unavailable, say so. If no retrieved evidence exists, clearly separate general guidance from verified source-backed information. Do not claim to write Goals, Problems, Diagnoses, Designs, Reflections, or Principles; durable changes require explicit confirmation in the product. Keep the answer direct and low-noise.",
              role: "system",
            },
            {
              content: `QUESTION:\n${question}\n\nPERSONAL EVOLUTION CONTEXT STATUS: ${personalContext.state}\nPERSONAL EVOLUTION CONTEXT:\n${personalContext.text}\n\nSHARED KNOWLEDGE STATUS: ${retrieval.private}\nLIVE SEARCH STATUS: ${retrieval.live}\n\nRETRIEVED EVIDENCE:\n${evidence}`,
              role: "user",
            },
          ],
          signal: request.signal,
          temperature: 0.2,
        })) {
          const token = citationGuard.push(rawToken);
          if (token) write({ token, type: "token" });
        }

        const tail = citationGuard.finish();
        if (tail) write({ token: tail, type: "token" });
        write({ type: "done" });
        completed = true;
      } catch (error) {
        if (!request.signal.aborted) {
          const safe = safeError(error);
          console.error(JSON.stringify({ code: safe.code, event: "ask_failed", retryable: safe.retryable }));
          write({ ...safe, type: "error" });
        }
      } finally {
        controller.close();
        if (completed) {
          void recordActivity({
            actorUserId: session.user.id,
            eventType: "ai.ask.completed",
            metadata: {
              live: retrievalSummary?.live ?? "unknown",
              personalContext: personalContext.state,
              private: retrievalSummary?.private ?? "unknown",
              sourceCount: retrievalSummary?.references.length ?? 0,
            },
            subjectType: "ask",
            workspaceId: session.workspace.id,
          }).catch(() => console.error(JSON.stringify({ event: "ask_activity_write_failed" })));
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "cache-control": "no-store",
      "content-type": "application/x-ndjson; charset=utf-8",
      "x-accel-buffering": "no",
    },
  });
}
