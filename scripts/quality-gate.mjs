#!/usr/bin/env node

import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const agents = read("AGENTS.md");
const roadmap = read("ROADMAP.md");
const context = read("PROJECT_CONTEXT.md");
const analytics = read("features/analytics/product-insights.ts");
const exportRoute = read("app/api/account/export/route.ts");
const deleteRoute = read("app/api/account/delete/route.ts");
const logger = read("lib/observability/logger.ts");

requireCondition(agents.split(/\r?\n/).length <= 180, "AGENTS.md must remain a map, not an encyclopedia.");
requireCondition(agents.includes("CURRENT SOURCE OF TRUTH"), "AGENTS.md must identify current source of truth.");
requireCondition(roadmap.includes("Phase 6"), "ROADMAP.md must describe the current Phase 6 boundary.");
requireCondition(!roadmap.includes("No Phase 6 or other next major phase is implied"), "ROADMAP.md contains retired pre-Phase-6 guidance.");
requireCondition(context.includes("Product Recenter / Evolution Engine"), "PROJECT_CONTEXT.md must identify the current product phase.");

for (const forbidden of ["content", "statement", "learning", "surprise", "rule", "email", "metadata"]) {
  const selectPattern = new RegExp(`SELECT[^;]*\\b${forbidden}\\b`, "is");
  requireCondition(!selectPattern.test(analytics), `Product analytics must not select raw ${forbidden}.`);
}
requireCondition(analytics.includes("workspace_id, event_type, happened_at"), "Product analytics must stay event-metadata only.");

for (const route of [exportRoute, deleteRoute]) {
  requireCondition(route.includes("assertTrustedOrigin"), "Sensitive account routes must enforce trusted origin.");
  requireCondition(route.includes("verifyPassword"), "Sensitive account routes must require password re-authentication.");
  requireCondition(route.includes("consumeRateLimit"), "Sensitive account routes must be rate limited.");
}
requireCondition(deleteRoute.includes('z.literal("DELETE MY ACCOUNT")'), "Account deletion needs explicit destructive confirmation.");

for (const key of ["password", "token", "secret", "prompt", "content", "question", "email"]) {
  requireCondition(logger.toLowerCase().includes(key), `Observability redaction must cover ${key}.`);
}

process.stdout.write("QUALITY_GATE_OK=1\n");
