export type BrainMetadataValue = string | number | boolean | null;

export type BrainNodeBase = {
  id: string;
  label: string;
  metadata?: Readonly<Record<string, BrainMetadataValue>>;
  status?: string;
  weight?: number;
};

export type DecisionNode = BrainNodeBase & {
  type: "decision";
};

export type PrincipleNode = BrainNodeBase & {
  type: "principle";
};

export type EvidenceNode = BrainNodeBase & {
  type: "evidence";
};

export type OutcomeNode = BrainNodeBase & {
  type: "outcome";
};

export type GoalNode = BrainNodeBase & {
  type: "goal";
};

export type BrainNode =
  | DecisionNode
  | PrincipleNode
  | EvidenceNode
  | OutcomeNode
  | GoalNode;

export type BrainNodeType = BrainNode["type"];

export type BrainLink = {
  id?: string;
  relation?: string;
  source: string;
  target: string;
  weight?: number;
};

export type BrainGraph = {
  links: readonly BrainLink[];
  nodes: readonly BrainNode[];
};

export type BrainView = "brain" | "graph";
