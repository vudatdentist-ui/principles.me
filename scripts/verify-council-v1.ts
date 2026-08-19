import assert from "node:assert/strict";
import { sanitizeCouncilBrief } from "../lib/council/grounding";
import { buildCouncilPlan } from "../lib/council/lenses";
import type { CouncilBrief, RetrievedReference } from "../lib/council/types";

const context =
  "Cofounder của tôi rất giỏi nhưng né conflict. Tôi đang cân nhắc có nên tiếp tục partnership không.";
const plan = buildCouncilPlan({
  context,
  question: "Tiếp tục partnership?",
});

assert.equal(plan.mode, "auto");
assert.ok(plan.lenses.length >= 4 && plan.lenses.length <= 6);
assert.ok(plan.members.length >= 3 && plan.members.length <= 4);
assert.ok(plan.lenses.some((lens) => lens.id === "trust"));
assert.ok(plan.lenses.some((lens) => lens.id === "conflict"));
assert.ok(plan.members.every((member) => member.reason.length > 20));
assert.ok(plan.retrievalQueries.length > plan.lenses.length);
assert.equal(
  new Set(plan.retrievalQueries.map((query) => `${query.kind}:${query.id}`))
    .size,
  plan.retrievalQueries.length
);

const references: RetrievedReference[] = [
  {
    chunkId: "chunk-1",
    datasetId: "dataset",
    documentId: "doc-1",
    key: "R1",
    positions: [],
    retrievalContexts: [{ id: "trust", kind: "lens", label: "Trust" }],
    score: 0.9,
    text: "Evidence text",
    title: "Evidence source",
  },
];

const rawBrief: CouncilBrief = {
  agreement: [
    {
      citations: ["R1"],
      layer: "interpretation",
      text: "Supported interpretation",
    },
    {
      citations: ["R999"],
      layer: "evidence",
      text: "Unsupported evidence claim",
    },
  ],
  crux: [],
  disagreement: [],
  factsVsAssumptions: [],
  nextMoves: [],
  reversibilityDownside: [],
  situation: {
    citations: [],
    layer: "application",
    text: "User situation",
  },
  unknowns: [
    {
      citations: [],
      layer: "application",
      text: "A user-context unknown",
    },
  ],
};

const sanitized = sanitizeCouncilBrief({
  brief: rawBrief,
  references,
  situation: context,
});
assert.equal(sanitized.grounded, true);
assert.deepEqual(sanitized.citations, ["R1"]);
assert.equal(sanitized.brief.agreement.length, 1);
assert.equal(sanitized.brief.agreement[0]?.text, "Supported interpretation");
assert.equal(sanitized.brief.unknowns.length, 1);

console.log("Council v1 verification passed.");
