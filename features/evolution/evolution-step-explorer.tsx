"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { EvolutionFiveStep, EvolutionState } from "./contracts";
import styles from "./evolution-step-explorer.module.css";

type StepSnapshot = {
  detail: string;
  kicker: string;
  title: string;
};

const futureCopy: Record<EvolutionFiveStep, StepSnapshot> = {
  goal: {
    kicker: "Goal",
    title: "Name the reality you want to create.",
    detail: "A useful goal is specific enough to guide choices and honest enough to expose trade-offs.",
  },
  problem: {
    kicker: "Problem",
    title: "Find the gap that matters.",
    detail: "The problem is the meaningful difference between the desired reality and what is actually true now.",
  },
  diagnosis: {
    kicker: "Diagnosis",
    title: "Understand why the gap exists.",
    detail: "Separate symptoms from causes, preserve uncertainty, and look for evidence that could prove the hypothesis wrong.",
  },
  design: {
    kicker: "Design",
    title: "Change the machine, not just the intention.",
    detail: "Choose a concrete change that should alter reality, then define the result and signal you expect to observe.",
  },
  do: {
    kicker: "Do",
    title: "Execute the design and observe reality.",
    detail: "Actions only matter if the resulting reality changes. Completion is not evidence that the design worked.",
  },
};

const stepAriaNames: Record<EvolutionFiveStep, string> = {
  goal: "Evolution step 1: desired reality",
  problem: "Evolution step 2: meaningful gap",
  diagnosis: "Evolution step 3: root cause",
  design: "Evolution step 4: system redesign",
  do: "Evolution step 5: execution",
};

function compact(...values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) || null;
}

export function snapshotForStep(state: EvolutionState, step: EvolutionFiveStep): StepSnapshot {
  if (step === "goal" && state.dream) {
    return {
      kicker: "Goal · Dream",
      title: state.dream.desiredState,
      detail:
        compact(state.dream.whyItMatters, state.dream.successConditions) ||
        "The desired reality this cycle is trying to create.",
    };
  }

  if (step === "problem" && state.problem) {
    return {
      kicker: "Problem · Gap",
      title: state.problem.statement,
      detail: compact(state.problem.gap) || "The gap between Dream and observed Reality.",
    };
  }

  if (step === "diagnosis" && state.diagnosis) {
    return {
      kicker: "Diagnosis · Hypothesis",
      title: state.diagnosis.rootCauseHypothesis,
      detail:
        compact(state.diagnosis.uncertainty, state.diagnosis.supportingEvidence) ||
        "A revisable explanation for why this problem exists.",
    };
  }

  if (step === "design" && state.design) {
    return {
      kicker: "Design · Machine change",
      title: state.design.machineChange,
      detail:
        compact(state.design.expectedResult, state.design.successSignal) ||
        "The change expected to create a different reality.",
    };
  }

  if (step === "do" && state.design) {
    const completed = state.actions.filter((action) => action.status === "completed").length;
    const cancelled = state.actions.filter((action) => action.status === "cancelled").length;
    const pending = state.actions.find((action) => action.status === "pending");
    const allCancelled = state.actions.length > 0 && cancelled === state.actions.length;
    const statusSummary = [
      completed > 0 ? `${completed} complete` : null,
      cancelled > 0 ? `${cancelled} cancelled` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      kicker: "Do · Execution",
      title:
        pending?.commitment ||
        (allCancelled
          ? "No executable action remains. Restore one or redesign."
          : state.actions.length > 0
            ? "Execution complete. Observe the outcome."
            : "Execute the design."),
      detail:
        state.actions.length > 0
          ? `${statusSummary || "No action completed yet"}. The test is still the resulting reality, not the checklist.`
          : "Translate the design into accountable actions, then compare expected and actual reality.",
    };
  }

  return futureCopy[step];
}

export function EvolutionStepExplorer({ state }: { state: EvolutionState }) {
  const completeSteps = state.fiveSteps.steps.filter((step) => step.status === "complete");
  const defaultStep =
    state.fiveSteps.current ?? completeSteps[completeSteps.length - 1]?.key ?? "goal";
  const [selectedStep, setSelectedStep] = useState<EvolutionFiveStep>(defaultStep);
  const previousGoalId = useRef(state.selectedGoalId);

  useEffect(() => {
    if (previousGoalId.current === state.selectedGoalId) return;
    previousGoalId.current = state.selectedGoalId;
    setSelectedStep(state.selectedGoalId ? defaultStep : "goal");
  }, [defaultStep, state.selectedGoalId]);

  const snapshot = useMemo(() => snapshotForStep(state, selectedStep), [selectedStep, state]);
  const selected = state.fiveSteps.steps.find((step) => step.key === selectedStep);

  function selectFromKeyboard(event: KeyboardEvent<HTMLButtonElement>, key: EvolutionFiveStep) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();

    const keys = state.fiveSteps.steps.map((step) => step.key);
    const index = keys.indexOf(key);
    let nextIndex = index;

    if (event.key === "ArrowLeft") nextIndex = Math.max(0, index - 1);
    if (event.key === "ArrowRight") nextIndex = Math.min(keys.length - 1, index + 1);
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = keys.length - 1;

    const next = keys[nextIndex];
    if (!next) return;
    setSelectedStep(next);
    requestAnimationFrame(() => document.getElementById(`evolution-step-${next}`)?.focus());
  }

  return (
    <div className={styles.explorer}>
      <div aria-label="Inspect the 5 Steps" className={styles.rail} role="tablist">
        {state.fiveSteps.steps.map((step, index) => (
          <button
            aria-controls="evolution-step-inspection"
            aria-label={stepAriaNames[step.key]}
            aria-selected={selectedStep === step.key}
            className={`${styles.step} ${styles[step.status]}`}
            id={`evolution-step-${step.key}`}
            key={step.key}
            onClick={() => setSelectedStep(step.key)}
            onKeyDown={(event) => selectFromKeyboard(event, step.key)}
            role="tab"
            tabIndex={selectedStep === step.key ? 0 : -1}
            type="button"
          >
            <span aria-hidden="true" className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
            <span aria-hidden="true" className={styles.label}>{step.label}</span>
            <span aria-hidden="true" className={styles.marker} />
          </button>
        ))}
      </div>

      <div
        aria-label="Evolution step details"
        aria-live="polite"
        className={styles.inspection}
        id="evolution-step-inspection"
        role="tabpanel"
      >
        <div className={styles.inspectionMeta}>
          <span>{snapshot.kicker}</span>
          <span>
            {selected?.status === "complete"
              ? "Lived"
              : selected?.status === "current"
                ? "Now"
                : "Ahead"}
          </span>
        </div>
        <h3>{snapshot.title}</h3>
        <p>{snapshot.detail}</p>
      </div>
    </div>
  );
}
