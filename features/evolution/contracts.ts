import type {
  ClientGoalRecord,
  ClientPrincipleRecord,
  ClientProblemRecord,
  ClientRealityRecord,
} from "@/features/people/contracts";
import type {
  ClientDesignRecord,
  ClientDiagnosisRecord,
  ClientExecutionActionRecord,
  ClientOutcomeRecord,
} from "@/features/people/execution-contracts";

export type EvolutionFiveStep = "goal" | "problem" | "diagnosis" | "design" | "do";

export type EvolutionFiveStepStatus = "complete" | "current" | "upcoming";

export type EvolutionStage =
  | "dream"
  | "reality"
  | "problem"
  | "diagnosis"
  | "design"
  | "do"
  | "outcome"
  | "reflection"
  | "principle";

export type EvolutionNextActionKind =
  | "clarify_dream"
  | "observe_reality"
  | "identify_problem"
  | "diagnose_problem"
  | "design_change"
  | "do_design"
  | "record_outcome"
  | "reflect_on_pain"
  | "distill_principle"
  | "review_principle"
  | "continue_cycle";

export type EvolutionAttentionKind =
  | "pain_needs_reflection"
  | "principle_needs_review"
  | "principle_under_test";

export type EvolutionFiveStepItem = {
  key: EvolutionFiveStep;
  label: string;
  status: EvolutionFiveStepStatus;
};

export type EvolutionFiveSteps = {
  current: EvolutionFiveStep | null;
  steps: EvolutionFiveStepItem[];
};

export type EvolutionNextAction = {
  kind: EvolutionNextActionKind;
  label: string;
  prompt: string;
};

export type EvolutionAttention = {
  kind: EvolutionAttentionKind;
  title: string;
};

export type EvolutionReflection = {
  expected: string | null;
  goalId: string | null;
  happened: string;
  id: string;
  kind: "outcome_review" | "reflection";
  learning: string | null;
  outcomeId: string | null;
  problemId: string | null;
  surprise: string | null;
};

export type EvolutionGoalSummary = {
  attentionCount: number;
  currentStep: EvolutionFiveStep | null;
  desiredState: string;
  id: string;
  nextAction: EvolutionNextAction;
  problem: string | null;
  reality: string | null;
  stage: EvolutionStage;
  status: ClientGoalRecord["status"];
};

export type EvolutionState = {
  actions: ClientExecutionActionRecord[];
  attention: EvolutionAttention[];
  design: ClientDesignRecord | null;
  diagnosis: ClientDiagnosisRecord | null;
  dream: ClientGoalRecord | null;
  fiveSteps: EvolutionFiveSteps;
  goals: EvolutionGoalSummary[];
  nextAction: EvolutionNextAction;
  outcome: ClientOutcomeRecord | null;
  principle: ClientPrincipleRecord | null;
  problem: ClientProblemRecord | null;
  reality: ClientRealityRecord | null;
  reflection: EvolutionReflection | null;
  selectedGoalId: string | null;
  stage: EvolutionStage;
};
