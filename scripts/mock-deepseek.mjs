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
  if (system.includes("You are the Diagnose capability inside Principles")) {
    return {
      alternativeHypotheses:
        "Workload or capability gaps could also delay decisions; current evidence does not rule them out.",
      confidence: 0.68,
      contradictingEvidence:
        "Responsibilities were discussed, so role awareness exists even though authority remains ambiguous.",
      proximateCause:
        "Decision ownership is discussed but default authority is not explicit.",
      rootCauseHypothesis:
        "Routine decisions have no explicit default owner with authority to act without founder approval.",
      supportingEvidence:
        "Repeated routine decisions waited for founder input across separate cases.",
      symptom: "Routine operating decisions wait for the founder.",
      uncertainty:
        "No direct measure yet proves which mechanism dominates; this is the strongest current hypothesis.",
    };
  }
  if (system.includes("You are the Design capability inside Principles")) {
    return {
      actions: [
        "Name the decision owner and authority boundary.",
        "Publish the rule where the team handles routine work.",
        "Run the next three routine decisions under the new rule.",
      ],
      expectedResult:
        "Routine operating decisions are made without waiting for founder approval.",
      machineChange:
        "Assign one explicit decision owner and a default authority boundary for routine operating decisions.",
      rationale:
        "The design removes ambiguity at the point where routine decisions currently wait for founder approval.",
      successSignal:
        "For two weeks, routine operating decisions proceed without founder intervention.",
    };
  }
  if (system.includes("Learning Pattern capability")) {
    return {
      caseKeys: ["C1", "C2"],
      confidence: 0.78,
      contradictingEvidence:
        "The history covers one Problem before and after one intervention, so it does not prove a broad recurring trait.",
      implication:
        "When a recurring decision depends on you, change the default authority rule and observe behavior instead of relying on role discussion alone.",
      kind: "design_learning",
      principleRevision: {
        principleKey: "P1",
        proposedRationale:
          "The before/after cases show that explicit default authority changed behavior while discussing responsibilities alone did not.",
        proposedRule:
          "Name the decision owner and their default authority before the next routine case, then verify the next real outcome.",
        proposedTrigger:
          "When routine decisions wait for me after responsibilities have already been discussed",
      },
      statement:
        "Explicit default authority changed behavior where discussing responsibilities alone had not.",
      supportingEvidence:
        "Before the machine change, routine decisions waited for founder input; after the authority rule, the next cases moved without waiting.",
      uncertainty:
        "This is one before/after cycle, so the causal interpretation should remain a hypothesis and be tested again.",
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
      id: "mock-deepseek-phase4",
      model: "mock-deepseek",
      usage: { completion_tokens: 70, prompt_tokens: 70, total_tokens: 140 },
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
