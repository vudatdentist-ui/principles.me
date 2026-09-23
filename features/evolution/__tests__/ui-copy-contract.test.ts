import assert from "node:assert/strict";
import test from "node:test";
import { retiredUiCopy } from "../../../scripts/check-ui-contracts.mjs";

test("the UI gate rejects retired rhetorical headings in authored chrome", () => {
  assert.deepEqual(
    retiredUiCopy("<h1><T>What deserves attention now?</T></h1>"),
    ["What deserves attention now?"],
  );
  assert.deepEqual(retiredUiCopy('{t("Test a better rule.")}'), [
    "Test a better rule.",
  ]);
});

test("the UI gate does not censor user records or required uncertainty copy", () => {
  assert.deepEqual(retiredUiCopy("<h1>{state.dream.desiredState}</h1>"), []);
  assert.deepEqual(
    retiredUiCopy('const userFixture = "What deserves attention now?";'),
    [],
  );
  assert.deepEqual(
    retiredUiCopy(
      "<p><T>Completing actions is not an outcome. Record what actually changed.</T></p>",
    ),
    [],
  );
});
