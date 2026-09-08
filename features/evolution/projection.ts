import type { PeopleState } from "@/features/people/contracts";
import type { ExecutionState } from "@/features/people/execution-contracts";
import { projectExecutionState } from "@/features/people/execution-projection";
import { projectPeopleState } from "@/features/people/projection";
import type {
  EvolutionAttention,
  EvolutionFiveStep,
  EvolutionFiveSteps,
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
    return { kind: "clarify_dream", label: "Clarify your dream", prompt: "What do you really want?" };
  }
  if (stage === "reality") {
    return { kind: "observe_reality", label: "Face reality", prompt: "What is actually true right now?" };
  }
  if (stage === "problem") {
    return { kind: "identify_problem", label: "Name the problem", prompt: "Where does reality fall short of the dream?" };
  }
  if (stage === "diagnosis") {
    return { kind: "diagnose_problem", label: "Diagnose the root cause", prompt: "Why is this happening?" };
  }
  if (stage === "design") {
    return { kind: "design_change", label: "Design the machine", prompt: "What must change so this problem stops recurring?" };
  }
  if (stage === "do") {
    return { kind: "do_design", label: "Do the design", prompt: "What commitment moves this machine change forward now?" };
  }
  if (stage === "outcome") {
    return { kind: "record_outcome", label: "Observe the outcome", prompt: "What actually happened after you changed the machine?" };
  }
  if (stage === "reflection") {
    return { kind: "reflect_on_pain", label: "Reflect", prompt: "What hurt or surprised you, and what is it teaching you?" };
  }
  if (!principle || principle.acceptanceState === "rejected") {
    return { kind: "distill_principle", label: "Distill a principle", prompt: "What rule is worth testing next time?" };
  }
  if (principle.acceptanceState === "pending") {
    return { kind: "review_principle", label: "Review the principle", prompt: "Is this a rule you are willing to test against reality?" };
  }
  return { kind: "continue_cycle", label: "Return to reality", prompt: "What is true now after applying what you learned?" };
}

function attention(input: {
  outcome: EvolutionState["outcome"];
  outcomeReview: EvolutionReflection | null;
  principle: EvolutionState["principle"];
}): EvolutionAttention[] {
  const items: EvolutionAttention[] = [];
  if (input.outcome && !input.outcomeReview) {
    items.push({ kind: "pain_needs_reflection", title: "This outcome needs reflection." });
  }
  if (input.principle?.acceptanceState === "pending") {
    items.push({ kind: "principle_needs_review", title: "A Principle candidate needs your judgment." });
  } else if (
    input.principle &&
    (input.principle.acceptanceState === "accepted" || input.principle.acceptanceState === "revised") &&
    input.principle.lifecycleState !== "retired"
  ) {
    items.push({ kind: "principle_under_test", title: "A Principle is under test against reality." });
  }
  return items;
}

export function projectEvolutionState(
  peopleState: PeopleState,
  executionState: ExecutionState
): EvolutionState {
  const people = projectPeopleState(peopleState);
  const execution = projectExecutionState(executionState);

  const dream = people.goals.find((goal) => goal.status === "chosen") ?? people.goals[0] ?? null;
  const reality = dream ? people.reality.find((item) => item.goalId === dream.id) ?? null : null;
  const problem = dream
    ? people.problems.find((item) => item.goalId === dream.id && item.status === "recognized") ??
      people.problems.find((item) => item.goalId === dream.id) ??
      null
    : null;
  const diagnosis = problem ? execution.diagnoses.find((item) => item.problemId === problem.id) ?? null : null;
  const design = diagnosis
    ? execution.designs.find((item) => item.diagnosisId === diagnosis.id && item.lifecycleState !== "retired") ??
      execution.designs.find((item) => item.diagnosisId === diagnosis.id) ??
      null
    : null;
  const actions = design
    ? execution.actions.filter((item) => item.designId === design.id).slice().sort((left, right) => left.position - right.position)
    : [];
  const outcome = design ? execution.outcomes.find((item) => item.designId === design.id) ?? null : null;

  const linkedOutcomeReview = outcome
    ? execution.outcomeReviews.find((item) => item.outcomeId === outcome.id) ?? null
    : null;
  const fallbackReflection = problem
    ? people.reflections.find((item) => item.problemId === problem.id && item.status === "completed") ?? null
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
        (item) => item.originReflectionId === reflection.id && item.acceptanceState !== "rejected"
      ) ?? people.principles.find((item) => item.originReflectionId === reflection.id) ?? null
    : null;

  const doComplete =
    Boolean(design) &&
    (Boolean(outcome) || (actions.length > 0 && actions.every((item) => item.status !== "pending")));

  let stage: EvolutionStage;
  if (!dream) stage = "dream";
  else if (!reality) stage = "reality";
  else if (!problem) stage = "problem";
  else if (!diagnosis) stage = "diagnosis";
  else if (!design) stage = "design";
  else if (!doComplete) stage = "do";
  else if (!outcome) stage = "outcome";
  else if (!linkedOutcomeReview) stage = "reflection";
  else stage = "principle";

  return {
    actions,
    attention: attention({
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
    }),
    design,
    diagnosis,
    dream,
    fiveSteps: fiveSteps({
      design: Boolean(design),
      diagnosis: Boolean(diagnosis),
      do: doComplete,
      goal: Boolean(dream),
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
