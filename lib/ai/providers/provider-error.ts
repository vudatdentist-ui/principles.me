export type AiProviderErrorCode =
  | "aborted"
  | "timeout"
  | "unauthorized"
  | "rate_limited"
  | "provider_error"
  | "invalid_response"
  | "invalid_model_output";

type AiProviderErrorOptions = ErrorOptions & {
  code: AiProviderErrorCode;
  providerId?: string;
  retryable: boolean;
  status?: number;
};

export class AiProviderError extends Error {
  readonly code: AiProviderErrorCode;
  readonly providerId?: string;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(message: string, options: AiProviderErrorOptions) {
    super(message, { cause: options.cause });
    this.name = "AiProviderError";
    this.code = options.code;
    this.providerId = options.providerId;
    this.retryable = options.retryable;
    this.status = options.status;
  }
}

export function providerHttpError(
  providerId: string,
  status: number
): AiProviderError {
  if (status === 401 || status === 403) {
    return new AiProviderError("AI provider authorization failed.", {
      code: "unauthorized",
      providerId,
      retryable: false,
      status,
    });
  }

  if (status === 429) {
    return new AiProviderError("AI provider rate limit was reached.", {
      code: "rate_limited",
      providerId,
      retryable: true,
      status,
    });
  }

  return new AiProviderError("AI provider request failed.", {
    code: "provider_error",
    providerId,
    retryable: status === 408 || status >= 500,
    status,
  });
}
