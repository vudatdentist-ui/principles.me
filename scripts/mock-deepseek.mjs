#!/usr/bin/env node

import http from "node:http";

const port = Number(process.env.MOCK_DEEPSEEK_PORT || 4111);

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function goalDiscovery(userContent) {
  let draft = {};
  try {
    draft = JSON.parse(userContent || "{}");
  } catch {
    // The application should validate the model response even if the request is odd.
  }
  const questions = [
    ["desiredState", "What reality do you actually want to create?"],
    ["whyItMatters", "Why does this matter enough to organize your attention around it?"],
    ["successConditions", "What would make you say this desired reality is genuinely true?"],
    ["acceptedTradeoffs", "What are you willing to give up or deprioritize for this goal?"],
    ["nonNegotiables", "What boundary must remain true while you pursue this goal?"],
    ["measures", "Is there a useful measure that would help you see progress without replacing the goal?"],
  ];
  const unresolved = questions.find(([field]) => !String(draft[field] || "").trim());
  return unresolved
    ? { field: unresolved[0], kind: "question", question: unresolved[1] }
    : { kind: "ready", summary: String(draft.desiredState) };
}

function completionFor(body) {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const system = String(messages.find((item) => item?.role === "system")?.content || "");
  const user = String(messages.findLast((item) => item?.role === "user")?.content || "");

  if (system.includes("Goal Discovery capability")) {
    return goalDiscovery(user);
  }
  if (system.includes("only recognizes the Problem")) {
    return {
      gap: "Routine operating decisions still wait for the founder instead of the team owning them.",
      statement: "The founder remains a routine operating bottleneck.",
    };
  }
  if (system.includes("Reflect capability")) {
    return {
      confidence: 0.72,
      rationale: "Repeated waiting is evidence that decision ownership is not explicit enough.",
      rule: "Make the decision owner and default authority explicit before the next routine case.",
      trigger: "When routine decisions repeatedly wait for me",
    };
  }
  return { message: "unsupported mock prompt" };
}

const server = http.createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/chat/completions") {
    json(response, 404, { error: "not found" });
    return;
  }

  let raw = "";
  request.setEncoding("utf8");
  request.on("data", (chunk) => {
    raw += chunk;
  });
  request.on("end", () => {
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      json(response, 400, { error: "invalid json" });
      return;
    }
    const content = JSON.stringify(completionFor(body));
    json(response, 200, {
      choices: [{ message: { content, role: "assistant" } }],
      id: "mock-deepseek-phase2",
      model: "mock-deepseek",
      usage: { completion_tokens: 30, prompt_tokens: 30, total_tokens: 60 },
    });
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`MOCK_DEEPSEEK_READY=1 port=${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
