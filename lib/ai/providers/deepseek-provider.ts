import type { AiProvider } from "./ai-provider";
import {
  AiProviderError,
  providerHttpError,
} from "./provider-error";
import { parseJsonSseStream } from "./stream-parser";
import type {
  AiRequest,
  AiResponseMetadata,
  AiTokenUsage,
  GenerateObjectRequest,
  GenerateTextRequest,
  StreamTextRequest,
} from "./types";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MAX_TOKENS = 1800;
const DEFAULT_MODEL = "deepseek-chat";
const DEFAULT_TIMEOUT_MS = 45_000;

export type DeepSeekProviderOptions = {
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  maxTokens?: number;
  model?: string;
  providerId?: string;
  timeoutMs?: number;
};

type AbortSource = "caller" | "timeout" | null;

type RequestAbortContext = {
  cleanup: () => void;
  signal: AbortSignal;
  source: () => AbortSource;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException("Aborted", "AbortError");
}

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
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

  const completionTokens = optionalNumber(value.completion_tokens);
  const promptTokens = optionalNumber(value.prompt_tokens);
  const totalTokens = optionalNumber(value.total_tokens);
  if (
    completionTokens === undefined &&
    promptTokens === undefined &&
    totalTokens === undefined
  ) {
    return;
  }

  return {
    ...(completionTokens === undefined ? {} : { completionTokens }),
    ...(promptTokens === undefined ? {} : { promptTokens }),
    ...(totalTokens === undefined ? {} : { totalTokens }),
  };
}

function responseMetadata(payload: Record<string, unknown>): AiResponseMetadata {
  const id = optionalString(payload.id);
  const model = optionalString(payload.model);
  const usage = normalizeUsage(payload.usage);
  return {
    ...(id === undefined ? {} : { id }),
    ...(model === undefined ? {} : { model }),
    ...(usage === undefined ? {} : { usage }),
  };
}

function hasMetadata(metadata: AiResponseMetadata): boolean {
  return Boolean(metadata.id || metadata.model || metadata.usage);
}

function createAbortContext(
  callerSignal: AbortSignal | undefined,
  timeoutMs: number
): RequestAbortContext {
  const controller = new AbortController();
  let abortSource: AbortSource = null;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const abortFromCaller = () => {
    if (controller.signal.aborted) {
      return;
    }
    abortSource = "caller";
    controller.abort(callerSignal?.reason);
  };

  if (callerSignal?.aborted) {
    abortFromCaller();
  } else {
    callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
    timeout = setTimeout(() => {
      if (controller.signal.aborted) {
        return;
      }
      abortSource = "timeout";
      controller.abort(new DOMException("Timed out", "TimeoutError"));
    }, timeoutMs);
  }

  return {
    cleanup() {
      if (timeout) {
        clearTimeout(timeout);
      }
      callerSignal?.removeEventListener("abort", abortFromCaller);
    },
    signal: controller.signal,
    source: () => abortSource,
  };
}

