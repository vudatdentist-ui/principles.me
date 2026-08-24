import assert from "node:assert/strict";
import test from "node:test";
import {
  SESSION_COOKIE,
  sessionTokenFromCookieHeader,
} from "../session";

test("session cookie parser decodes a valid token", () => {
  assert.equal(
    sessionTokenFromCookieHeader(`${SESSION_COOKIE}=token%2Fwith%2Bencoding; other=value`),
    "token/with+encoding"
  );
});

test("session cookie parser rejects malformed percent encoding", () => {
  assert.equal(
    sessionTokenFromCookieHeader(`${SESSION_COOKIE}=%E0%A4%A`),
    null
  );
});
