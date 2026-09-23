"use client";

import { T, useI18n } from "@/features/i18n/locale";
import type { EvolutionState } from "./contracts";
import styles from "./evolution-workspace.module.css";

export function EvolutionMemory({ state }: { state: EvolutionState }) {
  const { t } = useI18n();
  if (!state.diagnosis && !state.design && !state.outcome && !state.reflection && !state.principle) return null;

  return (
    <details className={styles.memory} id="cycle-history">
      <summary><T>Story so far</T></summary>
      <ol className={styles.memoryTrail}>
        {state.diagnosis ? (
          <li>
            <span><T>Diagnosis</T> / <T>Hypothesis</T></span>
            <div>
              <strong>{state.diagnosis.rootCauseHypothesis}</strong>
              {state.diagnosis.uncertainty ? <p>{state.diagnosis.uncertainty}</p> : null}
              <details>
                <summary><T>Evidence</T></summary>
                <dl>
                  <div><dt><T>For</T></dt><dd>{state.diagnosis.supportingEvidence || t("Not recorded")}</dd></div>
                  <div><dt><T>Against</T></dt><dd>{state.diagnosis.contradictingEvidence || t("Not recorded")}</dd></div>
                  <div><dt><T>Alternatives</T></dt><dd>{state.diagnosis.alternativeHypotheses || t("Not recorded")}</dd></div>
                </dl>
              </details>
            </div>
          </li>
        ) : null}
        {state.design ? (
          <li>
            <span><T>Design</T></span>
            <div><strong>{state.design.machineChange}</strong><p><T>Expected</T>: {state.design.expectedResult}</p></div>
          </li>
        ) : null}
        {state.outcome ? (
          <li><span><T>Outcome</T> / {t(state.outcome.comparison)}</span><strong>{state.outcome.actualResult}</strong></li>
        ) : null}
        {state.reflection ? (
          <li><span><T>Reflection</T></span><strong>{state.reflection.learning?.trim() || state.reflection.happened}</strong></li>
        ) : null}
        {state.principle && state.principle.acceptanceState !== "rejected" ? (
          <li><span><T>Principle</T> / {t(state.principle.lifecycleState)}</span><div><p><T>When</T> {state.principle.trigger}</p><strong>{state.principle.rule}</strong></div></li>
        ) : null}
      </ol>
    </details>
  );
}