function normalizedThrownError(
  providerId: string,
  error: unknown,
  abortSource: AbortSource
): AiProviderError {
  if (error instanceof AiProviderError) {
    if (error.providerId) {
      return error;
    }
    return new AiProviderError(error.message, {
      cause: error.cause,
      code: error.code,
      providerId,
      retryable: error.retryable,
      status: error.status,
    });
  }

  if (abortSource === "caller") {
    return new AiProviderError("AI provider request was aborted.", {
      cause: error,
      code: "aborted",
      providerId,
      retryable: false,
    });
  }

  if (abortSource === "timeout") {
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

function assertPayload(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new AiProviderError("AI provider returned an invalid response.", {
      code: "invalid_response",
      providerId: "deepseek",
      retryable: false,
    });
  }
  return value;
}

function completionContent(payload: Record<string, unknown>): string {
  const { choices } = payload;
  if (!Array.isArray(choices) || !isRecord(choices[0])) {
    throw new AiProviderError("AI provider returned an invalid response.", {
      code: "invalid_response",
      providerId: "deepseek",
      retryable: false,
    });
  }

  const { message } = choices[0];
  const content = isRecord(message) ? message.content : undefined;
  if (typeof content !== "string" || !content.trim()) {
    throw new AiProviderError("AI provider returned an empty response.", {
      code: "invalid_response",
      providerId: "deepseek",
      retryable: false,
    });
  }

  return content.trim();
}

function streamContent(payload: Record<string, unknown>): string | undefined {
  const { choices } = payload;
  if (choices === undefined) {
    return;
  }
  if (!Array.isArray(choices)) {
    throw new AiProviderError("AI provider returned an invalid stream event.", {
      code: "invalid_response",
      providerId: "deepseek",
      retryable: false,
    });
  }
  if (choices.length === 0) {
    return;
  }
  if (!isRecord(choices[0])) {
    throw new AiProviderError("AI provider returned an invalid stream event.", {
      code: "invalid_response",
      providerId: "deepseek",
      retryable: false,
    });
  }

  const { delta } = choices[0];
  if (!isRecord(delta)) {
    throw new AiProviderError("AI provider returned an invalid stream event.", {
      code: "invalid_response",
      providerId: "deepseek",
      retryable: false,
    });
  }

  const { content } = delta;
  if (content === undefined || content === null) {
    return;
  }
  if (typeof content !== "string") {
    throw new AiProviderError("AI provider returned an invalid stream event.", {
      code: "invalid_response",
      providerId: "deepseek",
      retryable: false,
    });
  }

  return content;
}

export class DeepSeekProvider implements AiProvider {
  readonly id: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly maxTokens: number;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: DeepSeekProviderOptions = {}) {
    this.id = options.providerId ?? "deepseek";
    this.apiKey = (options.apiKey ?? process.env.DEEPSEEK_API_KEY ?? "").trim();
    this.baseUrl = (
      options.baseUrl ??
      process.env.DEEPSEEK_BASE_URL ??
      DEFAULT_BASE_URL
    ).replace(/\/+$/, "");
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.maxTokens =
      options.maxTokens ??
      envNumber("DEEPSEEK_MAX_TOKENS", DEFAULT_MAX_TOKENS);
    this.model = options.model ?? process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL;
    this.timeoutMs =
      options.timeoutMs ?? envNumber("DEEPSEEK_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
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
      throw new AiProviderError(
        "AI model output did not match the requested structure.",
        {
          cause: error,
          code: "invalid_model_output",
          providerId: this.id,
          retryable: false,
        }
      );
    }
  }

  generateText(request: GenerateTextRequest): Promise<string> {
    return this.complete(request, false);
  }

  streamText(request: StreamTextRequest): AsyncIterable<string> {
    return this.stream(request);
  }

  private requestBody(
    request: AiRequest,
    stream: boolean,
    structured: boolean
  ) {
    return {
      max_tokens: request.maxTokens ?? this.maxTokens,
      messages: request.messages,
      model: request.model ?? this.model,
      ...(structured ? { response_format: { type: "json_object" } } : {}),
      stream,
      ...(request.temperature === undefined
        ? {}
        : { temperature: request.temperature }),
    };
  }

  private async fetchCompletion(
    request: AiRequest,
    stream: boolean,
    structured: boolean,
    signal: AbortSignal
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

    const body = this.requestBody(request, stream, structured);
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      body: JSON.stringify(body),
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

  private async readJsonResponse(
    response: Response,
    abortSource: () => AbortSource
  ): Promise<Record<string, unknown>> {
    try {
      return assertPayload(await response.json());
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }
      if (abortSource()) {
        throw error;
      }
      throw new AiProviderError("AI provider returned invalid JSON.", {
        cause: error,
        code: "invalid_response",
        providerId: this.id,
        retryable: false,
      });
    }
  }

  private emitMetadata(
    payload: Record<string, unknown>,
    request: AiRequest
  ): void {
    const metadata = responseMetadata(payload);
    if (hasMetadata(metadata)) {
      request.onMetadata?.(metadata);
    }
  }

  private async complete(
    request: AiRequest,
    structured: boolean
  ): Promise<string> {
    const abortContext = createAbortContext(
      request.signal,
      request.timeoutMs ?? this.timeoutMs
    );

    try {
      const response = await this.fetchCompletion(
        request,
        false,
        structured,
        abortContext.signal
      );
      const payload = await this.readJsonResponse(response, abortContext.source);
      this.emitMetadata(payload, request);
      return completionContent(payload);
    } catch (error) {
      throw normalizedThrownError(this.id, error, abortContext.source());
    } finally {
      abortContext.cleanup();
    }
  }

  private async *stream(request: StreamTextRequest): AsyncIterable<string> {
    const abortContext = createAbortContext(
      request.signal,
      request.timeoutMs ?? this.timeoutMs
    );
    let receivedContent = false;

    try {
      const response = await this.fetchCompletion(
        request,
        true,
        false,
        abortContext.signal
      );
      if (!response.body) {
        throw new AiProviderError("AI provider returned an invalid stream.", {
          code: "invalid_response",
          providerId: this.id,
          retryable: false,
        });
      }

      for await (const item of parseJsonSseStream(
        response.body,
        abortContext.signal
      )) {
        if (item.type === "done") {
          break;
        }

        const payload = assertPayload(item.data);
        this.emitMetadata(payload, request);
        const content = streamContent(payload);
        if (content) {
          receivedContent = true;
          yield content;
        }
      }

      if (!receivedContent) {
        throw new AiProviderError("AI provider returned an empty stream.", {
          code: "invalid_response",
          providerId: this.id,
          retryable: false,
        });
      }
    } catch (error) {
      throw normalizedThrownError(this.id, error, abortContext.source());
    } finally {
      abortContext.cleanup();
    }
  }
}
