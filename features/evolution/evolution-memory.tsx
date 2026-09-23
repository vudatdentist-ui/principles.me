"use client";

import { T, useI18n } from "@/features/i18n/locale";
import type { EvolutionState } from "./contracts";
import styles from "./evolution-workspace.module.css";

export function EvolutionMemory({ state }: { state: EvolutionState }) {
  const { t } = useI18n();

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
      <summary><T>Review the record</T></summary>
      <div className={styles.memoryGrid}>
        {state.diagnosis ? (
          <article>
            <span><T>Diagnosis</T></span>
            <strong>{state.diagnosis.rootCauseHypothesis}</strong>
          </article>
        ) : null}
        {state.design ? (
          <article>
            <span><T>Design</T></span>
            <strong>{state.design.machineChange}</strong>
          </article>
        ) : null}
        {state.outcome ? (
          <article>
            <span><T>Outcome</T> · {t(state.outcome.comparison)}</span>
            <strong>{state.outcome.actualResult}</strong>
          </article>
        ) : null}
        {state.reflection ? (
          <article>
            <span><T>Reflection</T></span>
            <strong>
              {state.reflection.learning?.trim() || state.reflection.happened}
            </strong>
          </article>
        ) : null}
        {state.principle && state.principle.acceptanceState !== "rejected" ? (
          <article>
            <span><T>Principle</T> · {t(state.principle.lifecycleState)}</span>
            <strong>{state.principle.rule}</strong>
          </article>
        ) : null}
      </div>
    </details>
  );
}
