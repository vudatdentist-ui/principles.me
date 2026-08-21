import type { DecisionStreamEvent } from "@/features/decision/stream-events";

export function encodeDecisionEventsAsNdjson(
  events: readonly DecisionStreamEvent[]
): string {
  if (events.length === 0) {
    return "";
  }

  return `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
}

export function splitTextIntoChunks(
  text: string,
  chunkSizes: readonly number[]
): string[] {
  if (text.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let offset = 0;
  let sizeIndex = 0;

  while (offset < text.length) {
    const requestedSize = chunkSizes[sizeIndex] ?? text.length;
    const size = Math.max(1, requestedSize);
    chunks.push(text.slice(offset, offset + size));
    offset += size;
    sizeIndex += 1;
  }

  return chunks;
}
