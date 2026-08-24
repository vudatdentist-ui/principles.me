import type {
  ClientExecutionState,
  DesignRecord,
  DiagnosisRecord,
  ExecutionActionRecord,
  ExecutionState,
  OutcomeRecord,
} from "./execution-contracts";

export function projectDiagnosis({
  acceptanceState,
  alternativeHypotheses,
  confidence,
  contradictingEvidence,
  goalId,
  id,
  problemId,
  proximateCause,
  rootCauseHypothesis,
  supportingEvidence,
  symptom,
  uncertainty,
}: DiagnosisRecord) {
  return {
    acceptanceState,
    alternativeHypotheses,
    confidence,
    contradictingEvidence,
    goalId,
    id,
    problemId,
    proximateCause,
    rootCauseHypothesis,
    supportingEvidence,
    symptom,
    uncertainty,
  };
}

export function projectDesign({
  acceptanceState,
  diagnosisId,
  expectedResult,
  goalId,
  id,
  lifecycleState,
  machineChange,
  problemId,
  rationale,
  successSignal,
}: DesignRecord) {
  return {
    acceptanceState,
    diagnosisId,
    expectedResult,
    goalId,
    id,
    lifecycleState,
    machineChange,
    problemId,
    rationale,
    successSignal,
  };
}

export function projectAction({
  commitment,
  completedAt,
  designId,
  id,
  position,
  status,
}: ExecutionActionRecord) {
  return { commitment, completedAt, designId, id, position, status };
}

export function projectOutcome({
  actualResult,
  comparison,
  designId,
  diagnosisId,
  expectedResult,
  goalId,
  id,
  observedAt,
  problemId,
}: OutcomeRecord) {
  return {
    actualResult,
    comparison,
    designId,
    diagnosisId,
    expectedResult,
    goalId,
    id,
    observedAt,
    problemId,
  };
}

export function projectExecutionState(state: ExecutionState): ClientExecutionState {
  return {
    actions: state.actions.map(projectAction),
    designs: state.designs.map(projectDesign),
    diagnoses: state.diagnoses.map(projectDiagnosis),
    outcomeReviews: state.outcomeReviews,
    outcomes: state.outcomes.map(projectOutcome),
  };
}
