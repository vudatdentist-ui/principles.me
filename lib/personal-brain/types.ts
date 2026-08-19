export type PersonalPrincipleMemory = {
  applied: boolean;
  createdAt: string;
  description: string | null;
  id: string;
  originDecision: {
    createdAt: string;
    id: string;
    title: string;
  } | null;
  relevance: number;
  revision: number;
  statement: string;
  status: "active" | "revised";
};

export type SimilarDecisionMemory = {
  createdAt: string;
  id: string;
  judgment: string | null;
  question: string;
  relevance: number;
  status:
    | "draft"
    | "exploring"
    | "decided"
    | "review_due"
    | "reviewed"
    | "archived";
  title: string;
};

export type PersonalContradiction = {
  principleId: string;
  principleStatement: string;
  prompt: string;
  reason: string;
};

export type PersonalContext = {
  contradictions: PersonalContradiction[];
  generatedAt: string;
  principles: PersonalPrincipleMemory[];
  similarDecisions: SimilarDecisionMemory[];
};

export type PersonalBrainSummary = {
  decisionCount: number;
  principleCount: number;
  principlesReused: number;
  reviewCount: number;
  reusedPrinciples: {
    id: string;
    statement: string;
    timesApplied: number;
  }[];
  statusCounts: Record<
    "draft" | "exploring" | "decided" | "review_due" | "reviewed" | "archived",
    number
  >;
};
