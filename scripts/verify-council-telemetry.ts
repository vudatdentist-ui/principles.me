import {
  buildCouncilTelemetry,
  summarizeRetrievalScores,
} from "@/lib/observability/council-telemetry";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const scores = summarizeRetrievalScores([0.9, 0.7, null, 0.8]);
assert(scores.max === 0.9, "Telemetry retrieval max score is wrong.");
assert(scores.min === 0.7, "Telemetry retrieval min score is wrong.");
assert(scores.avg === 0.8, "Telemetry retrieval average score is wrong.");

const telemetry = buildCouncilTelemetry({
  citationCount: 3,
  decisionId: "11111111-1111-4111-8111-111111111111",
  errorCode: null,
  errorStage: null,
  grounded: true,
  model: "deepseek-chat",
  modelLatencyMs: 812,
  promptInjectionFlagCount: 1,
  retrievalLatencyMs: 241,
  retrievalQueryCount: 7,
  retrievalScoreAvg: scores.avg,
  retrievalScoreMax: scores.max,
  retrievalScoreMin: scores.min,
  retrievedChunks: 6,
  successfulRetrievalQueryCount: 7,
});

const allowedKeys = new Set([
  "citationCount",
  "decisionId",
  "errorCode",
  "errorStage",
  "event",
  "grounded",
  "model",
  "modelLatencyMs",
  "promptInjectionFlagCount",
  "retrievalLatencyMs",
  "retrievalQueryCount",
  "retrievalScoreAvg",
  "retrievalScoreMax",
  "retrievalScoreMin",
  "retrievedChunks",
  "successfulRetrievalQueryCount",
  "timestamp",
]);
const actualKeys = Object.keys(telemetry);
assert(
  actualKeys.every((key) => allowedKeys.has(key)),
  `Council telemetry contains an unexpected key: ${actualKeys
    .filter((key) => !allowedKeys.has(key))
    .join(", ")}`
);
assert(
  actualKeys.length === allowedKeys.size,
  "Council telemetry allowlist and emitted shape differ."
);

const serialized = JSON.stringify(telemetry).toLowerCase();
for (const sensitiveKey of [
  "question",
  "context",
  "evidence",
  "sourceText",
  "prompt",
  "apiKey",
  "secret",
  "token",
  "userId",
]) {
  assert(
    !serialized.includes(sensitiveKey.toLowerCase()),
    `Council telemetry leaked sensitive field name: ${sensitiveKey}`
  );
}

assert(telemetry.event === "council_run", "Council telemetry event is wrong.");
assert(telemetry.grounded, "Council telemetry grounded flag is wrong.");
assert(
  telemetry.decisionId === "11111111-1111-4111-8111-111111111111",
  "Council telemetry decisionId is missing."
);
assert(
  telemetry.model === "deepseek-chat",
  "Council telemetry model is wrong."
);

console.log("Council telemetry verification passed.");
