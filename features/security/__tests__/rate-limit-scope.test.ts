import assert from "node:assert/strict";
import test from "node:test";
import { authRateScope } from "../rate-limit";

function request(headers: Record<string, string>): Request {
  return new Request("https://principles.me/api/auth/signin", { headers });
}

test("auth throttling scopes by client IP rather than email identity", () => {
  const first = authRateScope(request({ "x-real-ip": "203.0.113.4" }));
  const second = authRateScope(request({ "x-real-ip": "203.0.113.4" }));
  const other = authRateScope(request({ "x-real-ip": "203.0.113.5" }));

  assert.equal(first, second);
  assert.notEqual(first, other);
  assert.equal(first.includes("203.0.113.4"), false);
});

test("trusted last X-Forwarded-For hop wins over a spoofed first value", () => {
  const spoofed = authRateScope(
    request({ "x-forwarded-for": "198.51.100.99, 203.0.113.4" })
  );
  const direct = authRateScope(request({ "x-forwarded-for": "203.0.113.4" }));
  assert.equal(spoofed, direct);
});
