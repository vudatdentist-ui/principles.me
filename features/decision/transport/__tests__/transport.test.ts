import assert from "node:assert/strict";
import test from "node:test";
import type { DecisionBrief } from "@/features/decision/contracts";
import type { DecisionStreamEvent } from "@/features/decision/stream-events";
import type { EvidenceReference } from "@/features/evidence/contracts";
import {
  createDecisionPostHandler,
  encodeDecisionStreamEvent,
  NDJSON_CONTENT_TYPE,
  parseDecisionRequest,
  type DecisionTransportRunner,
} from "@/features/decision/transport";

const reference: EvidenceReference = {
  chunkId: "chunk-1",
  datasetId: "dataset-1",
  documentId: "document-1",
  key: "R1",
  observedAt: null,
  positions: [],
  provider: "test-rag",
  publishedAt: null,
  retrievedAt: "2026-08-21T12:00:00.000Z",
  score: 0.91,
  sourceType: "ragflow",
  text: "Grounded evidence for the recommendation.",
  title: "Test evidence",
  url: null,
};

const brief: DecisionBrief = {
  confidence: {
    explanation: "The available evidence directly supports the key fact.",
    level: "medium",
  },
  counterCase:
    "The recommendation could change if the underlying constraint changes.",
  id: "brief-1",
  nextAction: "Validate the constraint with the owner tomorrow.",
  question: "Should we make this decision now?",
  reasons: [
    {
      citationKeys: ["R1"],
      id: "reason-1",
      kind: "fact",
      text: "The current evidence supports acting now.",
    },
  ],
  recommendation: "Proceed with the reversible first step.",
  review: {
    suggestedAt: "2026-09-01T00:00:00.000Z",
    trigger: "Review if the constraint changes.",
  },
  runId: "run-1",
  schemaVersion: "1",
  sources: [reference],
  unknowns: ["Long-term impact is not yet known."],
  validAsOf: "2026-08-21T12:00:00.000Z",
};

function request(body: unknown, signal?: AbortSignal): Request {
  return new Request("http://localhost/api/v2/decisions", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
    signal,
  });
}

function parseLines(body: string): DecisionStreamEvent[] {
  assert.ok(body.endsWith("\n"));
  return body
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as DecisionStreamEvent);
}

function successfulRunner(
  options: { includeRevision?: boolean; statusMessage?: string } = {}
): DecisionTransportRunner {
  return async ({ onProgress, onStarted }) => {
    await onStarted?.("run-1");
    await onProgress?.({ stage: "context" });
    await onProgress?.({ references: [reference], stage: "retrieval" });
    await onProgress?.({
      message: options.statusMessage,
      stage: "analysis",
    });
    await onProgress?.({ stage: "audit" });
    if (options.includeRevision) {
      await onProgress?.({ stage: "revision" });
    }
    await onProgress?.({ stage: "persistence" });
    return { brief, runId: "run-1" };
  };
}

test("rejects invalid, empty, and client-supplied tenant fields", async () => {
  const empty = await parseDecisionRequest(request({ question: "   " }));
  assert.deepEqual(empty, {
    code: "invalid_request",
    message: "Request must contain only a non-empty question.",
    ok: false,
  });

  const injectedTenant = await parseDecisionRequest(
    request({ question: "A valid question", userId: "other-user" })
  );
  assert.equal(injectedTenant.ok, false);

  const invalidJson = await parseDecisionRequest(
    new Request("http://localhost/api/v2/decisions", {
      body: "{",
      method: "POST",
    })
  );
  assert.equal(invalidJson.ok, false);
  if (!invalidJson.ok) {
    assert.equal(invalidJson.code, "invalid_json");
  }
});

test("returns 401 before invoking the orchestrator when unauthenticated", async () => {
  let calls = 0;
  const handler = createDecisionPostHandler({
    resolveUserId: async () => null,
    runner: async () => {
      calls += 1;
      return { brief, runId: "run-1" };
    },
  });

  const response = await handler(request({ question: "Should we proceed?" }));
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
  assert.deepEqual(await response.json(), {
    error: {
      code: "unauthenticated",
      message: "Authentication is required.",
    },
  });
});

