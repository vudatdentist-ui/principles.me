import type { JsonSnapshot, JsonValue } from "../persistence";

function toJsonValue(value: unknown, path: string): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} contains a non-finite number.`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => toJsonValue(item, `${path}[${index}]`));
  }
  if (typeof value === "object" && value !== null) {
    const snapshot: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) {
        continue;
      }
      snapshot[key] = toJsonValue(item, `${path}.${key}`);
    }
    return snapshot;
  }
  throw new TypeError(`${path} contains a non-JSON value.`);
}

export function toJsonSnapshot(value: unknown): JsonSnapshot {
  const snapshot = toJsonValue(value, "snapshot");
  if (snapshot === null) {
    throw new TypeError("Snapshot root cannot be null.");
  }
  return snapshot;
}
