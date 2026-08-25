import type {
  ClientLearningCase,
  ClientLearningPattern,
  ClientLearningState,
  LearningCaseRecord,
  LearningPatternRecord,
  LearningState,
} from "./contracts";

export function projectLearningCase({
  diagnosis,
  design,
  expected,
  goal,
  happened,
  learning,
  outcome,
  phase,
  problem,
  recurrenceNote,
  recurring,
  reflectionId,
  surprise,
}: LearningCaseRecord): ClientLearningCase {
  return {
    diagnosis,
    design,
    expected,
    goal,
    happened,
    learning,
    outcome,
    phase,
    problem,
    recurrenceNote,
    recurring,
    reflectionId,
    surprise,
  };
}

export function projectLearningPattern({
  acceptanceState,
  appliedAt,
  appliedRevision,
  cases,
  confidence,
  contradictingEvidence,
  id,
  implication,
  kind,
  lifecycleState,
  principleRevisionProposal,
  statement,
  supportingEvidence,
  uncertainty,
}: LearningPatternRecord): ClientLearningPattern {
  return {
    acceptanceState,
    appliedAt,
    appliedRevision,
    cases: cases.map(projectLearningCase),
    confidence,
    contradictingEvidence,
    id,
    implication,
    kind,
    lifecycleState,
    principleRevisionProposal,
    statement,
    supportingEvidence,
    uncertainty,
  };
}

export function projectLearningState(state: LearningState): ClientLearningState {
  return {
    historyCount: state.historyCount,
    patterns: state.patterns.map(projectLearningPattern),
  };
}
