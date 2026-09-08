"use client";

import { useMemo, useState } from "react";
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

const goalQuestions: Record<keyof GoalDraft, string> = {
  desiredState: "What reality do you actually want to create?",
  whyItMatters: "Why does this matter enough to organize your life around it?",
  successConditions: "What would make you say this dream is genuinely becoming reality?",
  acceptedTradeoffs: "What are you willing to give up or deprioritize for it?",
  nonNegotiables: "What must remain true while you pursue it?",
  measures: "Is there a useful measure that would help you see progress without replacing the dream?",
};

async function jsonRequest<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }
  if (!payload) {
    throw new Error("Request failed.");
  }
  return payload;
}

function sentence(value: string | null | undefined, fallback = "Not yet clear.") {
  return value?.trim() || fallback;
}

export function EvolutionWorkspace({ initialState }: { initialState: EvolutionState }) {
  const [state, setState] = useState(initialState);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [goalDraft, setGoalDraft] = useState<GoalDraft>(emptyGoal);
  const [goalDiscovery, setGoalDiscovery] = useState<GoalDiscoveryResult>({
    field: "desiredState",
    kind: "question",
    question: goalQuestions.desiredState,
  });
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

  const progressStatement = useMemo(() => {
    if (!state.dream) return "Choose a dream worth organizing around.";
    if (!state.reality) return "The dream is clear. Reality still needs to be faced.";
    if (!state.problem) return "Dream and Reality are visible. Name the gap without tolerating it.";
    if (!state.diagnosis) return "The problem is visible. Do not solve it before finding the root cause.";
    if (!state.design) return "The cause is clearer. Redesign the machine before adding more effort.";
    if (!state.outcome) return "The design exists. Determination now means doing and observing what happens.";
    if (!state.reflection) return "Reality answered back. Turn pain or surprise into reflection.";
    if (!state.principle || state.principle.acceptanceState === "rejected") {
      return "The reflection changed your model. Distill only what is worth testing.";
    }
    return "A principle is under test. Reality, not confidence, decides whether it survives.";
  }, [state]);

  async function refresh() {
    const response = await fetch("/api/evolution/state", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not refresh your evolution state.");
    setState((await response.json()) as EvolutionState);
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
      await refresh();
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

  async function updateAction(actionId: string, status: "completed" | "pending" | "cancelled") {
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
            <p>{goalDiscovery.summary}</p>
            <button
              className={styles.primary}
              disabled={working === "dream"}
              onClick={() => void commitGoal()}
              type="button"
            >
              {working === "dream" ? "Saving…" : "Choose this dream"}
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
          <label htmlFor="reality">Describe reality without explaining it away.</label>
          <textarea
            id="reality"
            onChange={(event) => setRealityText(event.target.value)}
            rows={5}
            value={realityText}
          />
          <button
            className={styles.primary}
            disabled={working === "reality" || realityText.trim().length < 3}
            onClick={() => void recordReality()}
            type="button"
          >
            {working === "reality" ? "Saving…" : "Record reality"}
          </button>
        </div>
      );
    }

    if (state.stage === "problem") {
      if (!problemProposal) {
        return (
          <div className={styles.actionBody}>
            <p>Compare the dream with observed reality. AI may propose the gap; you decide whether it is true.</p>
            <button
              className={styles.primary}
              disabled={working === "problem"}
              onClick={() => void proposeProblem()}
              type="button"
            >
              {working === "problem" ? "Looking…" : "Find the problem"}
            </button>
          </div>
        );
      }
      return (
        <div className={styles.actionBody}>
          <Field label="Gap between Dream and Reality" onChange={setProblemGap} value={problemGap} />
          <Field label="Problem statement" onChange={setProblemStatement} value={problemStatement} />
          <button
            className={styles.primary}
            disabled={working === "problem" || problemStatement.trim().length < 3}
            onClick={() => void confirmProblem()}
            type="button"
          >
            {working === "problem" ? "Saving…" : "Name this problem"}
          </button>
        </div>
      );
    }

    if (state.stage === "diagnosis") {
      if (!diagnosisDraft) {
        return (
          <div className={styles.actionBody}>
            <p>Do not jump from a painful symptom to a solution. Separate symptom, proximate cause, and root-cause hypothesis.</p>
            <button
              className={styles.primary}
              disabled={working === "diagnosis"}
              onClick={() => void proposeDiagnosis()}
              type="button"
            >
              {working === "diagnosis" ? "Diagnosing…" : "Diagnose the root cause"}
            </button>
          </div>
        );
      }
      return (
        <div className={styles.actionBody}>
          <Field
            label="Symptom"
            onChange={(value) => setDiagnosisDraft({ ...diagnosisDraft, symptom: value })}
            value={diagnosisDraft.symptom}
          />
          <Field
            label="Proximate cause"
            onChange={(value) => setDiagnosisDraft({ ...diagnosisDraft, proximateCause: value })}
            value={diagnosisDraft.proximateCause}
          />
          <Field
            label="Root-cause hypothesis"
            onChange={(value) => setDiagnosisDraft({ ...diagnosisDraft, rootCauseHypothesis: value })}
            value={diagnosisDraft.rootCauseHypothesis}
          />
          <details className={styles.disclosure}>
            <summary>Evidence, alternatives, uncertainty</summary>
            <Field
              label="Supporting evidence"
              onChange={(value) => setDiagnosisDraft({ ...diagnosisDraft, supportingEvidence: value })}
              value={diagnosisDraft.supportingEvidence}
            />
            <Field
              label="Contradicting evidence"
              onChange={(value) => setDiagnosisDraft({ ...diagnosisDraft, contradictingEvidence: value })}
              value={diagnosisDraft.contradictingEvidence}
            />
            <Field
              label="Alternative hypotheses"
              onChange={(value) => setDiagnosisDraft({ ...diagnosisDraft, alternativeHypotheses: value })}
              value={diagnosisDraft.alternativeHypotheses}
            />
            <Field
              label="Uncertainty"
              onChange={(value) => setDiagnosisDraft({ ...diagnosisDraft, uncertainty: value })}
              value={diagnosisDraft.uncertainty}
            />
          </details>
          <button
            className={styles.primary}
            disabled={working === "diagnosis" || diagnosisDraft.rootCauseHypothesis.trim().length < 3}
            onClick={() => void confirmDiagnosis()}
            type="button"
          >
            {working === "diagnosis" ? "Saving…" : "Accept this diagnosis"}
          </button>
        </div>
      );
    }

    if (state.stage === "design") {
      if (!designDraft) {
        return (
          <div className={styles.actionBody}>
            <p>A Design changes the machine around the root cause. It is not a prettier to-do list.</p>
            <button
              className={styles.primary}
              disabled={working === "design"}
              onClick={() => void proposeDesign()}
              type="button"
            >
              {working === "design" ? "Designing…" : "Design the machine"}
            </button>
          </div>
        );
      }
      return (
        <div className={styles.actionBody}>
          <Field
            label="Machine change"
            onChange={(value) => setDesignDraft({ ...designDraft, machineChange: value })}
            value={designDraft.machineChange}
          />
          <Field
            label="Expected result"
            onChange={(value) => setDesignDraft({ ...designDraft, expectedResult: value })}
            value={designDraft.expectedResult}
          />
          <Field
            label="Success signal"
            onChange={(value) => setDesignDraft({ ...designDraft, successSignal: value })}
            value={designDraft.successSignal}
          />
          <Field
            label="Why this should work"
            onChange={(value) => setDesignDraft({ ...designDraft, rationale: value })}
            value={designDraft.rationale}
          />
          <div className={styles.actionDrafts}>
            <span>Actions</span>
            {designDraft.actions.map((action, index) => (
              <input
                aria-label={`Action ${index + 1}`}
                key={action}
                onChange={(event) => {
                  const actions = [...designDraft.actions];
                  actions[index] = event.target.value;
                  setDesignDraft({ ...designDraft, actions });
                }}
                value={action}
              />
            ))}
          </div>
          <button
            className={styles.primary}
            disabled={working === "design" || designDraft.machineChange.trim().length < 3}
            onClick={() => void confirmDesign()}
            type="button"
          >
            {working === "design" ? "Saving…" : "Adopt this design"}
          </button>
        </div>
      );
    }

    if (state.stage === "do") {
      return (
        <div className={styles.actionBody}>
          <p>{state.design?.machineChange}</p>
          <div className={styles.actionList}>
            {state.actions.map((action) => (
              <div className={styles.actionRow} key={action.id}>
                <button
                  aria-label={
                    action.status === "completed"
                      ? `Reopen ${action.commitment}`
                      : `Complete ${action.commitment}`
                  }
                  className={action.status === "completed" ? styles.actionDone : styles.actionToggle}
                  disabled={working === "do"}
                  onClick={() =>
                    void updateAction(
                      action.id,
                      action.status === "completed" ? "pending" : "completed"
                    )
                  }
                  type="button"
                >
                  {action.status === "completed" ? "✓" : action.position}
                </button>
                <span className={action.status === "completed" ? styles.completedText : undefined}>
                  {action.commitment}
                </span>
                {action.status === "pending" ? (
                  <button
                    className={styles.tertiary}
                    disabled={working === "do"}
                    onClick={() => void updateAction(action.id, "cancelled")}
                    type="button"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <p className={styles.hint}>
            Completing Actions is not success. The next step is to observe the Outcome.
          </p>
        </div>
      );
    }

    if (state.stage === "outcome") {
      return (
        <div className={styles.actionBody}>
          <div className={styles.expectedActual}>
            <div>
              <span>Expected</span>
              <strong>{state.design?.expectedResult}</strong>
            </div>
            <div>
              <span>Actual</span>
              <textarea
                aria-label="Actual outcome"
                onChange={(event) => setOutcomeText(event.target.value)}
                rows={4}
                value={outcomeText}
              />
            </div>
          </div>
          <div className={styles.choiceRow} aria-label="Outcome comparison" role="group">
            {(["improved", "mixed", "worse", "unclear"] as OutcomeComparison[]).map((value) => (
              <button
                aria-pressed={comparison === value}
                key={value}
                onClick={() => setComparison(value)}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
          <button
            className={styles.primary}
            disabled={working === "outcome" || outcomeText.trim().length < 3 || !comparison}
            onClick={() => void recordOutcome()}
            type="button"
          >
            {working === "outcome" ? "Saving…" : "Record observed outcome"}
          </button>
        </div>
      );
    }

    if (state.stage === "reflection") {
      return (
        <div className={styles.actionBody}>
          <div className={styles.painEquation}>
            <span>Pain</span><b>+</b><span>Reflection</span><b>→</b><strong>Progress</strong>
          </div>
          <div className={styles.expectedActual}>
            <div>
              <span>Expected</span>
              <strong>{state.outcome?.expectedResult}</strong>
            </div>
            <div>
              <span>Reality</span>
              <strong>{state.outcome?.actualResult}</strong>
            </div>
          </div>
          <Field label="What hurt or surprised you?" onChange={setSurprise} value={surprise} />
          <Field
            label="What should change in your model next time?"
            onChange={setLearning}
            value={learning}
          />
          <button
            className={styles.primary}
            disabled={working === "reflection" || learning.trim().length < 3}
            onClick={() => void saveReflection()}
            type="button"
          >
            {working === "reflection" ? "Saving…" : "Turn reflection into progress"}
          </button>
        </div>
      );
    }

    const principle = state.principle;
    if (!principle || principle.acceptanceState === "rejected") {
      return (
        <div className={styles.actionBody}>
          <p>A Principle is not a quote. It is a rule worth testing because Reality taught you something.</p>
          <button
            className={styles.primary}
            disabled={working === "principle"}
            onClick={() => void proposePrinciple()}
            type="button"
          >
            {working === "principle"
              ? "Distilling…"
              : principle
                ? "Try another principle"
                : "Distill a principle"}
          </button>
        </div>
      );
    }

    if (principle.acceptanceState === "pending") {
      return (
        <div className={styles.actionBody}>
          <div className={styles.principleCandidate}>
            <span>When</span><strong>{principle.trigger}</strong>
            <span>Then</span><strong>{principle.rule}</strong>
            {principle.rationale ? <p>{principle.rationale}</p> : null}
          </div>
          <details className={styles.disclosure}>
            <summary>Revise before testing</summary>
            <Field
              label="Trigger"
              onChange={setPrincipleTrigger}
              value={principleTrigger || principle.trigger}
            />
            <Field
              label="Rule"
              onChange={setPrincipleRule}
              value={principleRule || principle.rule}
            />
            <Field
              label="Rationale"
              onChange={setPrincipleRationale}
              value={principleRationale || principle.rationale || ""}
            />
            <button
              className={styles.secondary}
              disabled={working === "principle"}
              onClick={() => void reviewPrinciple("revise")}
              type="button"
            >
              Revise and test
            </button>
          </details>
          <div className={styles.buttonRow}>
            <button
              className={styles.primary}
              disabled={working === "principle"}
              onClick={() => void reviewPrinciple("accept")}
              type="button"
            >
              Accept for testing
            </button>
            <button
              className={styles.secondary}
              disabled={working === "principle"}
              onClick={() => void reviewPrinciple("reject")}
              type="button"
            >
              Reject
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.actionBody}>
        <div className={styles.livePrinciple}>
          <span>{principle.lifecycleState}</span>
          <h3>{principle.rule}</h3>
          <p>When: {principle.trigger}</p>
          <p>Born from this reflection: {sentence(state.reflection?.learning)}</p>
        </div>
        <label htmlFor="principle-reality">Test it against new reality.</label>
        <textarea
          id="principle-reality"
          onChange={(event) => setRealityText(event.target.value)}
          rows={4}
          value={realityText}
        />
        <button
          className={styles.primary}
          disabled={working === "reality" || realityText.trim().length < 3}
          onClick={() => void recordReality()}
          type="button"
        >
          Record reality against this principle
        </button>
        <a className={styles.textLink} href="/learning">Inspect learning history →</a>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <section className={styles.hero} aria-labelledby="people-title">
        <div>
          <p className={styles.eyebrow}>Principles for People</p>
          <h1 id="people-title">Evolve through reality.</h1>
          <p className={styles.heroCopy}>{progressStatement}</p>
        </div>
        <div className={styles.equation} aria-label="Evolution equation" role="group">
          <span>Dream</span><b>+</b><span>Reality</span><b>+</b><span>Determination</span><b>→</b><strong>Successful Life</strong>
        </div>
      </section>

      {error ? <div className={styles.error} role="alert">{error}</div> : null}

      <section className={styles.orientation} aria-label="Dream and reality">
        <article className={`${styles.contextPane} ${styles.dreamPane}`}>
          <p className={styles.contextLabel}>Dream</p>
          <h2>{state.dream ? state.dream.desiredState : "What do you really want?"}</h2>
          {state.dream ? (
            <details className={styles.disclosure}>
              <summary>Why this matters</summary>
              <p>{sentence(state.dream.whyItMatters)}</p>
              <dl>
                <div><dt>Success</dt><dd>{sentence(state.dream.successConditions)}</dd></div>
                <div><dt>Non-negotiable</dt><dd>{sentence(state.dream.nonNegotiables)}</dd></div>
              </dl>
            </details>
          ) : null}
        </article>
        <article className={`${styles.contextPane} ${styles.realityPane}`}>
          <p className={styles.contextLabel}>Reality</p>
          <h2>{state.reality ? state.reality.statement : "What is actually true?"}</h2>
          {state.reality ? (
            <p className={styles.timestamp}>
              Observed {new Date(state.reality.observedAt).toLocaleDateString()}
            </p>
          ) : null}
        </article>
      </section>

      {state.problem ? (
        <section className={styles.gap} aria-label="Active gap">
          <p>The gap</p>
          <h2>{sentence(state.problem.gap, state.problem.statement)}</h2>
          {state.problem.gap && state.problem.statement !== state.problem.gap ? (
            <span>{state.problem.statement}</span>
          ) : null}
        </section>
      ) : null}

      <section className={styles.fiveSteps} aria-labelledby="five-steps-title">
        <div className={styles.sectionLead}>
          <div>
            <p className={styles.eyebrow}>5 Steps to Get What You Want</p>
            <h2 id="five-steps-title">Determination has a method.</h2>
          </div>
          <span className={styles.stageBadge}>{state.nextAction.label}</span>
        </div>
        <ol className={styles.stepRail}>
          {state.fiveSteps.steps.map((step, index) => (
            <li className={styles[step.status]} key={step.key}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step.label}</strong>
            </li>
          ))}
        </ol>
      </section>

      {state.attention.length > 0 ? (
        <aside className={styles.attention} aria-label="Needs attention">
          {state.attention.slice(0, 3).map((item) => (
            <div key={item.kind}>
              <span>{item.kind === "pain_needs_reflection" ? "Pain + Reflection" : "Learning"}</span>
              <strong>{item.title}</strong>
            </div>
          ))}
        </aside>
      ) : null}

      <section className={styles.next} aria-labelledby="next-action-title">
        <p className={styles.eyebrow}>Now</p>
        <h2 id="next-action-title">{state.nextAction.prompt}</h2>
        {renderStageAction()}
      </section>

      <EvolutionMemory state={state} />
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
    <section className={styles.memory} aria-labelledby="memory-title">
      <div className={styles.sectionLead}>
        <div>
          <p className={styles.eyebrow}>What this cycle knows</p>
          <h2 id="memory-title">Inspect the reasoning, not a stack of cards.</h2>
        </div>
      </div>
      <div className={styles.memoryGrid}>
        {state.diagnosis ? (
          <details>
            <summary>Diagnosis</summary>
            <strong>{state.diagnosis.rootCauseHypothesis}</strong>
            <p>Symptom: {state.diagnosis.symptom}</p>
            {state.diagnosis.proximateCause ? <p>Proximate cause: {state.diagnosis.proximateCause}</p> : null}
            {state.diagnosis.uncertainty ? <p>Uncertainty: {state.diagnosis.uncertainty}</p> : null}
          </details>
        ) : null}
        {state.design ? (
          <details>
            <summary>Machine design</summary>
            <strong>{state.design.machineChange}</strong>
            <p>Expected: {state.design.expectedResult}</p>
            <p>Signal: {state.design.successSignal}</p>
          </details>
        ) : null}
        {state.outcome ? (
          <details>
            <summary>Outcome · {state.outcome.comparison}</summary>
            <strong>{state.outcome.actualResult}</strong>
            <p>Expected: {state.outcome.expectedResult}</p>
          </details>
        ) : null}
        {state.reflection ? (
          <details>
            <summary>Reflection</summary>
            <strong>{sentence(state.reflection.learning)}</strong>
            {state.reflection.surprise ? <p>Pain / surprise: {state.reflection.surprise}</p> : null}
          </details>
        ) : null}
        {state.principle && state.principle.acceptanceState !== "rejected" ? (
          <details>
            <summary>Living principle · {state.principle.lifecycleState}</summary>
            <strong>{state.principle.rule}</strong>
            <p>When: {state.principle.trigger}</p>
            {state.principle.rationale ? <p>{state.principle.rationale}</p> : null}
          </details>
        ) : null}
      </div>
    </section>
  );
}
