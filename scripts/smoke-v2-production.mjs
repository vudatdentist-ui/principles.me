#!/usr/bin/env node

const baseUrl = (process.argv[2] || process.env.SMOKE_BASE_URL || "").replace(
  /\/+$/,
  ""
);

if (!baseUrl) {
  throw new Error("A smoke-test base URL is required.");
}

const response = await fetch(`${baseUrl}/api/v2/decisions`, {
  body: JSON.stringify({
    question:
      "Should a small, reversible product change be piloted before a full rollout?",
  }),
  headers: { "content-type": "application/json" },
  method: "POST",
  signal: AbortSignal.timeout(110_000),
});

if (!response.ok) {
  throw new Error(`Decision smoke request failed with HTTP ${response.status}.`);
}

const contentType = response.headers.get("content-type") || "";
if (!contentType.includes("application/x-ndjson")) {
  throw new Error("Decision smoke request did not return NDJSON.");
}

const body = await response.text();
const events = body
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const types = events.map((event) => event?.type);
const failure = events.find((event) => event?.type === "error");

if (failure) {
  throw new Error(
    `Decision smoke stream failed with ${String(failure.code || "unknown_error")}.`
  );
}

const startedIndex = types.indexOf("started");
const briefIndex = types.indexOf("brief");
const doneIndex = types.indexOf("done");

if (startedIndex !== 0) {
  throw new Error("Decision smoke stream did not start correctly.");
}
if (!types.includes("status")) {
  throw new Error("Decision smoke stream emitted no status events.");
}
if (briefIndex < 0 || doneIndex < 0 || briefIndex > doneIndex) {
  throw new Error("Decision smoke stream did not complete with brief then done.");
}
if (events.filter((event) => event?.type === "brief").length !== 1) {
  throw new Error("Decision smoke stream emitted an unexpected brief count.");
}
if (events.filter((event) => event?.type === "done").length !== 1) {
  throw new Error("Decision smoke stream emitted an unexpected done count.");
}

process.stdout.write(`V2_DECISION_SMOKE=1 events=${types.join(">")}\n`);
