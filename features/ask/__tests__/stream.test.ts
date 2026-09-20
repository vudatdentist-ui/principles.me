import assert from "node:assert/strict";
import test from "node:test";
import { consumeAskStream, parseEvent, type StreamEvent } from "../stream";

const encoder = new TextEncoder();
function body(text: string, chunkSize = 7) {
  const bytes = encoder.encode(text);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let index = 0; index < bytes.length; index += chunkSize) {
        controller.enqueue(bytes.slice(index, index + chunkSize));
      }
      controller.close();
    },
  });
}
function lines(events: unknown[]) {
  return events.map((event) => JSON.stringify(event)).join("\n");
}

test("fragmented UTF-8 and a final line without newline are decoded once", async () => {
  const events: StreamEvent[] = [];
  const token = "Ch\u1ee9ng c\u1ee9, not assumptions \u2014 \ud83c\udf31";
  const stream = body(lines([{ type: "token", token }, { type: "done" }]), 1);
  await consumeAskStream(stream, (event) => events.push(event));
  assert.deepEqual(events, [{ type: "token", token }, { type: "done" }]);
  assert.equal(stream.locked, false);
});

test("first terminal error cannot be overwritten by done or later tokens", async () => {
  const expected = [
    { type: "token", token: "Partial answer" },
    {
      type: "error",
      code: "UPSTREAM",
      message: "Interrupted",
      retryable: true,
    },
  ];
  const events: StreamEvent[] = [];
  await consumeAskStream(
    body(
      lines([
        ...expected,
        { type: "done" },
        { type: "token", token: "Ignore" },
      ]),
    ),
    (event) => events.push(event),
  );
  assert.deepEqual(events, expected);
});

test("done cancels the transport and ignores trailing malformed content", async () => {
  let canceled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('{"type":"done"}\nnot json'));
    },
    cancel() {
      canceled = true;
    },
  });
  const events: StreamEvent[] = [];
  await consumeAskStream(stream, (event) => events.push(event));
  assert.deepEqual(events, [{ type: "done" }]);
  assert.equal(canceled, true);
  assert.equal(stream.locked, false);
});

test("unexpected EOF keeps partial output but reports an incomplete answer", async () => {
  const events: StreamEvent[] = [];
  await assert.rejects(
    consumeAskStream(body('{"type":"token","token":"Partial"}\n'), (event) =>
      events.push(event),
    ),
    /Stream ended unexpectedly/,
  );
  assert.deepEqual(events, [{ type: "token", token: "Partial" }]);
});

test("malformed or unsupported events fail closed", () => {
  for (const line of [
    '{"type":"token","token":42}',
    '{"type":"done"',
    '{"type":"unknown"}',
    "null",
  ]) {
    assert.throws(() => parseEvent(line), /invalid response/);
  }
  assert.equal(parseEvent(" \r\n"), null);
});

test("sources reject executable link schemes but accept HTTP evidence", () => {
  const reference = {
    key: "K1",
    provider: "brave",
    publishedAt: null,
    retrievedAt: "2026-09-20T00:00:00Z",
    snippet: "Evidence",
    sourceType: "live_web",
    title: "Source",
    url: "https://example.com/evidence",
  };
  const event = {
    type: "sources",
    references: [reference],
    private: "disabled",
    live: "ok",
    personal: "empty",
  };
  assert.equal(parseEvent(JSON.stringify(event))?.type, "sources");
  assert.throws(
    () =>
      parseEvent(
        JSON.stringify({
          ...event,
          references: [{ ...reference, url: "javascript:alert(1)" }],
        }),
      ),
    /invalid response/,
  );
});

test("aborting a pending read releases the reader without reporting completion", async () => {
  const controller = new AbortController();
  let canceled = false;
  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      canceled = true;
    },
  });
  const events: StreamEvent[] = [];
  const consumption = consumeAskStream(
    stream,
    (event) => events.push(event),
    controller.signal,
  );
  controller.abort();
  await assert.rejects(consumption, { name: "AbortError" });
  assert.deepEqual(events, []);
  assert.equal(canceled, true);
  assert.equal(stream.locked, false);
});

test("oversized unterminated messages fail instead of retaining unbounded data", async () => {
  await assert.rejects(
    consumeAskStream(body("x".repeat(1_048_577), 524288), () => undefined),
    /too large/,
  );
});
