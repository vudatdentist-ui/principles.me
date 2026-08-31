import type { AiProvider } from "./ai-provider";
import { AiProviderError, providerHttpError } from "./provider-error";
import { parseJsonSseStream } from "./stream-parser";
import type {
  AiRequest,
  AiResponseMetadata,
  AiTokenUsage,
  GenerateObjectRequest,
  GenerateTextRequest,
  StreamTextRequest,
} from "./types";

const DEFAULT_BASE_URL = "http://host.docker.internal:4000/v1";
const DEFAULT_MAX_TOKENS = 1800;
const DEFAULT_MODEL = "codex";
const DEFAULT_TIMEOUT_MS = 55_000;

export type OpenAIResponsesProviderOptions = {
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  maxTokens?: number;
  model?: string;
  providerId?: string;
  reasoningEffort?: string;
  timeoutMs?: number;
};

type AbortSource = "caller" | "timeout" | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeUsage(value: unknown): AiTokenUsage | undefined {
  if (!isRecord(value)) {
    return;
  }

  const inputTokens = optionalNumber(value.input_tokens);
  const outputTokens = optionalNumber(value.output_tokens);
  const totalTokens = optionalNumber(value.total_tokens);
  if (
    inputTokens === undefined &&
    outputTokens === undefined &&
    totalTokens === undefined
  ) {
    return;
  }

  return {
    ...(outputTokens === undefined ? {} : { completionTokens: outputTokens }),
    ...(inputTokens === undefined ? {} : { promptTokens: inputTokens }),
    ...(totalTokens === undefined ? {} : { totalTokens }),
  };
}

function responseMetadata(payload: Record<string, unknown>): AiResponseMetadata {
  const usage = normalizeUsage(payload.usage);
  return {
    ...(optionalString(payload.id) ? { id: payload.id as string } : {}),
    ...(optionalString(payload.model) ? { model: payload.model as string } : {}),
    ...(usage === undefined ? {} : { usage }),
  };
}

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException("Aborted", "AbortError");
}

function createAbortContext(
  callerSignal: AbortSignal | undefined,
  timeoutMs: number,
): {
  cleanup: () => void;
  signal: AbortSignal;
  source: () => AbortSource;
} {
  const controller = new AbortController();
  let source: AbortSource = null;
  const timeout = setTimeout(() => {
    if (!controller.signal.aborted) {
      source = "timeout";
      controller.abort(new DOMException("Timed out", "TimeoutError"));
    }
  }, timeoutMs);
  const abortFromCaller = () => {
    if (!controller.signal.aborted) {
      source = "caller";
      controller.abort(callerSignal?.reason);
    }
  };

  if (callerSignal?.aborted) {
    abortFromCaller();
  } else {
    callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  return {
    cleanup() {
      clearTimeout(timeout);
      callerSignal?.removeEventListener("abort", abortFromCaller);
    },
    signal: controller.signal,
    source: () => source,
  };
}

function normalizeError(
  providerId: string,
  error: unknown,
  source: AbortSource,
): AiProviderError {
  if (error instanceof AiProviderError) {
    return error.providerId
      ? error
      : new AiProviderError(error.message, {
          cause: error.cause,
          code: error.code,
          providerId,
          retryable: error.retryable,
          status: error.status,
        });
  }
  if (source === "caller") {
    return new AiProviderError("AI provider request was aborted.", {
      cause: error,
      code: "aborted",
      providerId,
      retryable: false,
    });
  }
  if (source === "timeout") {
    return new AiProviderError("AI provider request timed out.", {
      cause: error,
      code: "timeout",
      providerId,
      retryable: true,
    });
  }
  return new AiProviderError("AI provider request failed.", {
    cause: error,
    code: "provider_error",
    providerId,
    retryable: true,
  });
}

function assertPayload(value: unknown, providerId: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new AiProviderError("AI provider returned an invalid response.", {
      code: "invalid_response",
      providerId,
      retryable: false,
    });
  }
  return value;
}

function responseText(payload: Record<string, unknown>, providerId: string): string {
  const output = payload.output;
  const chunks: string[] = [];
  if (Array.isArray(output)) {
    for (const item of output) {
      if (!isRecord(item) || !Array.isArray(item.content)) {
        continue;
      }
      for (const part of item.content) {
        if (isRecord(part) && part.type === "output_text" && typeof part.text === "string") {
          chunks.push(part.text);
        }
      }
    }
  }
  const text = chunks.join("").trim();
  if (!text) {
    throw new AiProviderError("AI provider returned an empty response.", {
      code: "invalid_response",
      providerId,
      retryable: false,
    });
  }
  return text;
}

function structuredFormat() {
  return { format: { type: "json_object" } };
}

export class OpenAIResponsesProvider implements AiProvider {
  readonly id: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly maxTokens: number;
  private readonly model: string;
  private readonly reasoningEffort: string;
  private readonly timeoutMs: number;

  constructor(options: OpenAIResponsesProviderOptions = {}) {
    this.id = options.providerId ?? "litellm";
    this.apiKey = (options.apiKey ?? process.env.LITELLM_API_KEY ?? "").trim();
    this.baseUrl = (
      options.baseUrl ?? process.env.LITELLM_BASE_URL ?? DEFAULT_BASE_URL
    ).replace(/\/+$/, "");
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.maxTokens =
      options.maxTokens ??
      (Number(process.env.LITELLM_MAX_TOKENS) || DEFAULT_MAX_TOKENS);
    this.model = options.model ?? process.env.LITELLM_MODEL ?? DEFAULT_MODEL;
    this.reasoningEffort =
      options.reasoningEffort ?? process.env.LITELLM_REASONING_EFFORT ?? "high";
    this.timeoutMs =
      options.timeoutMs ??
      (Number(process.env.LITELLM_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS);
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.baseUrl && this.model);
  }

