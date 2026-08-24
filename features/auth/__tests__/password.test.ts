import assert from "node:assert/strict";
import test from "node:test";
import {
  assertBootstrapSecret,
  BootstrapConfigurationError,
  BootstrapSecretError,
} from "../bootstrap";
import { hashPassword, verifyPassword } from "../password";

test("password hashes are salted, one-way and verifiable", async () => {
  const password = "correct horse battery staple";
  const first = await hashPassword(password);
  const second = await hashPassword(password);

  assert.notEqual(first, second);
  assert.equal(first.includes(password), false);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("wrong password", first), false);
});

test("bootstrap mode requires the configured setup secret", () => {
  assert.doesNotThrow(() =>
    assertBootstrapSecret("bootstrap", "setup-secret", "setup-secret")
  );
  assert.throws(
    () => assertBootstrapSecret("bootstrap", "wrong", "setup-secret"),
    BootstrapSecretError
  );
  assert.throws(
    () => assertBootstrapSecret("bootstrap", "anything", ""),
    BootstrapConfigurationError
  );
});

test("open signup does not require a bootstrap secret", () => {
  assert.doesNotThrow(() => assertBootstrapSecret("open", undefined, undefined));
});
