import assert from "node:assert/strict";
import test from "node:test";
import { toggledExecutionActionStatus } from "../execution-action-state";

test("execution action toggle completes only pending actions", () => {
  assert.equal(toggledExecutionActionStatus("pending"), "completed");
});

test("execution action toggle reopens completed and cancelled actions", () => {
  assert.equal(toggledExecutionActionStatus("completed"), "pending");
  assert.equal(toggledExecutionActionStatus("cancelled"), "pending");
});
