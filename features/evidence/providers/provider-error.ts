export type EvidenceProviderErrorCode =
  | "aborted"
  | "timeout"
  | "unauthorized"
  | "rate_limited"
  | "provider_error"
  | "invalid_response";

const SAFE_MESSAGES: Record<EvidenceProviderErrorCode, string> = {
  aborted: "Evidence retrieval was aborted.",
  invalid_response: "The evidence provider returned an invalid response.",
  provider_error: "The evidence provider request failed.",
  rate_limited: "The evidence provider rate limit was reached.",
  timeout: "The evidence provider request timed out.",
  unauthorized: "The evidence provider rejected authentication.",
};

export class EvidenceProviderError extends Error {
  readonly code: EvidenceProviderErrorCode;
  readonly provider: string;
  readonly status: number | null;

  constructor(
    provider: string,
    code: EvidenceProviderErrorCode,
    options: { cause?: unknown; message?: string; status?: number | null } = {}
  ) {
    super(options.message ?? SAFE_MESSAGES[code], { cause: options.cause });
    this.name = "EvidenceProviderError";
    this.code = code;
    this.provider = provider;
    this.status = options.status ?? null;
  }
}

export function providerHttpError(
  provider: string,
  status: number
): EvidenceProviderError {
  if (status === 401 || status === 403) {
    return new EvidenceProviderError(provider, "unauthorized", { status });
  }
  if (status === 429) {
    return new EvidenceProviderError(provider, "rate_limited", { status });
  }
  return new EvidenceProviderError(provider, "provider_error", { status });
}

export function providerInvalidResponseError(
  provider: string,
  cause: unknown
): EvidenceProviderError {
  return new EvidenceProviderError(provider, "invalid_response", { cause });
}

export type AbortKind = "aborted" | "timeout" | null;

export interface ProviderAbortScope {
  readonly signal: AbortSignal;
  dispose: () => void;
  kind: () => AbortKind;
}

export function createProviderAbortScope(
  parentSignal: AbortSignal,
  timeoutMs: number
): ProviderAbortScope {
  const controller = new AbortController();
  let abortKind: AbortKind = null;

  const abortFromParent = () => {
    if (abortKind !== null) {
      return;
    }
    abortKind = "aborted";
    controller.abort(parentSignal.reason);
  };

  if (parentSignal.aborted) {
    abortFromParent();
  } else {
    parentSignal.addEventListener("abort", abortFromParent, { once: true });
  }

  const timer = setTimeout(() => {
    if (abortKind !== null) {
      return;
    }
    abortKind = "timeout";
    controller.abort(new DOMException("Evidence provider timeout.", "TimeoutError"));
  }, Math.max(0, timeoutMs));

  return {
    dispose: () => {
      clearTimeout(timer);
      parentSignal.removeEventListener("abort", abortFromParent);
    },
    kind: () => abortKind,
    signal: controller.signal,
  };
}

export function providerTransportError(
  provider: string,
  kind: AbortKind,
  cause: unknown
): EvidenceProviderError {
  if (kind === "aborted") {
    return new EvidenceProviderError(provider, "aborted", { cause });
  }
  if (kind === "timeout") {
    return new EvidenceProviderError(provider, "timeout", { cause });
  }
  return new EvidenceProviderError(provider, "provider_error", { cause });
}
