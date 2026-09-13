type LogLevel = "debug" | "info" | "warn" | "error";
type LogFields = Readonly<Record<string, unknown>>;

const SENSITIVE_KEY = /(authorization|cookie|password|secret|token|api[_-]?key|prompt|content|question|reflection|goal|email)/i;

function safeScalar(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

export function redactLogFields(fields: LogFields): Record<string, string | number | boolean | null> {
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    safe[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : safeScalar(value);
  }
  return safe;
}

export function errorFields(error: unknown): Record<string, string | boolean | null> {
  if (!error || typeof error !== "object") {
    return { errorName: typeof error, retryable: null };
  }
  const candidate = error as {
    code?: unknown;
    name?: unknown;
    retryable?: unknown;
  };
  return {
    errorCode: typeof candidate.code === "string" ? candidate.code : null,
    errorName: typeof candidate.name === "string" ? candidate.name : "Error",
    retryable: typeof candidate.retryable === "boolean" ? candidate.retryable : null,
  };
}

export function logEvent(level: LogLevel, event: string, fields: LogFields = {}): void {
  const entry = {
    event,
    level,
    timestamp: new Date().toISOString(),
    ...redactLogFields(fields),
  };
  const serialized = JSON.stringify(entry);
  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}