  async generateObject<T>(request: GenerateObjectRequest<T>): Promise<T> {
    const content = await this.complete(request, true);
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new AiProviderError("AI model returned malformed JSON.", {
        cause: error,
        code: "invalid_model_output",
        providerId: this.id,
        retryable: false,
      });
    }
    try {
      return request.parse(parsed);
    } catch (error) {
      throw new AiProviderError("AI model output did not match the requested structure.", {
        cause: error,
        code: "invalid_model_output",
        providerId: this.id,
        retryable: false,
      });
    }
  }

  generateText(request: GenerateTextRequest): Promise<string> {
    return this.complete(request, false);
  }

  streamText(request: StreamTextRequest): AsyncIterable<string> {
    return this.stream(request);
  }

  private requestBody(request: AiRequest, stream: boolean, structured: boolean) {
    const instructions = request.messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    const input = request.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({ role: message.role, content: message.content }));

    return {
      ...(instructions ? { instructions } : {}),
      input,
      max_output_tokens: request.maxTokens ?? this.maxTokens,
      model: request.model ?? this.model,
      ...(structured ? { text: structuredFormat() } : {}),
      ...(this.reasoningEffort ? { reasoning: { effort: this.reasoningEffort } } : {}),
      stream,
    };
  }

  private async fetchResponse(
    request: AiRequest,
    stream: boolean,
    structured: boolean,
    signal: AbortSignal,
  ): Promise<Response> {
    if (signal.aborted) {
      throw abortReason(signal);
    }
    if (!this.apiKey) {
      throw new AiProviderError("AI provider credentials are not configured.", {
        code: "unauthorized",
        providerId: this.id,
        retryable: false,
      });
    }
    const response = await this.fetchImpl(`${this.baseUrl}/responses`, {
      body: JSON.stringify(this.requestBody(request, stream, structured)),
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal,
    });
    if (!response.ok) {
      throw providerHttpError(this.id, response.status);
    }
    return response;
  }

  private emitMetadata(payload: Record<string, unknown>, request: AiRequest) {
    const metadata = responseMetadata(payload);
    if (metadata.id || metadata.model || metadata.usage) {
      request.onMetadata?.(metadata);
    }
  }

  private async complete(request: AiRequest, structured: boolean): Promise<string> {
    const context = createAbortContext(request.signal, request.timeoutMs ?? this.timeoutMs);
    try {
      const response = await this.fetchResponse(request, false, structured, context.signal);
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream")) {
        if (!response.body) {
          throw new AiProviderError("AI provider returned an invalid stream.", {
            code: "invalid_response",
            providerId: this.id,
            retryable: false,
          });
        }
        let content = "";
        for await (const item of parseJsonSseStream(response.body, context.signal)) {
          if (item.type === "done") {
            break;
          }
          const payload = assertPayload(item.data, this.id);
          if (payload.type === "response.output_text.delta" && typeof payload.delta === "string") {
            content += payload.delta;
          }
          if (payload.type === "response.completed" && isRecord(payload.response)) {
            this.emitMetadata(payload.response, request);
          }
        }
        if (!content.trim()) {
          throw new AiProviderError("AI provider returned an empty response.", {
            code: "invalid_response",
            providerId: this.id,
            retryable: false,
          });
        }
        return content.trim();
      }
      const payload = assertPayload(await response.json(), this.id);
      this.emitMetadata(payload, request);
      return responseText(payload, this.id);
    } catch (error) {
      throw normalizeError(this.id, error, context.source());
    } finally {
      context.cleanup();
    }
  }

  private async *stream(request: StreamTextRequest): AsyncIterable<string> {
    const context = createAbortContext(request.signal, request.timeoutMs ?? this.timeoutMs);
    let received = false;
    try {
      const response = await this.fetchResponse(request, true, false, context.signal);
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream")) {
        if (!response.body) {
          throw new AiProviderError("AI provider returned an invalid stream.", {
            code: "invalid_response",
            providerId: this.id,
            retryable: false,
          });
        }
        for await (const item of parseJsonSseStream(response.body, context.signal)) {
          if (item.type === "done") {
            break;
          }
          const payload = assertPayload(item.data, this.id);
          if (payload.type === "response.completed" && isRecord(payload.response)) {
            this.emitMetadata(payload.response, request);
          }
          if (payload.type === "response.output_text.delta" && typeof payload.delta === "string") {
            received = true;
            yield payload.delta;
          }
        }
      } else {
        const payload = assertPayload(await response.json(), this.id);
        this.emitMetadata(payload, request);
        const content = responseText(payload, this.id);
        received = true;
        yield content;
      }
      if (!received) {
        throw new AiProviderError("AI provider returned an empty stream.", {
          code: "invalid_response",
          providerId: this.id,
          retryable: false,
        });
      }
    } catch (error) {
      throw normalizeError(this.id, error, context.source());
    } finally {
      context.cleanup();
    }
  }
}
