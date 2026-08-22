import {
  type DecisionStreamEvent,
  decisionStreamEventSchema,
} from "@/features/decision/stream-events";

const encoder = new TextEncoder();

export const NDJSON_CONTENT_TYPE = "application/x-ndjson; charset=utf-8";

export function encodeDecisionStreamEvent(event: DecisionStreamEvent): Uint8Array {
  const validated = decisionStreamEventSchema.parse(event);
  return encoder.encode(`${JSON.stringify(validated)}\n`);
}

export function createDecisionNdjsonResponse(
  stream: ReadableStream<Uint8Array>,
  init: ResponseInit = {}
): Response {
  const headers = new Headers(init.headers);
  headers.set("cache-control", "no-store");
  headers.set("content-type", NDJSON_CONTENT_TYPE);
  headers.set("x-content-type-options", "nosniff");

  return new Response(stream, {
    ...init,
    headers,
    status: init.status ?? 200,
  });
}
