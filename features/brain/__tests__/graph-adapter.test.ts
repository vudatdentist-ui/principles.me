import assert from "node:assert/strict";
import test from "node:test";
import { adaptBrainGraph } from "../graph-adapter";
import type { BrainGraph } from "../brain-types";

test("maps an empty graph without inventing nodes or links", () => {
  const rendered = adaptBrainGraph({ links: [], nodes: [] });
  assert.deepEqual(rendered, { droppedLinkCount: 0, links: [], nodes: [] });
});

test("maps node positions deterministically", () => {
  const graph: BrainGraph = {
    links: [],
    nodes: [{ id: "decision-1", label: "Choose", type: "decision" }],
  };
  const first = adaptBrainGraph(graph);
  const second = adaptBrainGraph(graph);
  assert.deepEqual(first.nodes[0]?.position, second.nodes[0]?.position);
});

test("preserves mixed node types and valid relationships", () => {
  const graph: BrainGraph = {
    links: [
      {
        relation: "supported-by",
        source: "decision-1",
        target: "evidence-1",
      },
      { source: "goal-1", target: "outcome-1", weight: 2 },
    ],
    nodes: [
      { id: "decision-1", label: "Choose", type: "decision" },
      { id: "principle-1", label: "Principle", type: "principle" },
      { id: "evidence-1", label: "Evidence", type: "evidence" },
      { id: "outcome-1", label: "Outcome", type: "outcome" },
      { id: "goal-1", label: "Goal", type: "goal" },
    ],
  };
  const rendered = adaptBrainGraph(graph);
  assert.deepEqual(
    rendered.nodes.map((node) => node.type),
    ["decision", "principle", "evidence", "outcome", "goal"]
  );
  assert.equal(rendered.links.length, 2);
  assert.equal(rendered.droppedLinkCount, 0);
});

test("ignores dangling links and reports how many were dropped", () => {
  const graph: BrainGraph = {
    links: [
      { source: "decision-1", target: "missing" },
      { source: "decision-1", target: "evidence-1" },
    ],
    nodes: [
      { id: "decision-1", label: "Choose", type: "decision" },
      { id: "evidence-1", label: "Evidence", type: "evidence" },
    ],
  };
  const rendered = adaptBrainGraph(graph);
  assert.equal(rendered.links.length, 1);
  assert.equal(rendered.droppedLinkCount, 1);
});
