import assert from "node:assert/strict";
import { decisionBriefSchema } from "../features/decision/contracts";
import {
  groundedDecisionBriefFixture,
  groundedDecisionStreamFixture,
  malformedDecisionStreamFixture,
  mixedEvidenceDecisionBriefFixture,
  noEvidenceDecisionBriefFixture,
  providerTimeoutDecisionStreamFixture,
} from "../features/decision/fixtures";
import {
  createDecisionStreamDecoder,
  DecisionStreamProtocolError,
  decisionStreamEventSchema,
} from "../features/decision/stream-events";
import { evidencePacketSchema } from "../features/evidence/contracts";
import { evidenceFixtures } from "../features/evidence/fixtures";

for (const brief of [
  groundedDecisionBriefFixture,
  mixedEvidenceDecisionBriefFixture,
  noEvidenceDecisionBriefFixture,
]) {
  assert.equal(decisionBriefSchema.safeParse(brief).success, true);
}

for (const event of [
  ...groundedDecisionStreamFixture,
  ...providerTimeoutDecisionStreamFixture,
]) {
  assert.equal(decisionStreamEventSchema.safeParse(event).success, true);
}

assert.equal(
  evidencePacketSchema.safeParse({
    references: evidenceFixtures,
    retrievedAt: "2026-08-21T03:15:00.000Z",
  }).success,
  true
);

const missingFactCitation = {
  ...groundedDecisionBriefFixture,
  reasons: groundedDecisionBriefFixture.reasons.map((reason, index) =>
    index === 0 ? { ...reason, citationKeys: [] } : reason
  ),
};
assert.equal(decisionBriefSchema.safeParse(missingFactCitation).success, false);

const unknownCitation = {
  ...groundedDecisionBriefFixture,
  reasons: groundedDecisionBriefFixture.reasons.map((reason, index) =>
    index === 0 ? { ...reason, citationKeys: ["W99"] } : reason
  ),
};
assert.equal(decisionBriefSchema.safeParse(unknownCitation).success, false);

const decoder = createDecisionStreamDecoder();
const encoded = `${groundedDecisionStreamFixture
  .map((event) => JSON.stringify(event))
  .join("\n")}\n`;
const splitAt = Math.floor(encoded.length / 2);
const decoded = [
  ...decoder.push(encoded.slice(0, splitAt)),
  ...decoder.push(encoded.slice(splitAt)),
  ...decoder.finish(),
];
assert.deepEqual(decoded, groundedDecisionStreamFixture);

assert.throws(() => {
  const malformedDecoder = createDecisionStreamDecoder();
  malformedDecoder.push(malformedDecisionStreamFixture);
  malformedDecoder.finish();
}, DecisionStreamProtocolError);

process.stdout.write(
  `Verified ${3} Decision Brief fixtures, ${
    groundedDecisionStreamFixture.length +
    providerTimeoutDecisionStreamFixture.length
  } stream events, and ${evidenceFixtures.length} evidence references.\n`
);
