import { z } from "zod";
import type { EvidenceReference } from "@/features/evidence/contracts";
import {
  liveSearchMode,
  shouldUseLiveSearch,
} from "@/features/evidence/live-search-policy";
import { BraveSearchEvidenceProvider } from "@/features/evidence/providers/brave-search-provider";
import { RagflowEvidenceProvider } from "@/features/evidence/providers/ragflow-provider";
import { DeepSeekProvider } from "@/lib/ai/providers/deepseek-provider";
import { AiProviderError } from "@/lib/ai/providers/provider-error";

export const maxDuration = 90;

const requestSchema = z.object({
  question: z.string().trim().min(3).max(4000),
});

type LiveRetrievalState = "disabled" | "empty" | "ok" | "unavailable";

type RetrievalResult = {
  live: LiveRetrievalState;
  references: EvidenceReference[];
};

function line(event: Record<string, unknown>): string {
  return `${JSON.stringify(event)}\n`;
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
        if (character === "[") {
          pending = character;
        } else {
          output += character;
        }
        continue;
      }

      pending += character;
      if (character === "]") {
        const citation = /^\[((?:R|W)\d+)\]$/.exec(pending);
        if (!citation || allowedKeys.has(citation[1] ?? "")) {
          output += pending;
        }
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
  signal: AbortSignal
): Promise<RetrievalResult> {
  const mode = liveSearchMode(process.env.LIVE_SEARCH_MODE);
  const wantsLive = shouldUseLiveSearch(question, mode);
  const liveConfigured = Boolean(process.env.BRAVE_SEARCH_API_KEY?.trim());
  const useLive = wantsLive && liveConfigured;

  const ragflow = new RagflowEvidenceProvider();
  const brave = new BraveSearchEvidenceProvider();

  const [ragResult, liveResult] = await Promise.allSettled([
    ragflow.retrieve({ question }, signal),
    useLive
      ? brave.retrieve({ question }, signal)
      : Promise.resolve(null),
  ]);

  if (signal.aborted) {
    throw signal.reason ?? new DOMException("Aborted", "AbortError");
  }

  const references: EvidenceReference[] = [];
  if (ragResult.status === "fulfilled") {
    references.push(...ragResult.value.references);
  } else {
    console.error(
      JSON.stringify({ event: "ask_retrieval_failed", provider: "ragflow" })
    );
  }

  let live: LiveRetrievalState = "disabled";
  if (wantsLive && !liveConfigured) {
    live = "unavailable";
  } else if (useLive && liveResult.status === "fulfilled" && liveResult.value) {
    references.push(...liveResult.value.references);
    live = liveResult.value.references.length > 0 ? "ok" : "empty";
  } else if (useLive && liveResult.status === "rejected") {
    live = "unavailable";
    console.error(
      JSON.stringify({ event: "ask_retrieval_failed", provider: "brave" })
    );
  }

  return { live, references };
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

  return {
    code: "internal_error",
    message: "The Q&A request could not be completed.",
    retryable: true,
  };
}

export async function POST(request: Request): Promise<Response> {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return Response.json({ error: "Question is invalid." }, { status: 400 });
  }

  const { question } = parsed.data;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const write = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(line(event)));
      };

      try {
        write({
          message: "Searching knowledge and current sources…",
          stage: "retrieving",
          type: "status",
        });

        const retrieval = await retrieveEvidence(question, request.signal);
        const references = retrieval.references;

        write({
          live: retrieval.live,
          references,
          type: "sources",
        });
        write({
          message: "Preparing the answer…",
          stage: "answering",
          type: "status",
        });

        const allowedKeys = new Set(references.map((reference) => reference.key));
        const citationGuard = createCitationGuard(allowedKeys);
        const evidence = formatEvidence(references);
        const provider = new DeepSeekProvider();

        for await (const rawToken of provider.streamText({
          maxTokens: Number(process.env.DEEPSEEK_MAX_TOKENS || 2200),
          messages: [
            {
              content:
                "You are the intelligence layer inside Principles. Build one concise, practical answer from private RAG evidence and current public web evidence. [R#] sources are private knowledge-base evidence and are authoritative for claims about the user's own documents, policies, and internal knowledge. [W#] sources are live public web evidence and should be preferred for time-sensitive public facts. Cite every material sourced claim with the exact source key. Never invent citation keys, quotes, document details, URLs, dates, or evidence. If private evidence and live web evidence conflict, explicitly surface the conflict and distinguish internal knowledge from current public information instead of silently choosing one. If the question needs current information but LIVE SEARCH STATUS is unavailable or empty, say that current public evidence could not be verified. If evidence is absent, clearly separate unsourced general guidance from verified source-backed information. Keep the answer direct and low-noise.",
              role: "system",
            },
            {
              content: `QUESTION:\n${question}\n\nLIVE SEARCH STATUS: ${retrieval.live}\n\nEVIDENCE:\n${evidence}`,
              role: "user",
            },
          ],
          signal: request.signal,
          temperature: 0.2,
        })) {
          const token = citationGuard.push(rawToken);
          if (token) {
            write({ token, type: "token" });
          }
        }

        const tail = citationGuard.finish();
        if (tail) {
          write({ token: tail, type: "token" });
        }
        write({ type: "done" });
      } catch (error) {
        if (!request.signal.aborted) {
          const safe = safeError(error);
          console.error(
            JSON.stringify({
              code: safe.code,
              event: "ask_failed",
              retryable: safe.retryable,
            })
          );
          write({ ...safe, type: "error" });
        }
      } finally {
        controller.close();
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
