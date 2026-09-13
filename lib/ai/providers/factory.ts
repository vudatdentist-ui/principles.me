import { errorFields, logEvent } from "@/lib/observability/logger";
import { instrumentAiProvider } from "@/lib/observability/ai-provider";
import type { AiProvider } from "./ai-provider";
import { DeepSeekProvider } from "./deepseek-provider";
import { OpenAIResponsesProvider } from "./openai-responses-provider";
import { AiProviderError } from "./provider-error";
import type {
  GenerateObjectRequest,
  GenerateTextRequest,
  StreamTextRequest,
} from "./types";

type ProviderOptions = {
  maxTokens?: number;
  timeoutMs?: number;
};

class FallbackAiProvider implements AiProvider {
  readonly id = "litellm-with-deepseek-fallback";

  constructor(
    private readonly primary: AiProvider,
    private readonly fallback: AiProvider,
  ) {}

  private reportFallback(operation: string, error: unknown): void {
    logEvent("warn", "ai.fallback.used", {
      ...errorFields(error),
      fallbackProvider: this.fallback.id,
      operation,
      primaryProvider: this.primary.id,
    });
  }

  async generateObject<T>(request: GenerateObjectRequest<T>): Promise<T> {
    try {
      return await this.primary.generateObject(request);
    } catch (error) {
      if (error instanceof AiProviderError && error.code === "aborted") {
        throw error;
      }
      this.reportFallback("generateObject", error);
      return this.fallback.generateObject(request);
    }
  }

  async generateText(request: GenerateTextRequest): Promise<string> {
    try {
      return await this.primary.generateText(request);
    } catch (error) {
      if (error instanceof AiProviderError && error.code === "aborted") {
        throw error;
      }
      this.reportFallback("generateText", error);
      return this.fallback.generateText(request);
    }
  }

  async *streamText(request: StreamTextRequest): AsyncIterable<string> {
    let emitted = false;
    try {
      for await (const token of this.primary.streamText(request)) {
        emitted = true;
        yield token;
      }
      return;
    } catch (error) {
      if (emitted || (error instanceof AiProviderError && error.code === "aborted")) {
        throw error;
      }
      this.reportFallback("streamText", error);
    }

    yield* this.fallback.streamText(request);
  }
}

export function aiProviderConfigured(): boolean {
  return Boolean(
    process.env.LITELLM_API_KEY?.trim() || process.env.DEEPSEEK_API_KEY?.trim(),
  );
}

export function createAiProvider(options: ProviderOptions = {}): AiProvider {
  const primary = instrumentAiProvider(new OpenAIResponsesProvider(options));
  const fallback = instrumentAiProvider(new DeepSeekProvider(options));
  const primaryConfigured = new OpenAIResponsesProvider(options).isConfigured();
  const fallbackConfigured = Boolean(process.env.DEEPSEEK_API_KEY?.trim());

  if (primaryConfigured && fallbackConfigured) {
    return new FallbackAiProvider(primary, fallback);
  }
  if (primaryConfigured) {
    return primary;
  }
  return fallback;
}
