import assert from "node:assert/strict";
import test from "node:test";
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
