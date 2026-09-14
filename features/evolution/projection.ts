import type { PeopleState } from "@/features/people/contracts";
import type { ExecutionState } from "@/features/people/execution-contracts";
import { projectExecutionState } from "@/features/people/execution-projection";
import { projectPeopleState } from "@/features/people/projection";
import type {
  EvolutionAttention,
  EvolutionFiveStep,
  EvolutionFiveSteps,
  EvolutionGoalSummary,
  EvolutionNextAction,
  EvolutionReflection,
  EvolutionStage,
  EvolutionState,
} from "./contracts";

const fiveStepOrder: Array<{ key: EvolutionFiveStep; label: string }> = [
  { key: "goal", label: "Goal" },
  { key: "problem", label: "Problem" },
  { key: "diagnosis", label: "Diagnosis" },
  { key: "design", label: "Design" },
  { key: "do", label: "Do" },
];

type ProjectedPeople = ReturnType<typeof projectPeopleState>;
type ProjectedExecution = ReturnType<typeof projectExecutionState>;
type GoalLane = Omit<EvolutionState, "goals" | "selectedGoalId">;

function fiveSteps(input: {
  design: boolean;
  diagnosis: boolean;
  do: boolean;
  goal: boolean;
  problem: boolean;
}): EvolutionFiveSteps {
  const completed = new Map<EvolutionFiveStep, boolean>([
    ["goal", input.goal],
    ["problem", input.problem],
    ["diagnosis", input.diagnosis],
    ["design", input.design],
    ["do", input.do],
  ]);
  const current = fiveStepOrder.find((step) => !completed.get(step.key))?.key ?? null;

  return {
    current,
    steps: fiveStepOrder.map((step) => ({
      ...step,
      status: completed.get(step.key)
        ? "complete"
        : current === step.key
          ? "current"
          : "upcoming",
    })),
  };
}

function nextAction(
  stage: EvolutionStage,
  principle: EvolutionState["principle"]
): EvolutionNextAction {
  if (stage === "dream") {
    return { kind: "clarify_dream", label: "New goal", prompt: "What do you really want?" };
  }
  if (stage === "reality") {
    return { kind: "observe_reality", label: "Reality", prompt: "What is actually true right now?" };
  }
  if (stage === "problem") {
    return { kind: "identify_problem", label: "Problem", prompt: "Where does reality fall short?" };
  }
  if (stage === "diagnosis") {
    return { kind: "diagnose_problem", label: "Diagnose", prompt: "Why is this happening?" };
  }
  if (stage === "design") {
    return { kind: "design_change", label: "Design", prompt: "What must change?" };
  }
  if (stage === "do") {
    return { kind: "do_design", label: "Do", prompt: "What needs to happen now?" };
  }
  if (stage === "outcome") {
    return { kind: "record_outcome", label: "Outcome", prompt: "What actually happened?" };
  }
  if (stage === "reflection") {
    return { kind: "reflect_on_pain", label: "Reflect", prompt: "What did this teach you?" };
  }
  if (!principle || principle.acceptanceState === "rejected") {
    return { kind: "distill_principle", label: "Principle", prompt: "What rule is worth testing?" };
  }
  if (principle.acceptanceState === "pending") {
    return { kind: "review_principle", label: "Review", prompt: "Test this principle?" };
  }
  return { kind: "continue_cycle", label: "Continue", prompt: "What is true now?" };
}

function attention(input: {
  outcome: EvolutionState["outcome"];
  outcomeReview: EvolutionReflection | null;
  principle: EvolutionState["principle"];
}): EvolutionAttention[] {
  const items: EvolutionAttention[] = [];
  if (input.outcome && !input.outcomeReview) {
    items.push({ kind: "pain_needs_reflection", title: "Outcome needs reflection" });
  }
  if (input.principle?.acceptanceState === "pending") {
    items.push({ kind: "principle_needs_review", title: "Principle needs review" });
  } else if (
    input.principle &&
    (input.principle.acceptanceState === "accepted" || input.principle.acceptanceState === "revised") &&
    input.principle.lifecycleState !== "retired"
  ) {
    items.push({ kind: "principle_under_test", title: "Principle under test" });
  }
  return items;
}

function emptyLane(): GoalLane {
  const stage: EvolutionStage = "dream";
  return {
    actions: [],
    attention: [],
    design: null,
    diagnosis: null,
    dream: null,
    fiveSteps: fiveSteps({ design: false, diagnosis: false, do: false, goal: false, problem: false }),
    nextAction: nextAction(stage, null),
    outcome: null,
    principle: null,
    problem: null,
    reality: null,
    reflection: null,
    stage,
  };
}

