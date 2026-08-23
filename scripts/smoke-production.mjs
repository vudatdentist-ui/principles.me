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

async function ask(cookie) {
  return fetch(`${baseUrl}/api/ask`, {
    body: JSON.stringify({
      question: "Summarize what the knowledge base says about making better decisions.",
    }),
    headers: {
      ...(cookie ? { cookie } : {}),
      "content-type": "application/json",
    },
    method: "POST",
    signal: controller.signal,
  });
}

try {
  const health = await fetch(`${baseUrl}/api/health`, {
    cache: "no-store",
    signal: controller.signal,
  });
  if (!health.ok) {
    throw new Error(`Health smoke returned HTTP ${health.status}.`);
  }

  const unauthenticated = await ask("");
  if (unauthenticated.status !== 401) {
    throw new Error(
      `Unauthenticated ask returned ${unauthenticated.status}; expected 401.`
    );
  }
  console.log("AUTH_BOUNDARY_SMOKE=1");

  const email = process.env.SMOKE_EMAIL?.trim();
  const password = process.env.SMOKE_PASSWORD;
  if (!email || !password) {
    console.log("AUTHENTICATED_QA_SMOKE=SKIPPED");
  } else {
    const signin = await fetch(`${baseUrl}/api/auth/signin`, {
      body: JSON.stringify({ email, password }),
      headers: { "content-type": "application/json" },
      method: "POST",
      signal: controller.signal,
    });
    if (!signin.ok) {
      throw new Error(`Smoke sign in returned HTTP ${signin.status}.`);
    }
    const setCookie = signin.headers.get("set-cookie") || "";
    const cookie = setCookie.split(";")[0];
    if (!cookie.includes("principles_session=")) {
      throw new Error("Smoke sign in did not return a session cookie.");
    }

    const response = await ask(cookie);
    if (!response.ok) {
      throw new Error(`Authenticated ask smoke returned HTTP ${response.status}.`);
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
    console.log(`AUTHENTICATED_QA_SMOKE=1 events=${events.length}`);
  }
} finally {
  clearTimeout(timeout);
}
