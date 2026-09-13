#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tracked = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);

const findings = [];
const forbiddenFiles = [/(^|\/)\.env(\.|$)/i, /\.(p12|pfx|pem|key)$/i];
const allowedFiles = new Set([".env.example"]);
const secretPatterns = [
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ["github-token", /\bgh[pousr]_[A-Za-z0-9_]{24,}\b/g],
  ["github-pat", /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g],
  ["aws-access-key", /\bAKIA[0-9A-Z]{16}\b/g],
  ["api-secret", /\bsk-[A-Za-z0-9_-]{28,}\b/g],
];

for (const path of tracked) {
  if (!allowedFiles.has(path) && forbiddenFiles.some((pattern) => pattern.test(path))) {
    findings.push(`${path}: tracked secret-bearing filename`);
  }

  let content;
  try {
    content = readFileSync(path, "utf8");
  } catch {
    continue;
  }
  if (content.includes("\0")) {
    continue;
  }
  for (const [name, pattern] of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      findings.push(`${path}: ${name} pattern`);
    }
  }
}

const envExample = readFileSync(".env.example", "utf8");
for (const line of envExample.split(/\r?\n/)) {
  const match = /^([A-Z0-9_]*(?:KEY|PASSWORD|SECRET|TOKEN))=(.*)$/.exec(line.trim());
  if (match && match[2]?.trim()) {
    findings.push(`.env.example: ${match[1]} must stay empty`);
  }
}

if (findings.length > 0) {
  process.stderr.write(`Security scan failed:\n${findings.map((item) => `- ${item}`).join("\n")}\n`);
  process.exit(1);
}

process.stdout.write("SECURITY_SCAN_OK=1\n");
