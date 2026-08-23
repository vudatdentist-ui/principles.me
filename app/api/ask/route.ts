import { z } from "zod";
import type { EvidenceReference } from "@/features/evidence/contracts";
import { RagflowEvidenceProvider } from "@/features/evidence/providers/ragflow-provider";
import { DeepSeekProvider } from "@/lib/ai/providers/deepseek-provider";
import { AiProviderError } from "@/lib/ai/providers/provider-error";

export const maxDuration = 90;

const requestSchema = z.object({
  question: z.string().trim().min(3).max(4000),
});

function line(event: Record<string, unknown>): string {
  return `${JSON.stringify(event)}\n`;
}

function formatEvidence(references: readonly EvidenceReference[]): string {
  if (references.length === 0) {
    return "NO RAG EVIDENCE WAS RETRIEVED.";
  }

  return references
    .slice(0, 10)
    .map((reference) => {
      const provenance = [
        reference.datasetId ? `dataset=${reference.datasetId}` : null,
        reference.documentId ? `document=${reference.documentId}` : null,
        reference.chunkId ? `chunk=${reference.chunkId}` : null,
        reference.score === null ? null : `score=${reference.score.toFixed(3)}`,
      ]
        .filter((item): item is string => item !== null)
        .join(" · ");

      return [
        `[${reference.key}] ${reference.title}`,
        provenance ? `PROVENANCE: ${provenance}` : "PROVENANCE: unavailable",
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
        const citation = /^\[(R\d+)\]$/.exec(pending);
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

function safeError(error: unknown): {
  code: string;
  message: string;
  retryable: boolean;
} {
  if (error instanceof AiProviderError) {
    const messages: Record<string, string> = {
      invalid_model_output: "The AI returned an invalid answer.",
      invalid_response: "The AI returned an invalid response.",
      provider_error: "The AI service is temporarily unavailable.",
      rate_limited: "The AI service is busy. Please try again.",
      timeout: "The AI service took too long to respond.",
      unauthorized: "The AI service is not configured correctly.",
      aborted: "The request was cancelled.",
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
          message: "Searching the knowledge base…",
          stage: "retrieving",
          type: "status",
        });

        let references: EvidenceReference[] = [];
        try {
          const packet = await new RagflowEvidenceProvider().retrieve(
            { question },
            request.signal
          );
          references = [...packet.references];
        } catch (error) {
          if (request.signal.aborted) {
            throw error;
          }
          console.error(
            JSON.stringify({ event: "ask_retrieval_failed", provider: "ragflow" })
          );
          write({
            message:
              "Knowledge retrieval is unavailable. Answering without retrieved support…",
            stage: "answering",
            type: "status",
          });
        }

        write({ references, type: "sources" });
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
                "You are the knowledge assistant inside Principles. Answer the user's question clearly and practically. Retrieved RAG evidence is the only authority for claims about the user's knowledge base. When a claim comes from retrieved evidence, cite the exact source key such as [R1]. Never invent citation keys, quotes, document details, or evidence. If no relevant evidence is available, say that explicitly before offering any general guidance, and clearly distinguish general guidance from source-backed information.",
              role: "system",
            },
            {
              content: `QUESTION:\n${question}\n\nRETRIEVED EVIDENCE:\n${evidence}`,
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
