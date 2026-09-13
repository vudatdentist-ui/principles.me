import assert from "node:assert/strict";
import test from "node:test";
import { errorFields, redactLogFields } from "../logger";

test("redacts secret and user-content shaped fields", () => {
  assert.deepEqual(
    redactLogFields({
      durationMs: 42,
      password: "secret",
      prompt: "private prompt",
      provider: "codex",
      question: "private question",
      token: "secret-token",
    }),
    {
      durationMs: 42,
      password: "[redacted]",
      prompt: "[redacted]",
      provider: "codex",
      question: "[redacted]",
      token: "[redacted]",
    },
  );
});

test("normalizes errors without logging error messages", () => {
  const fields = errorFields({
    code: "timeout",
    message: "request contained private data",
    name: "AiProviderError",
    retryable: true,
  });
  assert.deepEqual(fields, {
    errorCode: "timeout",
    errorName: "AiProviderError",
    retryable: true,
  });
  assert.equal("message" in fields, false);
});
