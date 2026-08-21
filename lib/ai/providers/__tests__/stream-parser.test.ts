import assert from "node:assert/strict";
import test from "node:test";
import { AiProviderError } from "../provider-error";
import {
  createJsonSseDecoder,
  parseJsonSseStream,
  type JsonSseItem,
} from "../stream-parser";

async function collect(stream: ReadableStream<Uint8Array>): Promise<JsonSseItem[]> {
  const items: JsonSseItem[] = [];
  for await (const item of parseJsonSseStream(stream)) {
    items.push(item);
  }
  return items;
}

function byteStream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

test("SSE decoder handles events split across network chunks", () => {
  const decoder = createJsonSseDecoder();
  assert.deepEqual(decoder.push('data: {"choices":[{"delta":{"content":"Hel'), []);
  assert.deepEqual(
    decoder.push('lo"}}]}\n\n'),
    [
      {
        data: { choices: [{ delta: { content: "Hello" } }] },
        event: undefined,
        type: "event",
      },
    ]
  );
});

test("SSE decoder handles multiple events and blank lines in one chunk", () => {
  const decoder = createJsonSseDecoder();
  const items = decoder.push(
    '\n\ndata: {"n":1}\n\ndata: {"n":2}\n\n'
  );
  assert.deepEqual(items, [
    { data: { n: 1 }, event: undefined, type: "event" },
    { data: { n: 2 }, event: undefined, type: "event" },
  ]);
});

test("SSE decoder recognizes the DONE termination marker", () => {
  const decoder = createJsonSseDecoder();
  assert.deepEqual(decoder.push("data: [DONE]\n\n"), [{ type: "done" }]);
});

test("malformed SSE JSON becomes invalid_response", () => {
  const decoder = createJsonSseDecoder();
  assert.throws(
    () => decoder.push("data: {not-json}\n\n"),
    (error) => error instanceof AiProviderError && error.code === "invalid_response"
  );
});

test("provider error SSE event becomes provider_error", () => {
  const eventDecoder = createJsonSseDecoder();
  assert.throws(
    () =>
      eventDecoder.push(
        'event: error\ndata: {"message":"private detail"}\n\n'
      ),
    (error) =>
      error instanceof AiProviderError &&
      error.code === "provider_error" &&
      !error.message.includes("private detail")
  );

  const payloadDecoder = createJsonSseDecoder();
  assert.throws(
    () =>
      payloadDecoder.push(
        'data: {"error":{"message":"private detail"}}\n\n'
      ),
    (error) =>
      error instanceof AiProviderError &&
      error.code === "provider_error" &&
      !error.message.includes("private detail")
  );
});

test("stream parser preserves Unicode across multibyte chunk boundaries", async () => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode('data: {"text":"Xin chào 👋"}\n\ndata: [DONE]\n\n');
  const emoji = encoder.encode("👋");
  const emojiStart = bytes.findIndex((_value, index) =>
    emoji.every((emojiByte, offset) => bytes[index + offset] === emojiByte)
  );
  assert.ok(emojiStart > 0);

  const chunks = [
    bytes.slice(0, emojiStart + 1),
    bytes.slice(emojiStart + 1, emojiStart + 3),
    bytes.slice(emojiStart + 3),
  ];
  const items = await collect(byteStream(chunks));

  assert.deepEqual(items, [
    { data: { text: "Xin chào 👋" }, event: undefined, type: "event" },
    { type: "done" },
  ]);
});
