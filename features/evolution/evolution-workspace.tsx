"use client";

import { useState } from "react";
import type {
  GoalDiscoveryResult,
  GoalDraft,
  ProblemProposal,
} from "@/features/people/contracts";
import type {
  DiagnosisProposal,
  DesignProposal,
  OutcomeComparison,
} from "@/features/people/execution-contracts";
import type { EvolutionState } from "./contracts";
import styles from "./evolution-workspace.module.css";

const emptyGoal: GoalDraft = {
  acceptedTradeoffs: "",
  desiredState: "",
  measures: "",
  nonNegotiables: "",
  successConditions: "",
  whyItMatters: "",
};

const firstGoalQuestion: GoalDiscoveryResult = {
  field: "desiredState",
  kind: "question",
  question: "What do you really want?",
};

async function jsonRequest<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) throw new Error(payload?.error || "Request failed.");
  if (!payload) throw new Error("Request failed.");
  return payload;
}

function sentence(value: string | null | undefined, fallback = "—") {
  return value?.trim() || fallback;
}

async function fetchEvolution(query = ""): Promise<EvolutionState> {
  const response = await fetch(`/api/evolution/state${query}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not refresh Me.");
  return response.json() as Promise<EvolutionState>;
}

export function EvolutionWorkspace({ initialState }: { initialState: EvolutionState }) {
  const [state, setState] = useState(initialState);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [goalDraft, setGoalDraft] = useState<GoalDraft>(emptyGoal);
  const [goalDiscovery, setGoalDiscovery] = useState<GoalDiscoveryResult>(firstGoalQuestion);
  const [realityText, setRealityText] = useState("");
  const [problemProposal, setProblemProposal] = useState<ProblemProposal | null>(null);
  const [problemStatement, setProblemStatement] = useState("");
  const [problemGap, setProblemGap] = useState("");
  const [diagnosisDraft, setDiagnosisDraft] = useState<DiagnosisProposal | null>(null);
  const [designDraft, setDesignDraft] = useState<DesignProposal | null>(null);
  const [outcomeText, setOutcomeText] = useState("");
  const [comparison, setComparison] = useState<OutcomeComparison | null>(null);
  const [surprise, setSurprise] = useState("");
  const [learning, setLearning] = useState("");
  const [principleRule, setPrincipleRule] = useState("");
  const [principleTrigger, setPrincipleTrigger] = useState("");
  const [principleRationale, setPrincipleRationale] = useState("");

  function resetTransient() {
    setProblemProposal(null);
    setProblemStatement("");
    setProblemGap("");
    setDiagnosisDraft(null);
    setDesignDraft(null);
    setOutcomeText("");
    setComparison(null);
    setSurprise("");
    setLearning("");
    setPrincipleRule("");
    setPrincipleTrigger("");
    setPrincipleRationale("");
    setRealityText("");
  }

  async function refresh() {
    const query = state.selectedGoalId
      ? `?goalId=${encodeURIComponent(state.selectedGoalId)}`
      : "";
    setState(await fetchEvolution(query));
  }

  async function run(label: string, action: () => Promise<void>) {
    if (working) return;
    setWorking(label);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
    } finally {
      setWorking(null);
    }
  }

  async function selectGoal(goalId: string) {
    await run("switch", async () => {
      resetTransient();
      setGoalDraft(emptyGoal);
      setGoalDiscovery(firstGoalQuestion);
      setState(await fetchEvolution(`?goalId=${encodeURIComponent(goalId)}`));
    });
  }

  async function startNewGoal() {
    await run("switch", async () => {
      resetTransient();
      setGoalDraft(emptyGoal);
      setGoalDiscovery(firstGoalQuestion);
      setState(await fetchEvolution("?new=1"));
    });
  }

  async function continueGoalDiscovery() {
    await run("dream", async () => {
      setGoalDiscovery(
        await jsonRequest<GoalDiscoveryResult>("/api/people/goal-discovery", {
          body: JSON.stringify(goalDraft),
          method: "POST",
        })
      );
    });
  }

  async function commitGoal() {
    await run("dream", async () => {
      await jsonRequest("/api/people/goals", {
        body: JSON.stringify(goalDraft),
        method: "POST",
      });
      setGoalDraft(emptyGoal);
      setGoalDiscovery(firstGoalQuestion);
      setState(await fetchEvolution());
    });
  }

  async function recordReality() {
    if (!state.dream) return;
    await run("reality", async () => {
      await jsonRequest("/api/people/reality", {
        body: JSON.stringify({ goalId: state.dream?.id, statement: realityText }),
        method: "POST",
      });
      setRealityText("");
      await refresh();
    });
  }

  async function proposeProblem() {
    if (!state.dream || !state.reality) return;
    await run("problem", async () => {
      const proposal = await jsonRequest<ProblemProposal>("/api/people/problems/propose", {
        body: JSON.stringify({
          goalId: state.dream?.id,
          observationId: state.reality?.observationId,
        }),
        method: "POST",
      });
      setProblemProposal(proposal);
      setProblemGap(proposal.gap);
      setProblemStatement(proposal.statement);
    });
  }

  async function confirmProblem() {
    if (!state.dream || !state.reality) return;
    await run("problem", async () => {
      await jsonRequest("/api/people/problems", {
        body: JSON.stringify({
          gap: problemGap,
          goalId: state.dream?.id,
          observationId: state.reality?.observationId,
          statement: problemStatement,
          suggestionId: problemProposal?.suggestionId ?? null,
        }),
        method: "POST",
      });
      setProblemProposal(null);
      setProblemGap("");
      setProblemStatement("");
      await refresh();
    });
  }

  async function proposeDiagnosis() {
    if (!state.problem) return;
    await run("diagnosis", async () => {
      setDiagnosisDraft(
        await jsonRequest<DiagnosisProposal>("/api/people/diagnoses/propose", {
          body: JSON.stringify({ problemId: state.problem?.id }),
          method: "POST",
        })
      );
    });
  }

  async function confirmDiagnosis() {
    if (!state.problem || !diagnosisDraft) return;
    await run("diagnosis", async () => {
      await jsonRequest("/api/people/diagnoses", {
        body: JSON.stringify({ ...diagnosisDraft, problemId: state.problem?.id }),
        method: "POST",
      });
      setDiagnosisDraft(null);
      await refresh();
    });
  }

  async function proposeDesign() {
    if (!state.diagnosis) return;
    await run("design", async () => {
      setDesignDraft(
        await jsonRequest<DesignProposal>("/api/people/designs/propose", {
          body: JSON.stringify({ diagnosisId: state.diagnosis?.id }),
          method: "POST",
        })
      );
    });
  }

  async function confirmDesign() {
    if (!state.diagnosis || !designDraft) return;
    await run("design", async () => {
      await jsonRequest("/api/people/designs", {
        body: JSON.stringify({ ...designDraft, diagnosisId: state.diagnosis?.id }),
        method: "POST",
      });
      setDesignDraft(null);
      await refresh();
    });
  }

  async function updateAction(
    actionId: string,
    status: "completed" | "pending" | "cancelled"
  ) {
    await run("do", async () => {
      await jsonRequest("/api/people/actions", {
        body: JSON.stringify({ actionId, status }),
        method: "POST",
      });
      await refresh();
    });
  }

  async function recordOutcome() {
    if (!state.design || !comparison) return;
    await run("outcome", async () => {
      await jsonRequest("/api/people/outcomes", {
        body: JSON.stringify({
          actualResult: outcomeText,
          comparison,
          designId: state.design?.id,
        }),
        method: "POST",
      });
      setOutcomeText("");
      setComparison(null);
      await refresh();
    });
  }

  async function saveReflection() {
    if (!state.outcome) return;
    await run("reflection", async () => {
      await jsonRequest("/api/people/outcome-reviews", {
        body: JSON.stringify({ learning, outcomeId: state.outcome?.id, surprise }),
        method: "POST",
      });
      setSurprise("");
      setLearning("");
      await refresh();
    });
  }

  async function proposePrinciple() {
    if (!state.reflection) return;
    await run("principle", async () => {
      await jsonRequest("/api/people/principles/propose", {
        body: JSON.stringify({ reflectionId: state.reflection?.id }),
        method: "POST",
      });
      await refresh();
    });
  }

  async function reviewPrinciple(action: "accept" | "reject" | "revise") {
    if (!state.principle) return;
    await run("principle", async () => {
      await jsonRequest("/api/people/principles/review", {
        body: JSON.stringify({
          action,
          principleId: state.principle?.id,
          ...(action === "revise"
            ? {
                rationale: principleRationale || state.principle?.rationale || "",
                rule: principleRule || state.principle?.rule,
                trigger: principleTrigger || state.principle?.trigger,
              }
            : {}),
        }),
        method: "POST",
      });
      setPrincipleRule("");
      setPrincipleTrigger("");
      setPrincipleRationale("");
      await refresh();
    });
  }

  function renderStageAction() {
    if (state.stage === "dream") {
      if (goalDiscovery.kind === "ready") {
        return (
          <div className={styles.actionBody}>
            <div className={styles.goalReview}>
              <strong>{goalDraft.desiredState}</strong>
              <details>
                <summary>Details</summary>
                <dl>
                  <div><dt>Why</dt><dd>{sentence(goalDraft.whyItMatters)}</dd></div>
                  <div><dt>Success</dt><dd>{sentence(goalDraft.successConditions)}</dd></div>
                  <div><dt>Trade-offs</dt><dd>{sentence(goalDraft.acceptedTradeoffs)}</dd></div>
                  <div><dt>Protect</dt><dd>{sentence(goalDraft.nonNegotiables)}</dd></div>
                </dl>
              </details>
            </div>
            <button className={styles.primary} disabled={working === "dream"} onClick={() => void commitGoal()} type="button">
              {working === "dream" ? "Saving…" : "Add goal"}
            </button>
          </div>
        );
      }
      const field = goalDiscovery.field;
      return (
        <div className={styles.actionBody}>
          <label htmlFor="goal-discovery-answer">{goalDiscovery.question}</label>
          <textarea
            aria-label="Goal discovery answer"
            id="goal-discovery-answer"
            onChange={(event) => setGoalDraft({ ...goalDraft, [field]: event.target.value })}
            rows={4}
            value={goalDraft[field]}
          />
          <button
            className={styles.primary}
            disabled={working === "dream" || goalDraft[field].trim().length < 1}
            onClick={() => void continueGoalDiscovery()}
            type="button"
          >
            {working === "dream" ? "Thinking…" : "Continue"}
          </button>
        </div>
      );
    }

    if (state.stage === "reality") {
      return (
        <div className={styles.actionBody}>
          <label htmlFor="reality">What is actually true?</label>
          <textarea id="reality" onChange={(event) => setRealityText(event.target.value)} rows={5} value={realityText} />
          <button className={styles.primary} disabled={working === "reality" || realityText.trim().length < 3} onClick={() => void recordReality()} type="button">
            {working === "reality" ? "Saving…" : "Record reality"}
          </button>
        </div>
      );
    }

    if (state.stage === "problem") {
      if (!problemProposal) {
        return (
          <div className={styles.actionBody}>
            <button className={styles.primary} disabled={working === "problem"} onClick={() => void proposeProblem()} type="button">
              {working === "problem" ? "Looking…" : "Find the problem"}
            </button>
          </div>
        );
      }
      return (
        <div className={styles.actionBody}>
          <Field label="Gap" onChange={setProblemGap} value={problemGap} />
          <Field label="Problem" onChange={setProblemStatement} value={problemStatement} />
          <button className={styles.primary} disabled={working === "problem" || problemStatement.trim().length < 3} onClick={() => void confirmProblem()} type="button">
            {working === "problem" ? "Saving…" : "Name this problem"}
          </button>
        </div>
      );
    }

    if (state.stage === "diagnosis") {
      if (!diagnosisDraft) {
        return (
          <div className={styles.actionBody}>
            <button className={styles.primary} disabled={working === "diagnosis"} onClick={() => void proposeDiagnosis()} type="button">
              {working === "diagnosis" ? "Diagnosing…" : "Diagnose the root cause"}
            </button>
          </div>
        );
      }
      return (
        <div className={styles.actionBody}>
          <Field label="Symptom" onChange={(value) => setDiagnosisDraft({ ...diagnosisDraft, symptom: value })} value={diagnosisDraft.symptom} />
          <Field label="Proximate cause" onChange={(value) => setDiagnosisDraft({ ...diagnosisDraft, proximateCause: value })} value={diagnosisDraft.proximateCause} />
          <Field label="Root-cause hypothesis" onChange={(value) => setDiagnosisDraft({ ...diagnosisDraft, rootCauseHypothesis: value })} value={diagnosisDraft.rootCauseHypothesis} />
          <details className={styles.disclosure}>
            <summary>Evidence</summary>
            <Field label="For" onChange={(value) => setDiagnosisDraft({ ...diagnosisDraft, supportingEvidence: value })} value={diagnosisDraft.supportingEvidence} />
            <Field label="Against" onChange={(value) => setDiagnosisDraft({ ...diagnosisDraft, contradictingEvidence: value })} value={diagnosisDraft.contradictingEvidence} />
            <Field label="Alternatives" onChange={(value) => setDiagnosisDraft({ ...diagnosisDraft, alternativeHypotheses: value })} value={diagnosisDraft.alternativeHypotheses} />
            <Field label="Uncertainty" onChange={(value) => setDiagnosisDraft({ ...diagnosisDraft, uncertainty: value })} value={diagnosisDraft.uncertainty} />
          </details>
          <button className={styles.primary} disabled={working === "diagnosis" || diagnosisDraft.rootCauseHypothesis.trim().length < 3} onClick={() => void confirmDiagnosis()} type="button">
            {working === "diagnosis" ? "Saving…" : "Accept this diagnosis"}
          </button>
        </div>
      );
    }

    if (state.stage === "design") {
      if (!designDraft) {
        return (
          <div className={styles.actionBody}>
            <button className={styles.primary} disabled={working === "design"} onClick={() => void proposeDesign()} type="button">
              {working === "design" ? "Designing…" : "Design the machine"}
            </button>
          </div>
        );
      }
      return (
        <div className={styles.actionBody}>
          <Field label="Machine change" onChange={(value) => setDesignDraft({ ...designDraft, machineChange: value })} value={designDraft.machineChange} />
          <Field label="Expected result" onChange={(value) => setDesignDraft({ ...designDraft, expectedResult: value })} value={designDraft.expectedResult} />
          <Field label="Success signal" onChange={(value) => setDesignDraft({ ...designDraft, successSignal: value })} value={designDraft.successSignal} />
          <details className={styles.disclosure}>
            <summary>Why</summary>
            <Field label="Rationale" onChange={(value) => setDesignDraft({ ...designDraft, rationale: value })} value={designDraft.rationale} />
          </details>
          <div className={styles.actionDrafts}>
            {designDraft.actions.map((action, index) => (
              <input
                aria-label={`Action ${index + 1}`}
                key={`${index}-${action}`}
                onChange={(event) => {
                  const actions = [...designDraft.actions];
                  actions[index] = event.target.value;
                  setDesignDraft({ ...designDraft, actions });
                }}
                value={action}
              />
            ))}
          </div>
          <button className={styles.primary} disabled={working === "design" || designDraft.machineChange.trim().length < 3} onClick={() => void confirmDesign()} type="button">
            {working === "design" ? "Saving…" : "Adopt this design"}
          </button>
        </div>
      );
    }

    if (state.stage === "do") {
      return (
        <div className={styles.actionBody}>
          <strong className={styles.machineChange}>{state.design?.machineChange}</strong>
          <div className={styles.actionList}>
            {state.actions.map((action) => (
              <div className={styles.actionRow} key={action.id}>
                <button
                  aria-label={action.status === "completed" ? `Reopen ${action.commitment}` : `Complete ${action.commitment}`}
                  className={action.status === "completed" ? styles.actionDone : styles.actionToggle}
                  disabled={working === "do"}
                  onClick={() => void updateAction(action.id, action.status === "completed" ? "pending" : "completed")}
                  type="button"
                >
                  {action.status === "completed" ? "✓" : action.position + 1}
                </button>
                <span className={action.status === "completed" ? styles.completedText : undefined}>{action.commitment}</span>
                {action.status === "pending" ? (
                  <button className={styles.tertiary} disabled={working === "do"} onClick={() => void updateAction(action.id, "cancelled")} type="button">Cancel</button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (state.stage === "outcome") {
      return (
        <div className={styles.actionBody}>
          <div className={styles.expectedActual}>
            <div><span>Expected</span><strong>{state.design?.expectedResult}</strong></div>
            <div>
              <span>Actual</span>
              <textarea aria-label="Actual outcome" onChange={(event) => setOutcomeText(event.target.value)} rows={4} value={outcomeText} />
            </div>
          </div>
          <div className={styles.choiceRow} aria-label="Outcome comparison" role="group">
            {(["improved", "mixed", "worse", "unclear"] as OutcomeComparison[]).map((value) => (
              <button aria-pressed={comparison === value} key={value} onClick={() => setComparison(value)} type="button">{value}</button>
            ))}
          </div>
          <button className={styles.primary} disabled={working === "outcome" || outcomeText.trim().length < 3 || !comparison} onClick={() => void recordOutcome()} type="button">
            {working === "outcome" ? "Saving…" : "Record outcome"}
          </button>
        </div>
      );
    }

    if (state.stage === "reflection") {
      return (
        <div className={styles.actionBody}>
          <div className={styles.painEquation}><span>Pain</span><b>+</b><span>Reflection</span><b>→</b><strong>Progress</strong></div>
          <Field label="What hurt or surprised you?" onChange={setSurprise} value={surprise} />
          <Field label="What did this teach you?" onChange={setLearning} value={learning} />
          <button className={styles.primary} disabled={working === "reflection" || learning.trim().length < 3} onClick={() => void saveReflection()} type="button">
            {working === "reflection" ? "Saving…" : "Save reflection"}
          </button>
        </div>
      );
    }

    const principle = state.principle;
    if (!principle || principle.acceptanceState === "rejected") {
      return (
        <div className={styles.actionBody}>
          <button className={styles.primary} disabled={working === "principle"} onClick={() => void proposePrinciple()} type="button">
            {working === "principle" ? "Distilling…" : "Distill a principle"}
          </button>
          <a className={styles.textLink} href="/learning">Principles library →</a>
        </div>
      );
    }

    if (principle.acceptanceState === "pending") {
      return (
        <div className={styles.actionBody}>
          <div className={styles.principleCandidate}>
            <p>When {principle.trigger}</p>
            <h3>{principle.rule}</h3>
          </div>
          <details className={styles.disclosure}>
            <summary>Edit</summary>
            <Field label="When" onChange={setPrincipleTrigger} value={principleTrigger || principle.trigger} />
            <Field label="Then" onChange={setPrincipleRule} value={principleRule || principle.rule} />
            <Field label="Why" onChange={setPrincipleRationale} value={principleRationale || principle.rationale || ""} />
            <button className={styles.secondary} disabled={working === "principle"} onClick={() => void reviewPrinciple("revise")} type="button">Revise and test</button>
          </details>
          <div className={styles.buttonRow}>
            <button className={styles.primary} disabled={working === "principle"} onClick={() => void reviewPrinciple("accept")} type="button">Accept for testing</button>
            <button className={styles.secondary} disabled={working === "principle"} onClick={() => void reviewPrinciple("reject")} type="button">Reject</button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.actionBody}>
        <div className={styles.livePrinciple}>
          <span>{principle.lifecycleState}</span>
          <h3>{principle.rule}</h3>
          <p>When {principle.trigger}</p>
        </div>
        <label htmlFor="principle-reality">What is true now?</label>
        <textarea id="principle-reality" onChange={(event) => setRealityText(event.target.value)} rows={4} value={realityText} />
        <button className={styles.primary} disabled={working === "reality" || realityText.trim().length < 3} onClick={() => void recordReality()} type="button">Record reality</button>
        <a className={styles.textLink} href="/learning">Principles library →</a>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <section className={styles.hero} aria-labelledby="me-title">
        <div>
          <p className={styles.eyebrow}>Me</p>
          <h1 id="me-title">What deserves attention now?</h1>
        </div>
        <button className={styles.addGoal} disabled={working === "switch"} onClick={() => void startNewGoal()} type="button">+ Goal</button>
      </section>

      {error ? <div className={styles.error} role="alert">{error}</div> : null}

      {state.goals.length > 0 ? (
        <section className={styles.goalPortfolio} aria-label="My goals">
          {state.goals.map((goal) => (
            <button
              aria-pressed={state.selectedGoalId === goal.id}
              className={styles.goalCard}
              disabled={working === "switch"}
              key={goal.id}
              onClick={() => void selectGoal(goal.id)}
              type="button"
            >
              <strong>{goal.desiredState}</strong>
              <span>{goal.nextAction.label}</span>
              {goal.attentionCount > 0 ? <b>{goal.attentionCount}</b> : null}
            </button>
          ))}
        </section>
      ) : null}

      {!state.dream ? (
        <section className={styles.next} aria-labelledby="new-goal-title">
          <p className={styles.eyebrow}>New goal</p>
          <h2 id="new-goal-title">{state.nextAction.prompt}</h2>
          {renderStageAction()}
        </section>
      ) : (
        <>
          <section className={styles.orientation} aria-label="Dream and reality">
            <article className={`${styles.contextPane} ${styles.dreamPane}`}>
              <p className={styles.contextLabel}>Dream</p>
              <h2>{state.dream.desiredState}</h2>
              <details className={styles.disclosure}>
                <summary>Details</summary>
                <dl>
                  <div><dt>Why</dt><dd>{sentence(state.dream.whyItMatters)}</dd></div>
                  <div><dt>Success</dt><dd>{sentence(state.dream.successConditions)}</dd></div>
                </dl>
              </details>
            </article>
            <article className={`${styles.contextPane} ${styles.realityPane}`}>
              <p className={styles.contextLabel}>Reality</p>
              <h2>{state.reality?.statement || "Not observed yet"}</h2>
            </article>
          </section>

          {state.problem ? (
            <section className={styles.gap} aria-label="Active gap">
              <p>Gap</p>
              <h2>{sentence(state.problem.gap, state.problem.statement)}</h2>
            </section>
          ) : null}

          <section className={styles.fiveSteps} aria-labelledby="five-steps-title">
            <div className={styles.sectionLead}>
              <h2 id="five-steps-title">5 Steps</h2>
              <span className={styles.stageBadge}>{state.nextAction.label}</span>
            </div>
            <ol className={styles.stepRail}>
              {state.fiveSteps.steps.map((step, index) => (
                <li className={styles[step.status]} key={step.key}>
                  <span>{index + 1}</span>
                  <strong>{step.label}</strong>
                </li>
              ))}
            </ol>
          </section>

          {state.attention.length > 0 ? (
            <aside className={styles.attention} aria-label="Needs attention">
              {state.attention.slice(0, 2).map((item) => <strong key={item.kind}>{item.title}</strong>)}
            </aside>
          ) : null}

          <section className={styles.next} aria-labelledby="next-action-title">
            <p className={styles.eyebrow}>Now</p>
            <h2 id="next-action-title">{state.nextAction.prompt}</h2>
            {renderStageAction()}
          </section>

          <EvolutionMemory state={state} />
        </>
      )}
    </div>
  );
}

function Field({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <textarea onChange={(event) => onChange(event.target.value)} rows={3} value={value} />
    </label>
  );
}

function EvolutionMemory({ state }: { state: EvolutionState }) {
  if (!state.diagnosis && !state.design && !state.outcome && !state.reflection && !state.principle) return null;
  return (
    <details className={styles.memory}>
      <summary>Details</summary>
      <div className={styles.memoryGrid}>
        {state.diagnosis ? (
          <article><span>Diagnosis</span><strong>{state.diagnosis.rootCauseHypothesis}</strong></article>
        ) : null}
        {state.design ? (
          <article><span>Design</span><strong>{state.design.machineChange}</strong></article>
        ) : null}
        {state.outcome ? (
          <article><span>Outcome · {state.outcome.comparison}</span><strong>{state.outcome.actualResult}</strong></article>
        ) : null}
        {state.reflection ? (
          <article><span>Reflection</span><strong>{sentence(state.reflection.learning, state.reflection.happened)}</strong></article>
        ) : null}
        {state.principle && state.principle.acceptanceState !== "rejected" ? (
          <article><span>Principle · {state.principle.lifecycleState}</span><strong>{state.principle.rule}</strong></article>
        ) : null}
      </div>
    </details>
  );
}
