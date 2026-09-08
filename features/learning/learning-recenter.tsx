"use client";

import type { EvolutionState } from "@/features/evolution/contracts";
import type { ClientLearningState } from "./contracts";
import { LearningWorkspace } from "./learning-workspace";
import styles from "./learning-recenter.module.css";

export function LearningRecenter({
  email,
  evolution,
  initialState,
  workspaceName,
}: {
  email: string;
  evolution: EvolutionState;
  initialState: ClientLearningState;
  workspaceName: string;
}) {
  const activePatterns = initialState.patterns.filter(
    (pattern) => pattern.lifecycleState !== "retired"
  );
  const challenged = activePatterns.filter(
    (pattern) => pattern.lifecycleState === "challenged"
  );
  const principle = evolution.principle;

  return (
    <div className={styles.workspace}>
      <section className={styles.hero} aria-labelledby="learning-title">
        <div>
          <p className={styles.eyebrow}>Learning</p>
          <h1 id="learning-title">What is reality teaching you?</h1>
          <p>
            Pain matters only when it changes the model. Patterns remain hypotheses,
            Reflections remain inspectable, and Principles stay alive by being tested.
          </p>
        </div>
        <div className={styles.equation}>
          <span>Pain</span><b>+</b><span>Reflection</span><b>→</b><strong>Progress</strong>
        </div>
      </section>

      {evolution.reflection || evolution.outcome ? (
        <section className={styles.latest} aria-labelledby="latest-learning-title">
          <p className={styles.eyebrow}>Latest lesson</p>
          <h2 id="latest-learning-title">
            {evolution.reflection?.learning || "This outcome still needs reflection."}
          </h2>
          <div className={styles.lessonContext}>
            {evolution.outcome ? (
              <div>
                <span>Reality</span>
                <strong>{evolution.outcome.actualResult}</strong>
              </div>
            ) : null}
            {evolution.reflection?.surprise ? (
              <div>
                <span>Pain / surprise</span>
                <strong>{evolution.reflection.surprise}</strong>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className={styles.principleSection} aria-labelledby="principle-title">
        <div className={styles.sectionLead}>
          <div>
            <p className={styles.eyebrow}>Living Principle</p>
            <h2 id="principle-title">A rule earns trust through reality.</h2>
          </div>
          {principle ? <span className={styles.state}>{principle.lifecycleState}</span> : null}
        </div>
        {principle && principle.acceptanceState !== "rejected" ? (
          <article className={styles.principle}>
            <span>When</span>
            <strong>{principle.trigger}</strong>
            <span>Then</span>
            <strong>{principle.rule}</strong>
            {principle.rationale ? <p>{principle.rationale}</p> : null}
            <details>
              <summary>Why this Principle exists</summary>
              <dl>
                {evolution.reflection ? (
                  <div>
                    <dt>Reflection</dt>
                    <dd>{evolution.reflection.learning || evolution.reflection.happened}</dd>
                  </div>
                ) : null}
                {evolution.outcome ? (
                  <div>
                    <dt>Observed outcome</dt>
                    <dd>{evolution.outcome.actualResult} · {evolution.outcome.comparison}</dd>
                  </div>
                ) : null}
              </dl>
            </details>
          </article>
        ) : (
          <div className={styles.empty}>No active Principle is under test in the current cycle.</div>
        )}
      </section>

      <section className={styles.patternSection} aria-labelledby="patterns-title">
        <div className={styles.sectionLead}>
          <div>
            <p className={styles.eyebrow}>Patterns</p>
            <h2 id="patterns-title">Notice recurrence without turning it into identity.</h2>
          </div>
          <span className={styles.meta}>
            {initialState.historyCount} learning case{initialState.historyCount === 1 ? "" : "s"}
          </span>
        </div>

        {challenged.length > 0 ? (
          <div className={styles.challenge}>
            <span>Needs attention</span>
            <strong>{challenged.length} pattern hypothesis{challenged.length === 1 ? " is" : "es are"} challenged.</strong>
          </div>
        ) : null}

        {activePatterns.length > 0 ? (
          <div className={styles.patterns}>
            {activePatterns.slice(0, 4).map((pattern) => (
              <article key={pattern.id}>
                <div className={styles.patternMeta}>
                  <span>{pattern.kind.replaceAll("_", " ")}</span>
                  <span>{pattern.lifecycleState}</span>
                </div>
                <h3>{pattern.statement}</h3>
                <p>{pattern.implication}</p>
                <details>
                  <summary>Evidence and uncertainty</summary>
                  <dl>
                    <div><dt>For</dt><dd>{pattern.supportingEvidence || "Not recorded"}</dd></div>
                    <div><dt>Against</dt><dd>{pattern.contradictingEvidence || "Not recorded"}</dd></div>
                    <div><dt>Uncertainty</dt><dd>{pattern.uncertainty || "Not recorded"}</dd></div>
                    <div><dt>Cases</dt><dd>{pattern.cases.length}</dd></div>
                  </dl>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            {initialState.historyCount < 2
              ? "Not enough history yet. Live the loop before asking the system to define a pattern."
              : "Enough history exists to look for a recurring pattern."}
          </div>
        )}
      </section>

      <details className={styles.lab} open={activePatterns.length === 0 && initialState.historyCount >= 2}>
        <summary>
          <span>Pattern lab</span>
          <strong>Find, inspect, correct, or apply a learning pattern</strong>
        </summary>
        <div className={styles.legacy}>
          <LearningWorkspace
            email={email}
            initialState={initialState}
            workspaceName={workspaceName}
          />
        </div>
      </details>
    </div>
  );
}
