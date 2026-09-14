import type { AiProvider } from "@/lib/ai/providers/ai-provider";
import type {
  GenerateObjectRequest,
  GenerateTextRequest,
  StreamTextRequest,
} from "@/lib/ai/providers/types";
import { errorFields, logEvent } from "./logger";

function durationMs(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

export function instrumentAiProvider(provider: AiProvider): AiProvider {
  return {
    id: provider.id,
    async generateObject<T>(request: GenerateObjectRequest<T>): Promise<T> {
      const startedAt = Date.now();
      logEvent("info", "ai.request.started", {
        operation: "generateObject",
        provider: provider.id,
      });
      try {
        const result = await provider.generateObject(request);
        logEvent("info", "ai.request.succeeded", {
          durationMs: durationMs(startedAt),
          operation: "generateObject",
          provider: provider.id,
        });
        return result;
      } catch (error) {
        logEvent("error", "ai.request.failed", {
          ...errorFields(error),
          durationMs: durationMs(startedAt),
          operation: "generateObject",
          provider: provider.id,
        });
        throw error;
      }
    },
    async generateText(request: GenerateTextRequest): Promise<string> {
      const startedAt = Date.now();
      logEvent("info", "ai.request.started", {
        operation: "generateText",
        provider: provider.id,
      });
      try {
        const result = await provider.generateText(request);
        logEvent("info", "ai.request.succeeded", {
          durationMs: durationMs(startedAt),
          operation: "generateText",
          provider: provider.id,
        });
        return result;
      } catch (error) {
        logEvent("error", "ai.request.failed", {
          ...errorFields(error),
          durationMs: durationMs(startedAt),
          operation: "generateText",
          provider: provider.id,
        });
        throw error;
      }
    },
    async *streamText(request: StreamTextRequest): AsyncIterable<string> {
      const startedAt = Date.now();
      let emittedTokens = 0;
      logEvent("info", "ai.request.started", {
        operation: "streamText",
        provider: provider.id,
      });
      try {
        for await (const token of provider.streamText(request)) {
          emittedTokens += 1;
          yield token;
        }
        logEvent("info", "ai.request.succeeded", {
          durationMs: durationMs(startedAt),
          emittedTokens,
          operation: "streamText",
          provider: provider.id,
        });
      } catch (error) {
        logEvent("error", "ai.request.failed", {
          ...errorFields(error),
          durationMs: durationMs(startedAt),
          emittedTokens,
          operation: "streamText",
          provider: provider.id,
        });
        throw error;
      }
    },
  };
}
