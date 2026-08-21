import type {
  BrainGraph,
  BrainMetadataValue,
  BrainNodeType,
} from "./brain-types";

export type BrainPosition = readonly [number, number, number];

export type RenderableBrainNode = {
  id: string;
  label: string;
  metadata?: Readonly<Record<string, BrainMetadataValue>>;
  position: BrainPosition;
  status?: string;
  type: BrainNodeType;
  weight: number;
};

export type RenderableBrainLink = {
  id: string;
  relation?: string;
  sourceIndex: number;
  targetIndex: number;
  weight: number;
};

export type RenderableBrainGraph = {
  droppedLinkCount: number;
  links: readonly RenderableBrainLink[];
  nodes: readonly RenderableBrainNode[];
};

const TYPE_ANCHORS: Readonly<Record<BrainNodeType, BrainPosition>> = {
  decision: [-0.75, 0.35, 0.08],
  evidence: [0.92, -0.28, 0.02],
  goal: [-0.62, -0.76, -0.08],
  outcome: [0.72, 0.72, -0.04],
  principle: [-0.02, 0.92, 0.05],
};

function hashString(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function unit(hash: number, shift: number) {
  const mixed = Math.imul(hash ^ shift, 2_246_822_519) >>> 0;
  return mixed / 4_294_967_295;
}

function positionForNode(id: string, type: BrainNodeType): BrainPosition {
  const hash = hashString(`${type}:${id}`);
  const anchor = TYPE_ANCHORS[type];
  const angle = unit(hash, 17) * Math.PI * 2;
  const radius = 0.16 + unit(hash, 31) * 0.34;
  const vertical = (unit(hash, 47) - 0.5) * 0.26;
  const depth = (unit(hash, 71) - 0.5) * 0.48;

  return [
    anchor[0] + Math.cos(angle) * radius,
    anchor[1] + Math.sin(angle) * radius * 0.72 + vertical,
    anchor[2] + depth,
  ];
}

export function adaptBrainGraph(graph: BrainGraph): RenderableBrainGraph {
  const nodes = graph.nodes.map<RenderableBrainNode>((node) => ({
    id: node.id,
    label: node.label,
    metadata: node.metadata,
    position: positionForNode(node.id, node.type),
    status: node.status,
    type: node.type,
    weight: Math.max(0.1, node.weight ?? 1),
  }));
  const nodeIndexes = new Map(nodes.map((node, index) => [node.id, index]));
  const links: RenderableBrainLink[] = [];
  let droppedLinkCount = 0;

  graph.links.forEach((link, index) => {
    const sourceIndex = nodeIndexes.get(link.source);
    const targetIndex = nodeIndexes.get(link.target);

    // V2 Brain is a visualization surface, so stale/dangling relationships are
    // ignored rather than making the entire graph unrenderable. The count is
    // returned so integration code can surface diagnostics if it needs to.
    if (sourceIndex === undefined || targetIndex === undefined) {
      droppedLinkCount += 1;
      return;
    }

    links.push({
      id:
        link.id ??
        `${link.source}:${link.target}:${link.relation ?? "link"}:${index}`,
      relation: link.relation,
      sourceIndex,
      targetIndex,
      weight: Math.max(0.1, link.weight ?? 1),
    });
  });

  return { droppedLinkCount, links, nodes };
}
