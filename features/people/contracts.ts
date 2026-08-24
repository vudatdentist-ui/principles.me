export type GoalDraft = {
  acceptedTradeoffs: string;
  desiredState: string;
  measures: string;
  nonNegotiables: string;
  successConditions: string;
  whyItMatters: string;
};

export type GoalRecord = GoalDraft & {
  id: string;
  status: "chosen" | "completed" | "discovering" | "paused" | "retired";
  workspaceId: string;
};

export type RealityRecord = {
  evidenceId: string;
  goalId: string;
  observedAt: string;
  observationId: string;
  statement: string;
};

export type ProblemRecord = {
  evidenceIds: string[];
  gap: string | null;
  goalId: string;
  id: string;
  statement: string;
  status: "recognized" | "resolved" | "retired";
};

export type ReflectionRecord = {
  expected: string | null;
  goalId: string | null;
  happened: string;
  id: string;
  learning: string | null;
  problemId: string | null;
  recurrenceNote: string | null;
  recurring: boolean | null;
  status: "draft" | "completed";
  surprise: string | null;
};

export type PrincipleRecord = {
  acceptanceState: "pending" | "accepted" | "rejected" | "revised";
  confidence: number | null;
  evidenceIds: string[];
  id: string;
  lifecycleState:
    | "candidate"
    | "testing"
    | "trusted"
    | "challenged"
    | "revised"
    | "retired";
  originReflectionId: string | null;
  rationale: string | null;
  rule: string;
  trigger: string;
};

export type PeopleState = {
  goals: GoalRecord[];
  principles: PrincipleRecord[];
  problems: ProblemRecord[];
  reality: RealityRecord[];
  reflections: ReflectionRecord[];
};

export type ClientGoalRecord = Omit<GoalRecord, "workspaceId">;
export type ClientRealityRecord = Omit<RealityRecord, "evidenceId">;
export type ClientProblemRecord = Omit<ProblemRecord, "evidenceIds">;
export type ClientPrincipleRecord = Omit<PrincipleRecord, "evidenceIds">;

export type ClientPeopleState = {
  goals: ClientGoalRecord[];
  principles: ClientPrincipleRecord[];
  problems: ClientProblemRecord[];
  reality: ClientRealityRecord[];
  reflections: ReflectionRecord[];
};

export type GoalDiscoveryResult =
  | {
      kind: "question";
      field: keyof GoalDraft;
      question: string;
    }
  | {
      kind: "ready";
      summary: string;
    };

export type ProblemProposal = {
  gap: string;
  statement: string;
  suggestionId: string;
};

export type PrincipleProposal = {
  confidence: number | null;
  principleId: string;
  rationale: string;
  rule: string;
  trigger: string;
};