function projectGoalLane(
  people: ProjectedPeople,
  execution: ProjectedExecution,
  dream: ProjectedPeople["goals"][number]
): GoalLane {
  const reality = people.reality.find((item) => item.goalId === dream.id) ?? null;
  const problem =
    people.problems.find((item) => item.goalId === dream.id && item.status === "recognized") ??
    people.problems.find((item) => item.goalId === dream.id) ??
    null;
  const diagnosis = problem
    ? execution.diagnoses.find((item) => item.problemId === problem.id) ?? null
    : null;
  const design = diagnosis
    ? execution.designs.find(
        (item) => item.diagnosisId === diagnosis.id && item.lifecycleState !== "retired"
      ) ?? execution.designs.find((item) => item.diagnosisId === diagnosis.id) ?? null
    : null;
  const actions = design
    ? execution.actions
        .filter((item) => item.designId === design.id)
        .slice()
        .sort((left, right) => left.position - right.position)
    : [];
  const outcome = design
    ? execution.outcomes.find((item) => item.designId === design.id) ?? null
    : null;
  const linkedOutcomeReview = outcome
    ? execution.outcomeReviews.find((item) => item.outcomeId === outcome.id) ?? null
    : null;
  const fallbackReflection = problem
    ? people.reflections.find(
        (item) => item.problemId === problem.id && item.status === "completed"
      ) ?? null
    : null;
  const reflection: EvolutionReflection | null = linkedOutcomeReview
    ? {
        expected: linkedOutcomeReview.expected,
        goalId: linkedOutcomeReview.goalId,
        happened: linkedOutcomeReview.happened,
        id: linkedOutcomeReview.id,
        kind: "outcome_review",
        learning: linkedOutcomeReview.learning,
        outcomeId: linkedOutcomeReview.outcomeId,
        problemId: linkedOutcomeReview.problemId,
        surprise: linkedOutcomeReview.surprise,
      }
    : fallbackReflection
      ? {
          expected: fallbackReflection.expected,
          goalId: fallbackReflection.goalId,
          happened: fallbackReflection.happened,
          id: fallbackReflection.id,
          kind: "reflection",
          learning: fallbackReflection.learning,
          outcomeId: null,
          problemId: fallbackReflection.problemId,
          surprise: fallbackReflection.surprise,
        }
      : null;
  const principle = reflection
    ? people.principles.find(
        (item) =>
          item.originReflectionId === reflection.id && item.acceptanceState !== "rejected"
      ) ?? people.principles.find((item) => item.originReflectionId === reflection.id) ?? null
    : null;

  const doComplete =
    Boolean(design) &&
    (Boolean(outcome) ||
      (actions.length > 0 && actions.every((item) => item.status !== "pending")));

  let stage: EvolutionStage;
  if (!reality) stage = "reality";
  else if (!problem) stage = "problem";
  else if (!diagnosis) stage = "diagnosis";
  else if (!design) stage = "design";
  else if (!doComplete) stage = "do";
  else if (!outcome) stage = "outcome";
  else if (!linkedOutcomeReview) stage = "reflection";
  else stage = "principle";

  const laneAttention = attention({
    outcome,
    outcomeReview: linkedOutcomeReview
      ? {
          expected: linkedOutcomeReview.expected,
          goalId: linkedOutcomeReview.goalId,
          happened: linkedOutcomeReview.happened,
          id: linkedOutcomeReview.id,
          kind: "outcome_review",
          learning: linkedOutcomeReview.learning,
          outcomeId: linkedOutcomeReview.outcomeId,
          problemId: linkedOutcomeReview.problemId,
          surprise: linkedOutcomeReview.surprise,
        }
      : null,
    principle,
  });

  return {
    actions,
    attention: laneAttention,
    design,
    diagnosis,
    dream,
    fiveSteps: fiveSteps({
      design: Boolean(design),
      diagnosis: Boolean(diagnosis),
      do: doComplete,
      goal: true,
      problem: Boolean(problem),
    }),
    nextAction: nextAction(stage, principle),
    outcome,
    principle,
    problem,
    reality,
    reflection,
    stage,
  };
}

export function projectEvolutionState(
  peopleState: PeopleState,
  executionState: ExecutionState,
  options: { goalId?: string | null; newGoal?: boolean } = {}
): EvolutionState {
  const people = projectPeopleState(peopleState);
  const execution = projectExecutionState(executionState);
  const visibleGoals = people.goals.filter((goal) => goal.status !== "retired");

  const summaries: EvolutionGoalSummary[] = visibleGoals.map((goal) => {
    const lane = projectGoalLane(people, execution, goal);
    return {
      attentionCount: lane.attention.length,
      currentStep: lane.fiveSteps.current,
      desiredState: goal.desiredState,
      id: goal.id,
      nextAction: lane.nextAction,
      problem: lane.problem?.statement ?? null,
      reality: lane.reality?.statement ?? null,
      stage: lane.stage,
      status: goal.status,
    };
  });

  const selectedGoal = options.newGoal
    ? null
    : (options.goalId
        ? visibleGoals.find((goal) => goal.id === options.goalId)
        : null) ??
      visibleGoals.find((goal) => goal.status === "chosen") ??
      visibleGoals[0] ??
      null;
  const lane = selectedGoal ? projectGoalLane(people, execution, selectedGoal) : emptyLane();

  return {
    ...lane,
    goals: summaries,
    selectedGoalId: selectedGoal?.id ?? null,
  };
}
