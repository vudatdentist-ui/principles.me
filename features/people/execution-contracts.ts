import type { ClientPeopleState } from "./contracts";

export type DiagnosisRecord = {
  acceptanceState: "accepted" | "revised";
  alternativeHypotheses: string | null;
  confidence: number | null;
  contradictingEvidence: string | null;
  evidenceIds: string[];
  goalId: string;
  id: string;
  problemId: string;
  proximateCause: string | null;
  rootCauseHypothesis: string;
  supportingEvidence: string | null;
  symptom: string;
  uncertainty: string | null;
  workspaceId: string;
};

export type DesignRecord = {
  acceptanceState: "accepted" | "revised";
  diagnosisId: string;
  expectedResult: string;
  goalId: string;
  id: string;
  lifecycleState: "active" | "evaluated" | "retired";
  machineChange: string;
  problemId: string;
  rationale: string;
  successSignal: string;
  workspaceId: string;
};

export type ExecutionActionRecord = {
  commitment: string;
  completedAt: string | null;
  designId: string;
  id: string;
  position: number;
  status: "pending" | "completed" | "cancelled";
  workspaceId: string;
};

export type OutcomeComparison = "improved" | "mixed" | "worse" | "unclear";

export type OutcomeRecord = {
  actualResult: string;
  comparison: OutcomeComparison;
  designId: string;
  diagnosisId: string;
  evidenceId: string;
  expectedResult: string;
  goalId: string;
  id: string;
  observationId: string;
  observedAt: string;
  problemId: string;
  workspaceId: string;
};

export type OutcomeReviewRecord = {
  expected: string;
  goalId: string;
  happened: string;
  id: string;
  learning: string;
  outcomeId: string;
  problemId: string;
  surprise: string | null;
};

export type ExecutionState = {
  actions: ExecutionActionRecord[];
  designs: DesignRecord[];
  diagnoses: DiagnosisRecord[];
  outcomeReviews: OutcomeReviewRecord[];
  outcomes: OutcomeRecord[];
};

export type ClientDiagnosisRecord = Omit<
  DiagnosisRecord,
  "evidenceIds" | "workspaceId"
>;
export type ClientDesignRecord = Omit<DesignRecord, "workspaceId">;
export type ClientExecutionActionRecord = Omit<ExecutionActionRecord, "workspaceId">;
export type ClientOutcomeRecord = Omit<
  OutcomeRecord,
  "evidenceId" | "observationId" | "workspaceId"
>;

export type ClientExecutionState = {
  actions: ClientExecutionActionRecord[];
  designs: ClientDesignRecord[];
  diagnoses: ClientDiagnosisRecord[];
  outcomeReviews: OutcomeReviewRecord[];
  outcomes: ClientOutcomeRecord[];
};

export type ClientPeopleWithExecutionState = ClientPeopleState & ClientExecutionState;

export type DiagnosisProposal = {
  alternativeHypotheses: string;
  confidence: number | null;
  contradictingEvidence: string;
  proximateCause: string;
  rootCauseHypothesis: string;
  supportingEvidence: string;
  symptom: string;
  uncertainty: string;
};

export type DesignProposal = {
  actions: string[];
  expectedResult: string;
  machineChange: string;
  rationale: string;
  successSignal: string;
};