test("returns 400 for invalid authenticated requests without invoking the orchestrator", async () => {
  let calls = 0;
  const handler = createDecisionPostHandler({
    resolveUserId: async () => "user-123",
    runner: async () => {
      calls += 1;
      return { brief, runId: "run-1" };
    },
  });

  const response = await handler(request({ question: "   " }));
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
  assert.deepEqual(await response.json(), {
    error: {
      code: "invalid_request",
      message: "Request must contain only a non-empty question.",
    },
  });
});

test("frames the frozen event lifecycle as exact newline-delimited JSON", async () => {
  let observedUserId = "";
  let observedQuestion = "";
  const runner: DecisionTransportRunner = async (input) => {
    observedUserId = input.userId;
    observedQuestion = input.question;
    return successfulRunner()(input);
  };
  const handler = createDecisionPostHandler({
    resolveUserId: async () => "user-123",
    runner,
  });

  const response = await handler(
    request({ question: "  Should we proceed?  " })
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), NDJSON_CONTENT_TYPE);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(observedUserId, "user-123");

  const body = await response.text();
  const events = parseLines(body);
  assert.equal(observedQuestion, "Should we proceed?");
  assert.deepEqual(
    events.map((event) =>
      event.type === "status" ? `${event.type}:${event.stage}` : event.type
    ),
    [
      "started",
      "status:context",
      "status:retrieval",
      "evidence",
      "status:analysis",
      "status:audit",
      "status:persistence",
      "brief",
      "done",
    ]
  );
});

test("emits revision only when the orchestrator reports that stage", async () => {
  const handler = createDecisionPostHandler({
    resolveUserId: async () => "user-123",
    runner: successfulRunner({ includeRevision: true }),
  });

  const response = await handler(request({ question: "Should we proceed?" }));
  const events = parseLines(await response.text());
  assert.equal(
    events.filter(
      (event) => event.type === "status" && event.stage === "revision"
    ).length,
    1
  );
});

test("emits one safe typed error after streaming starts without leaking internals", async () => {
  const rawSecret = "SQL postgres://secret@database and provider API key";
  const runner: DecisionTransportRunner = async ({ onProgress, onStarted }) => {
    await onStarted?.("run-1");
    await onProgress?.({ stage: "analysis" });
    const error = Object.assign(new Error(rawSecret), {
      code: "provider_error",
      retryable: true,
    });
    throw error;
  };
  const handler = createDecisionPostHandler({
    resolveUserId: async () => "user-123",
    runner,
  });

  const response = await handler(request({ question: "Should we proceed?" }));
  const body = await response.text();
  const events = parseLines(body);
  assert.equal(events.at(-1)?.type, "error");
  assert.equal(events.filter((event) => event.type === "error").length, 1);
  assert.equal(events.some((event) => event.type === "done"), false);
  assert.equal(body.includes(rawSecret), false);
  assert.deepEqual(events.at(-1), {
    code: "provider_error",
    message: "A decision dependency is temporarily unavailable.",
    retryable: true,
    type: "error",
  });
});

test("propagates the request abort signal and terminates with a safe abort event", async () => {
  const abortController = new AbortController();
  let observedSignal: AbortSignal | undefined;
  const runner: DecisionTransportRunner = async ({ signal, onStarted }) => {
    observedSignal = signal;
    await onStarted?.("run-1");
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true }
      );
    });
    return { brief, runId: "run-1" };
  };
  const handler = createDecisionPostHandler({
    resolveUserId: async () => "user-123",
    runner,
  });

  const abortableRequest = request(
    { question: "Should we proceed?" },
    abortController.signal
  );
  const response = await handler(abortableRequest);
  abortController.abort();
  const events = parseLines(await response.text());

  assert.equal(observedSignal, abortableRequest.signal);
  assert.equal(observedSignal?.aborted, true);
  assert.deepEqual(events.at(-1), {
    code: "aborted",
    message: "Decision run was cancelled.",
    retryable: true,
    type: "error",
  });
});

test("multiline and unicode values stay inside one valid JSON line", () => {
  const bytes = encodeDecisionStreamEvent({
    message: "Dòng một\nDòng hai — dữ liệu ✓",
    stage: "analysis",
    type: "status",
  });
  const line = new TextDecoder().decode(bytes);

  assert.equal(line.endsWith("\n"), true);
  assert.equal(line.slice(0, -1).includes("\n"), false);
  assert.deepEqual(JSON.parse(line), {
    message: "Dòng một\nDòng hai — dữ liệu ✓",
    stage: "analysis",
    type: "status",
  });
});
