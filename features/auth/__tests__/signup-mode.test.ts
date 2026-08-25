import assert from "node:assert/strict";
import test from "node:test";
import { signupMode } from "../contracts";

test("Phase 5 account creation is open unless explicitly disabled", () => {
  assert.equal(signupMode(undefined), "open");
  assert.equal(signupMode("open"), "open");
  assert.equal(signupMode(" OPEN "), "open");
  assert.equal(signupMode("bootstrap"), "open");
  assert.equal(signupMode("legacy-value"), "open");
  assert.equal(signupMode("disabled"), "disabled");
});
