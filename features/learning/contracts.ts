export type LearningPatternKind =
  | "recurring_pattern"
  | "design_learning"
  | "principle_effectiveness"
  | "constraint_hypothesis";

export type LearningPatternAcceptanceState = "accepted" | "revised";
export type LearningPatternLifecycleState =
  | "active"
  | "applied"
  | "challenged"
  | "retired";

export type LearningCaseRecord = {
  diagnosis: string | null;
  design: string | null;
  expected: string | null;
  goal: string;
  goalId: string;
  happened: string;
  learning: string | null;
  outcome: {
    actualResult: string;
    comparison: "improved" | "mixed" | "worse" | "unclear";
    expectedResult: string;
  } | null;
  phase: "reflection" | "outcome_review";
  problem: string;
  problemId: string;
  recurrenceNote: string | null;
  recurring: boolean | null;
  reflectionId: string;
  surprise: string | null;
};

export type ClientLearningCase = Omit<LearningCaseRecord, "goalId" | "problemId">;

export type PrincipleRevisionProposal = {
  currentRationale: string | null;
  currentRule: string;
  currentTrigger: string;
  principleId: string;
  proposedRationale: string;
  proposedRule: string;
  proposedTrigger: string;
};

export type AppliedPrincipleRevision = {
  principleId: string;
  previousRationale: string | null;
  previousRule: string;
  previousTrigger: string;
  revisedRationale: string | null;
  revisedRule: string;
  revisedTrigger: string;
};

export type LearningPatternRecord = {
  acceptanceState: LearningPatternAcceptanceState;
  appliedAt: string | null;
  appliedRevision: AppliedPrincipleRevision | null;
  cases: LearningCaseRecord[];
  confidence: number | null;
  contradictingEvidence: string | null;
  id: string;
  implication: string;
  kind: LearningPatternKind;
  lifecycleState: LearningPatternLifecycleState;
  originSuggestionId: string | null;
  principleRevisionProposal: PrincipleRevisionProposal | null;
  statement: string;
  supportingEvidence: string | null;
  uncertainty: string | null;
  workspaceId: string;
};

export type ClientLearningPattern = Omit<
  LearningPatternRecord,
  "originSuggestionId" | "workspaceId" | "cases"
> & {
  cases: ClientLearningCase[];
};

export type LearningState = {
  historyCount: number;
  patterns: LearningPatternRecord[];
};

export type ClientLearningState = {
  historyCount: number;
  patterns: ClientLearningPattern[];
};

export type LearningPatternProposal = {
  cases: ClientLearningCase[];
  confidence: number | null;
  contradictingEvidence: string;
  implication: string;
  kind: LearningPatternKind;
  principleRevision: PrincipleRevisionProposal | null;
  statement: string;
  supportingEvidence: string;
  uncertainty: string;
};

export type LearningPatternDraft = {
  confidence: number | null;
  contradictingEvidence: string;
  implication: string;
  kind: LearningPatternKind;
  statement: string;
  supportingEvidence: string;
  uncertainty: string;
};
