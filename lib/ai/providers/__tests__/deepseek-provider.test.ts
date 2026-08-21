import assert from "node:assert/strict";
import test from "node:test";
import { DeepSeekProvider } from "../deepseek-provider";
import { AiProviderError } from "../provider-error";

const messages = [{ content: "Hello", role: "user" as const }];

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function streamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(body, { status: 200 });
}

async function expectProviderError(
  promise: Promise<unknown>,
  code: AiProviderError["code"]
): Promise<AiProviderError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof AiProviderError);
    assert.equal(error.code, code);
    return error;
  }
  assert.fail(`Expected AiProviderError with code ${code}`);
}

test("generateText returns normalized completion content", async () => {
  let requestBody: Record<string, unknown> | undefined;
  let metadata: unknown;
  const provider = new DeepSeekProvider({
    apiKey: "secret-value",
    baseUrl: "https://example.test/",
    fetch: (input, init) => {
      assert.equal(input, "https://example.test/chat/completions");
      requestBody = JSON.parse(String(init?.body));
      assert.equal(
        (init?.headers as Record<string, string>).authorization,
        "Bearer secret-value"
      );
      return Promise.resolve(
        jsonResponse({
          choices: [{ message: { content: "  answer  " } }],
          id: "completion-1",
          model: "deepseek-chat",
          usage: {
            completion_tokens: 3,
            prompt_tokens: 4,
            total_tokens: 7,
          },
        })
      );
    },
  });

  const result = await provider.generateText({
    messages,
    onMetadata(value) {
      metadata = value;
    },
    temperature: 0.2,
  });

  assert.equal(result, "answer");
  assert.deepEqual(requestBody, {
    max_tokens: 1800,
    messages,
    model: "deepseek-chat",
    stream: false,
    temperature: 0.2,
  });
  assert.deepEqual(metadata, {
    id: "completion-1",
    model: "deepseek-chat",
    usage: { completionTokens: 3, promptTokens: 4, totalTokens: 7 },
  });
});

test("generateText rejects empty content as invalid_response", async () => {
  const provider = new DeepSeekProvider({
    apiKey: "test-key",
    fetch: async () =>
      jsonResponse({ choices: [{ message: { content: " " } }] }),
  });

  await expectProviderError(
    provider.generateText({ messages }),
    "invalid_response"
  );
});

test("generateObject requests JSON and validates through caller parser", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const provider = new DeepSeekProvider({
    apiKey: "test-key",
    fetch: (_input, init) => {
      requestBody = JSON.parse(String(init?.body));
      return Promise.resolve(
        jsonResponse({
          choices: [{ message: { content: '{"answer":42}' } }],
        })
      );
    },
  });

  const result = await provider.generateObject({
    messages,
    parse(value) {
      assert.deepEqual(value, { answer: 42 });
      return value as { answer: number };
    },
  });

  assert.deepEqual(result, { answer: 42 });
  assert.deepEqual(requestBody?.response_format, { type: "json_object" });
});

test("generateObject maps malformed JSON to invalid_model_output", async () => {
  const provider = new DeepSeekProvider({
    apiKey: "test-key",
    fetch: async () =>
      jsonResponse({ choices: [{ message: { content: "not-json" } }] }),
  });

  await expectProviderError(
    provider.generateObject({ messages, parse: (value) => value }),
    "invalid_model_output"
  );
});

test("generateObject maps parser rejection to invalid_model_output", async () => {
  const provider = new DeepSeekProvider({
    apiKey: "test-key",
    fetch: async () =>
      jsonResponse({ choices: [{ message: { content: '{"answer":42}' } }] }),
  });

  await expectProviderError(
    provider.generateObject({
      messages,
      parse() {
        throw new Error("schema rejected raw model value");
      },
    }),
    "invalid_model_output"
  );
});

test("HTTP 401 maps to unauthorized without leaking response details", async () => {
  const provider = new DeepSeekProvider({
    apiKey: "super-secret-key",
    fetch: async () =>
      new Response('{"error":{"message":"super-secret-key bad"}}', {
        status: 401,
      }),
  });

  const error = await expectProviderError(
    provider.generateText({ messages }),
    "unauthorized"
  );
  assert.equal(error.retryable, false);
  assert.equal(error.status, 401);
  assert.doesNotMatch(error.message, /super-secret-key/);
});

test("HTTP 429 maps to retryable rate_limited", async () => {
  const provider = new DeepSeekProvider({
    apiKey: "test-key",
    fetch: async () => new Response(null, { status: 429 }),
  });

  const error = await expectProviderError(
    provider.generateText({ messages }),
    "rate_limited"
  );
  assert.equal(error.retryable, true);
  assert.equal(error.status, 429);
});

test("HTTP 500 maps to retryable provider_error", async () => {
  const provider = new DeepSeekProvider({
    apiKey: "test-key",
    fetch: async () => new Response(null, { status: 500 }),
  });

  const error = await expectProviderError(
    provider.generateText({ messages }),
    "provider_error"
  );
  assert.equal(error.retryable, true);
  assert.equal(error.status, 500);
});

test("malformed provider JSON maps to invalid_response", async () => {
  const provider = new DeepSeekProvider({
    apiKey: "test-key",
    fetch: async () => new Response("not-json", { status: 200 }),
  });

  await expectProviderError(
    provider.generateText({ messages }),
    "invalid_response"
  );
});

test("explicit timeout is distinct from caller abort", async () => {
  const provider = new DeepSeekProvider({
    apiKey: "test-key",
    fetch: (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () =>
            reject(
              init?.signal?.reason ?? new DOMException("Aborted", "AbortError")
            ),
          { once: true }
        );
      }),
  });

  const error = await expectProviderError(
    provider.generateText({ messages, timeoutMs: 5 }),
    "timeout"
  );
  assert.equal(error.retryable, true);
});

test("caller abort maps to aborted instead of timeout", async () => {
  const controller = new AbortController();
  const provider = new DeepSeekProvider({
    apiKey: "test-key",
    fetch: (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () =>
            reject(
              init?.signal?.reason ?? new DOMException("Aborted", "AbortError")
            ),
          { once: true }
        );
      }),
  });

  const request = provider.generateText({
    messages,
    signal: controller.signal,
    timeoutMs: 1000,
  });
  controller.abort(new DOMException("Caller cancelled", "AbortError"));

  const error = await expectProviderError(request, "aborted");
  assert.equal(error.retryable, false);
});

test("streamText emits text deltas and uses streaming request payload", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const metadata: unknown[] = [];
  const provider = new DeepSeekProvider({
    apiKey: "test-key",
    fetch: (_input, init) => {
      requestBody = JSON.parse(String(init?.body));
      return Promise.resolve(
        streamResponse([
          'data: {"id":"stream-1","model":"deepseek-chat","choices":[{"delta":{"content":"Hel"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
          "data: [DONE]\n\n",
        ])
      );
    },
  });

  const parts: string[] = [];
  for await (const part of provider.streamText({
    messages,
    onMetadata(value) {
      metadata.push(value);
    },
  })) {
    parts.push(part);
  }

  assert.deepEqual(parts, ["Hel", "lo"]);
  assert.equal(requestBody?.stream, true);
  assert.equal(requestBody?.response_format, undefined);
  assert.deepEqual(metadata[0], { id: "stream-1", model: "deepseek-chat" });
});
