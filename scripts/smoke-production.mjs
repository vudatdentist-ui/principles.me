#!/usr/bin/env node

const baseUrl = (process.argv[2] || process.env.SMOKE_BASE_URL || "").replace(/\/$/, "");
if (!baseUrl) {
  throw new Error("Base URL is required.");
}

const controller = new AbortController();
const timeout = setTimeout(
  () => controller.abort(new DOMException("Smoke timed out", "TimeoutError")),
  90_000
);

try {
  const response = await fetch(`${baseUrl}/api/ask`, {
    body: JSON.stringify({
      question: "Summarize what the knowledge base says about making better decisions.",
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
    signal: controller.signal,
  });

  if (!response.ok) {
    throw new Error(`Ask smoke returned HTTP ${response.status}.`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/x-ndjson")) {
    throw new Error(`Unexpected content type: ${contentType || "missing"}.`);
  }

  const body = await response.text();
  const events = body
    .split(/\r?\n/)
    .filter(Boolean)
    .map((row) => JSON.parse(row));

  const error = events.find((event) => event.type === "error");
  if (error) {
    throw new Error(`Ask smoke failed with ${error.code || "unknown_error"}.`);
  }
  if (!events.some((event) => event.type === "sources")) {
    throw new Error("Ask smoke did not emit a sources event.");
  }
  if (!events.some((event) => event.type === "token" && event.token)) {
    throw new Error("Ask smoke did not emit answer content.");
  }
  if (events.at(-1)?.type !== "done") {
    throw new Error("Ask smoke did not terminate with done.");
  }

  console.log(`KNOWLEDGE_QA_SMOKE=1 events=${events.length}`);
} finally {
  clearTimeout(timeout);
}
