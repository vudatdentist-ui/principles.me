import { z } from "zod";

const retrieval = z.enum(["disabled", "empty", "ok", "unavailable"]);
const reference = z.object({
  key: z.string(),
  provider: z.enum(["brave", "ragflow"]),
  publishedAt: z.string().nullable(),
  retrievedAt: z.string(),
  snippet: z.string(),
  sourceType: z.enum(["live_web", "ragflow"]),
  title: z.string(),
  url: z
    .string()
    .nullable()
    .refine((url) => {
      if (url === null) return true;
      try {
        return ["https:", "http:"].includes(new URL(url).protocol);
      } catch {
        return false;
      }
    }),
});
const eventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("status"),
    message: z.string(),
    stage: z.enum(["retrieving", "answering"]),
  }),
  z.object({
    type: z.literal("sources"),
    references: z.array(reference),
    live: retrieval.optional(),
    personal: z.enum(["empty", "ok"]).optional(),
    private: retrieval.optional(),
  }),
  z.object({ type: z.literal("token"), token: z.string() }),
  z.object({
    type: z.literal("error"),
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  }),
  z.object({ type: z.literal("done") }),
]);
export type StreamEvent = z.infer<typeof eventSchema>;
export type RetrievalState = z.infer<typeof retrieval>;
export type PersonalContextState = "empty" | "ok";

export function parseEvent(line: string): StreamEvent | null {
  if (!line.trim()) return null;
  try {
    return eventSchema.parse(JSON.parse(line));
  } catch {
    throw new Error("Received an invalid response. Try again.");
  }
}

/** A terminal event ends the protocol, not merely the visual loading indicator. */
export async function consumeAskStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const consume = (line: string) => {
    const event = parseEvent(line);
    if (!event) return false;
    onEvent(event);
    return event.type === "done" || event.type === "error";
  };
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        if (newline > 1_048_576) throw new Error("Response was too large.");
        if (consume(buffer.slice(0, newline))) return;
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
      if (buffer.length > 1_048_576) throw new Error("Response was too large.");
      if (done) {
        if (consume(buffer)) return;
        throw new Error("Stream ended unexpectedly.");
      }
    }
  } finally {
    signal?.removeEventListener("abort", cancel);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
