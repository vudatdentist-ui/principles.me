import type {
  ClientPeopleState,
  GoalRecord,
  PeopleState,
  PrincipleRecord,
  ProblemRecord,
  RealityRecord,
} from "./contracts";

export function projectGoal({
  acceptedTradeoffs,
  desiredState,
  id,
  measures,
  nonNegotiables,
  status,
  successConditions,
  whyItMatters,
}: GoalRecord) {
  return {
    acceptedTradeoffs,
    desiredState,
    id,
    measures,
    nonNegotiables,
    status,
    successConditions,
    whyItMatters,
  };
}

export function projectReality({
  goalId,
  observedAt,
  observationId,
  statement,
}: RealityRecord) {
  return { goalId, observedAt, observationId, statement };
}

export function projectProblem({
  gap,
  goalId,
  id,
  statement,
  status,
}: ProblemRecord) {
  return { gap, goalId, id, statement, status };
}

export function projectPrinciple({
  acceptanceState,
  confidence,
  id,
  lifecycleState,
  originReflectionId,
  rationale,
  rule,
  trigger,
}: PrincipleRecord) {
  return {
    acceptanceState,
    confidence,
    id,
    lifecycleState,
    originReflectionId,
    rationale,
    rule,
    trigger,
  };
}

export function projectPeopleState(state: PeopleState): ClientPeopleState {
  return {
    goals: state.goals.map(projectGoal),
    principles: state.principles.map(projectPrinciple),
    problems: state.problems.map(projectProblem),
    reality: state.reality.map(projectReality),
    reflections: state.reflections,
  };
}
