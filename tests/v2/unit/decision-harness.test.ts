import assert from "node:assert/strict";
import test from "node:test";
import { decisionBriefSchema } from "@/features/decision/contracts";
import {
  createDecisionStreamDecoder,
  decisionStreamEventSchema,
} from "@/features/decision/stream-events";
import {
  decisionBriefFixture,
  retryableErrorEvents,
  successfulDecisionEvents,
} from "../fixtures/decision";
import {
  encodeDecisionEventsAsNdjson,
  splitTextIntoChunks,
} from "../helpers/ndjson";

test("decision fixtures satisfy the frozen V2 contracts", () => {
  assert.deepEqual(decisionBriefSchema.parse(decisionBriefFixture), decisionBriefFixture);

  for (const event of [...successfulDecisionEvents, ...retryableErrorEvents]) {
    assert.deepEqual(decisionStreamEventSchema.parse(event), event);
  }
});

test("successful fixture follows the expected lifecycle without revision", () => {
  assert.deepEqual(
    successfulDecisionEvents.map((event) => event.type),
    [
      "started",
      "status",
      "status",
      "evidence",
      "status",
      "status",
      "status",
      "brief",
      "done",
    ]
  );
  assert.equal(
    successfulDecisionEvents.some(
      (event) => event.type === "status" && event.stage === "revision"
    ),
    false
  );
});

test("NDJSON fixture round-trips across arbitrary decoded chunks", () => {
  const ndjson = encodeDecisionEventsAsNdjson(successfulDecisionEvents);
  assert.equal(ndjson.endsWith("\n"), true);

  const decoder = createDecisionStreamDecoder();
  const decoded = splitTextIntoChunks(ndjson, [1, 7, 3, 19, 2, 5, 11]).flatMap(
    (chunk) => decoder.push(chunk)
  );
  decoded.push(...decoder.finish());

  assert.deepEqual(decoded, successfulDecisionEvents);
});

test("retryable failure fixture terminates with a typed error event", () => {
  const finalEvent = retryableErrorEvents.at(-1);

  assert.equal(finalEvent?.type, "error");
  assert.equal(retryableErrorEvents.some((event) => event.type === "done"), false);
  if (finalEvent?.type === "error") {
    assert.equal(finalEvent.retryable, true);
    assert.equal(finalEvent.code, "temporary_failure");
  }
});
