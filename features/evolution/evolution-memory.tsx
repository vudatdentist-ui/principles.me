import type { EvolutionState } from "./contracts";
import styles from "./evolution-workspace.module.css";

export function EvolutionMemory({ state }: { state: EvolutionState }) {
  if (
    !state.diagnosis &&
    !state.design &&
    !state.outcome &&
    !state.reflection &&
    !state.principle
  )
    return null;
  return (
    <details className={styles.memory}>
      <summary>Details</summary>
      <div className={styles.memoryGrid}>
        {state.diagnosis ? (
          <article>
            <span>Diagnosis</span>
            <strong>{state.diagnosis.rootCauseHypothesis}</strong>
          </article>
        ) : null}
        {state.design ? (
          <article>
            <span>Design</span>
            <strong>{state.design.machineChange}</strong>
          </article>
        ) : null}
        {state.outcome ? (
          <article>
            <span>Outcome · {state.outcome.comparison}</span>
            <strong>{state.outcome.actualResult}</strong>
          </article>
        ) : null}
        {state.reflection ? (
          <article>
            <span>Reflection</span>
            <strong>
              {state.reflection.learning?.trim() || state.reflection.happened}
            </strong>
          </article>
        ) : null}
        {state.principle && state.principle.acceptanceState !== "rejected" ? (
          <article>
            <span>Principle · {state.principle.lifecycleState}</span>
            <strong>{state.principle.rule}</strong>
          </article>
        ) : null}
      </div>
    </details>
  );
}
