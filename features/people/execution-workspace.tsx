"use client";

import { useMemo, useState } from "react";
import type { ClientPeopleState } from "./contracts";
import type {
  ClientExecutionState,
  DiagnosisProposal,
  DesignProposal,
  OutcomeComparison,
} from "./execution-contracts";
import styles from "./execution-workspace.module.css";

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

function phaseTwoContext(people: ClientPeopleState) {
  const goal = people.goals.find((item) => item.status === "chosen") ?? people.goals[0];
  if (!goal) {
    return null;
  }
  const problem = people.problems.find((item) => item.goalId === goal.id);
  if (!problem) {
    return null;
  }
  const reflectionIds = new Set(
    people.reflections
      .filter((item) => item.problemId === problem.id)
      .map((item) => item.id)
  );
  const reviewedPrinciple = people.principles.find(
    (item) =>
      item.originReflectionId &&
      reflectionIds.has(item.originReflectionId) &&
      item.acceptanceState !== "pending"
  );
  return reviewedPrinciple ? { goal, problem } : null;
}

export function ExecutionWorkspace({
  initialExecutionState,
  initialPeopleState,
}: {
  initialExecutionState: ClientExecutionState;
  initialPeopleState: ClientPeopleState;
}) {
  const context = useMemo(() => phaseTwoContext(initialPeopleState), [initialPeopleState]);
  const [state, setState] = useState(initialExecutionState);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnosisDraft, setDiagnosisDraft] = useState<DiagnosisProposal | null>(null);
  const [editingDiagnosis, setEditingDiagnosis] = useState(false);
  const [designDraft, setDesignDraft] = useState<DesignProposal | null>(null);
  const [editingDesign, setEditingDesign] = useState(false);
  const [outcomeText, setOutcomeText] = useState("");
  const [comparison, setComparison] = useState<OutcomeComparison | null>(null);
  const [reviewStep, setReviewStep] = useState<"learning" | "surprise">("surprise");
  const [reviewSurprise, setReviewSurprise] = useState("");
  const [reviewLearning, setReviewLearning] = useState("");

  if (!context) {
    return null;
  }
  const problemId = context.problem.id;

  const diagnosis = state.diagnoses.find((item) => item.problemId === problemId);
  const design = diagnosis
    ? state.designs.find((item) => item.diagnosisId === diagnosis.id)
    : undefined;
  const actions = design
    ? state.actions
        .filter((item) => item.designId === design.id)
        .sort((a, b) => a.position - b.position)
    : [];
  const outcome = design
    ? state.outcomes.find((item) => item.designId === design.id)
    : undefined;
  const review = outcome
    ? state.outcomeReviews.find((item) => item.outcomeId === outcome.id)
    : undefined;
  const hasPendingActions = actions.some((item) => item.status === "pending");
  const stage = !diagnosis
    ? 0
    : !design
      ? 1
      : hasPendingActions
        ? 2
        : !outcome
          ? 3
          : !review
            ? 4
            : 5;

  async function refreshState() {
    const response = await fetch("/api/people/execution/state", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not refresh execution state.");
    }
    setState((await response.json()) as ClientExecutionState);
  }

  async function run(label: string, action: () => Promise<void>) {
    if (working) {
      return;
    }
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

  async function proposeDiagnosis() {
    await run("diagnosis", async () => {
      const proposal = await jsonRequest<DiagnosisProposal>(
        "/api/people/diagnoses/propose",
        {
          body: JSON.stringify({ problemId }),
          method: "POST",
        }
      );
      setDiagnosisDraft(proposal);
      setEditingDiagnosis(false);
    });
  }

  async function confirmDiagnosis() {
    if (!diagnosisDraft) {
      return;
    }
    await run("diagnosis", async () => {
      await jsonRequest("/api/people/diagnoses", {
        body: JSON.stringify({ ...diagnosisDraft, problemId }),
        method: "POST",
      });
      setDiagnosisDraft(null);
      setEditingDiagnosis(false);
      await refreshState();
    });
  }

  async function proposeDesign() {
    if (!diagnosis) {
      return;
    }
    await run("design", async () => {
      const proposal = await jsonRequest<DesignProposal>(
        "/api/people/designs/propose",
        {
          body: JSON.stringify({ diagnosisId: diagnosis.id }),
          method: "POST",
        }
      );
      setDesignDraft(proposal);
      setEditingDesign(false);
    });
  }

  async function confirmDesign() {
    if (!diagnosis || !designDraft) {
      return;
    }
    await run("design", async () => {
      await jsonRequest("/api/people/designs", {
        body: JSON.stringify({ ...designDraft, diagnosisId: diagnosis.id }),
        method: "POST",
      });
      setDesignDraft(null);
      setEditingDesign(false);
      await refreshState();
    });
  }

  async function updateAction(actionId: string, status: "cancelled" | "completed" | "pending") {
    await run("action", async () => {
      await jsonRequest("/api/people/actions", {
        body: JSON.stringify({ actionId, status }),
        method: "POST",
      });
      await refreshState();
    });
  }

  async function recordOutcome() {
    if (!design || !comparison) {
      return;
    }
    await run("outcome", async () => {
      await jsonRequest("/api/people/outcomes", {
        body: JSON.stringify({
          actualResult: outcomeText,
          comparison,
          designId: design.id,
        }),
        method: "POST",
      });
      setOutcomeText("");
      setComparison(null);
      await refreshState();
    });
  }

  async function saveReview() {
    if (!outcome) {
      return;
    }
    await run("review", async () => {
      await jsonRequest("/api/people/outcome-reviews", {
        body: JSON.stringify({
          learning: reviewLearning,
          outcomeId: outcome.id,
          surprise: reviewSurprise,
        }),
        method: "POST",
      });
      setReviewLearning("");
      setReviewSurprise("");
      setReviewStep("surprise");
      await refreshState();
    });
  }

  return (
    <section className={styles.shell} aria-label="Design and execution">
      <div className={styles.content}>
        <div className={styles.heading}>
          <span>Change the machine</span>
          <strong>Make reality move.</strong>
        </div>

        <ol className={styles.steps} aria-label="Change loop">
          {["Diagnose", "Design", "Do", "Outcome", "Review"].map((label, index) => (
            <li
              className={index === stage ? styles.active : index < stage ? styles.done : undefined}
              key={label}
            >
              <span>{index + 1}</span>{label}
            </li>
          ))}
        </ol>

        {error ? <div className={styles.error} role="alert">{error}</div> : null}

        {!diagnosis ? (
          <DiagnosisCapture
            draft={diagnosisDraft}
            editing={editingDiagnosis}
            onChange={setDiagnosisDraft}
            onConfirm={() => void confirmDiagnosis()}
            onEdit={setEditingDiagnosis}
            onPropose={() => void proposeDiagnosis()}
            working={working === "diagnosis"}
          />
        ) : (
          <DiagnosisSummary diagnosis={diagnosis} />
        )}

        {diagnosis && !design ? (
          <DesignCapture
            draft={designDraft}
            editing={editingDesign}
            onChange={setDesignDraft}
            onConfirm={() => void confirmDesign()}
            onEdit={setEditingDesign}
            onPropose={() => void proposeDesign()}
            working={working === "design"}
          />
        ) : null}

        {design ? <DesignSummary design={design} /> : null}

        {design && !outcome ? (
          <ActionList
            actions={actions}
            onUpdate={(actionId, status) => void updateAction(actionId, status)}
            working={working === "action"}
          />
        ) : null}

        {design && !hasPendingActions && !outcome ? (
          <OutcomeCapture
            comparison={comparison}
            expected={design.expectedResult}
            onComparison={setComparison}
            onRecord={() => void recordOutcome()}
            onText={setOutcomeText}
            text={outcomeText}
            working={working === "outcome"}
          />
        ) : null}

        {outcome ? <OutcomeSummary outcome={outcome} /> : null}

        {outcome && !review ? (
          <ReviewCapture
            learning={reviewLearning}
            onLearning={setReviewLearning}
            onSave={() => void saveReview()}
            onStep={setReviewStep}
            onSurprise={setReviewSurprise}
            step={reviewStep}
            surprise={reviewSurprise}
            working={working === "review"}
          />
        ) : null}

        {review ? <ReviewSummary review={review} /> : null}
      </div>
    </section>
  );
}

function DiagnosisCapture({
  draft,
  editing,
  onChange,
  onConfirm,
  onEdit,
  onPropose,
  working,
}: {
  draft: DiagnosisProposal | null;
  editing: boolean;
  onChange: (value: DiagnosisProposal) => void;
  onConfirm: () => void;
  onEdit: (value: boolean) => void;
  onPropose: () => void;
  working: boolean;
}) {
  if (!draft) {
    return (
      <section className={styles.card}>
        <div className={styles.cardHeading}>
          <span>Diagnose</span>
          <strong>Why is this actually happening?</strong>
        </div>
        <button className={styles.primary} disabled={working} onClick={onPropose} type="button">
          {working ? "Thinking…" : "Diagnose root cause"}
        </button>
      </section>
    );
  }

  if (editing) {
    const fields: Array<[keyof DiagnosisProposal, string]> = [
      ["symptom", "Symptom"],
      ["proximateCause", "Proximate cause"],
      ["rootCauseHypothesis", "Root-cause hypothesis"],
      ["supportingEvidence", "Evidence for"],
      ["contradictingEvidence", "Evidence against"],
      ["alternativeHypotheses", "Alternatives"],
      ["uncertainty", "Uncertainty"],
    ];
    return (
      <section className={styles.card}>
        <div className={styles.cardHeading}>
          <span>Diagnose</span>
          <strong>Revise the hypothesis.</strong>
        </div>
        <div className={styles.stack}>
          {fields.map(([field, label]) => (
            <label key={field}>
              {label}
              <textarea
                className={styles.textarea}
                onChange={(event) => onChange({ ...draft, [field]: event.target.value })}
                rows={field === "rootCauseHypothesis" ? 4 : 3}
                value={String(draft[field] ?? "")}
              />
            </label>
          ))}
        </div>
        <div className={styles.buttonRow}>
          <button className={styles.primary} disabled={working} onClick={onConfirm} type="button">Save diagnosis</button>
          <button className={styles.secondary} onClick={() => onEdit(false)} type="button">Cancel edit</button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHeading}>
        <span>Root-cause hypothesis</span>
        <strong className={styles.rootCause}>{draft.rootCauseHypothesis}</strong>
      </div>
      <details>
        <summary>Inspect diagnosis</summary>
        <dl className={styles.details}>
          <div><dt>Symptom</dt><dd>{draft.symptom}</dd></div>
          <div><dt>Proximate</dt><dd>{draft.proximateCause}</dd></div>
          <div><dt>For</dt><dd>{draft.supportingEvidence}</dd></div>
          <div><dt>Against</dt><dd>{draft.contradictingEvidence}</dd></div>
          <div><dt>Alternatives</dt><dd>{draft.alternativeHypotheses}</dd></div>
          <div><dt>Uncertainty</dt><dd>{draft.uncertainty}</dd></div>
          {draft.confidence !== null ? <div><dt>Confidence</dt><dd>{Math.round(draft.confidence * 100)}%</dd></div> : null}
        </dl>
      </details>
      <div className={styles.buttonRow}>
        <button className={styles.primary} disabled={working} onClick={onConfirm} type="button">Use this diagnosis</button>
        <button className={styles.secondary} onClick={() => onEdit(true)} type="button">Edit</button>
        <button className={styles.secondary} disabled={working} onClick={onPropose} type="button">Try another</button>
      </div>
    </section>
  );
}

function DiagnosisSummary({ diagnosis }: { diagnosis: ClientExecutionState["diagnoses"][number] }) {
  return (
    <section className={styles.summary}>
      <div className={styles.label}>Diagnosis</div>
      <strong>{diagnosis.rootCauseHypothesis}</strong>
      <details>
        <summary>Diagnosis evidence</summary>
        <dl className={styles.details}>
          <div><dt>Symptom</dt><dd>{diagnosis.symptom}</dd></div>
          <div><dt>Proximate</dt><dd>{diagnosis.proximateCause}</dd></div>
          <div><dt>For</dt><dd>{diagnosis.supportingEvidence}</dd></div>
          <div><dt>Against</dt><dd>{diagnosis.contradictingEvidence}</dd></div>
          <div><dt>Alternatives</dt><dd>{diagnosis.alternativeHypotheses}</dd></div>
          <div><dt>Uncertainty</dt><dd>{diagnosis.uncertainty}</dd></div>
        </dl>
      </details>
    </section>
  );
}

function DesignCapture({
  draft,
  editing,
  onChange,
  onConfirm,
  onEdit,
  onPropose,
  working,
}: {
  draft: DesignProposal | null;
  editing: boolean;
  onChange: (value: DesignProposal) => void;
  onConfirm: () => void;
  onEdit: (value: boolean) => void;
  onPropose: () => void;
  working: boolean;
}) {
  if (!draft) {
    return (
      <section className={styles.card}>
        <div className={styles.cardHeading}>
          <span>Design</span>
          <strong>Change the machine, not the symptom.</strong>
        </div>
        <button className={styles.primary} disabled={working} onClick={onPropose} type="button">
          {working ? "Thinking…" : "Design the machine"}
        </button>
      </section>
    );
  }

  if (editing) {
    return (
      <section className={styles.card}>
        <div className={styles.cardHeading}>
          <span>Design</span>
          <strong>Revise the machine change.</strong>
        </div>
        <div className={styles.stack}>
          <label>Machine change<textarea className={styles.textarea} rows={4} value={draft.machineChange} onChange={(event) => onChange({ ...draft, machineChange: event.target.value })} /></label>
          <label>Why it should work<textarea className={styles.textarea} rows={3} value={draft.rationale} onChange={(event) => onChange({ ...draft, rationale: event.target.value })} /></label>
          <label>Expected result<textarea className={styles.textarea} rows={3} value={draft.expectedResult} onChange={(event) => onChange({ ...draft, expectedResult: event.target.value })} /></label>
          <label>Success signal<textarea className={styles.textarea} rows={3} value={draft.successSignal} onChange={(event) => onChange({ ...draft, successSignal: event.target.value })} /></label>
          {draft.actions.map((action, index) => (
            <label key={`action-${index + 1}`}>Action {index + 1}<input className={styles.input} value={action} onChange={(event) => onChange({ ...draft, actions: draft.actions.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} /></label>
          ))}
        </div>
        <div className={styles.buttonRow}>
          <button className={styles.primary} disabled={working} onClick={onConfirm} type="button">Save design</button>
          <button className={styles.secondary} onClick={() => onEdit(false)} type="button">Cancel edit</button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHeading}>
        <span>Machine change</span>
        <strong className={styles.machineChange}>{draft.machineChange}</strong>
      </div>
      <p className={styles.statement}>{draft.expectedResult}</p>
      <details>
        <summary>Design details</summary>
        <dl className={styles.details}>
          <div><dt>Why</dt><dd>{draft.rationale}</dd></div>
          <div><dt>Signal</dt><dd>{draft.successSignal}</dd></div>
          <div><dt>Actions</dt><dd>{draft.actions.join(" · ")}</dd></div>
        </dl>
      </details>
      <div className={styles.buttonRow}>
        <button className={styles.primary} disabled={working} onClick={onConfirm} type="button">Use this design</button>
        <button className={styles.secondary} onClick={() => onEdit(true)} type="button">Edit</button>
        <button className={styles.secondary} disabled={working} onClick={onPropose} type="button">Try another</button>
      </div>
    </section>
  );
}

function DesignSummary({ design }: { design: ClientExecutionState["designs"][number] }) {
  return (
    <section className={styles.summary}>
      <div className={styles.label}>Design</div>
      <strong>{design.machineChange}</strong>
      <details>
        <summary>Expected change</summary>
        <dl className={styles.details}>
          <div><dt>Why</dt><dd>{design.rationale}</dd></div>
          <div><dt>Expected</dt><dd>{design.expectedResult}</dd></div>
          <div><dt>Signal</dt><dd>{design.successSignal}</dd></div>
        </dl>
      </details>
    </section>
  );
}

function ActionList({
  actions,
  onUpdate,
  working,
}: {
  actions: ClientExecutionState["actions"];
  onUpdate: (actionId: string, status: "cancelled" | "completed" | "pending") => void;
  working: boolean;
}) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeading}>
        <span>Do</span>
        <strong>Execute the design.</strong>
      </div>
      <div className={styles.actionList}>
        {actions.map((action, index) => (
          <div className={styles.actionRow} key={action.id}>
            <div>
              <p>{action.commitment}</p>
              <span className={styles.status}>{action.status}</span>
            </div>
            <div className={styles.actionControls}>
              {action.status === "pending" ? (
                <>
                  <button aria-label={`Complete action ${index + 1}`} className={styles.actionButton} disabled={working} onClick={() => onUpdate(action.id, "completed")} type="button">Done</button>
                  <button aria-label={`Cancel action ${index + 1}`} className={styles.actionButton} disabled={working} onClick={() => onUpdate(action.id, "cancelled")} type="button">Skip</button>
                </>
              ) : (
                <button aria-label={`Reopen action ${index + 1}`} className={styles.actionButton} disabled={working} onClick={() => onUpdate(action.id, "pending")} type="button">Reopen</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OutcomeCapture({
  comparison,
  expected,
  onComparison,
  onRecord,
  onText,
  text,
  working,
}: {
  comparison: OutcomeComparison | null;
  expected: string;
  onComparison: (value: OutcomeComparison) => void;
  onRecord: () => void;
  onText: (value: string) => void;
  text: string;
  working: boolean;
}) {
  const choices: Array<[OutcomeComparison, string]> = [
    ["improved", "Improved"],
    ["mixed", "Mixed"],
    ["worse", "Worse"],
    ["unclear", "Unclear"],
  ];
  return (
    <section className={styles.card}>
      <div className={styles.cardHeading}>
        <span>Outcome</span>
        <strong>What actually happened?</strong>
      </div>
      <p className={styles.statement}>Expected: {expected}</p>
      <textarea aria-label="Outcome result" className={styles.textarea} onChange={(event) => onText(event.target.value)} rows={5} value={text} />
      <div className={styles.choiceRow}>
        {choices.map(([value, label]) => (
          <button className={comparison === value ? styles.primary : styles.secondary} key={value} onClick={() => onComparison(value)} type="button">{label}</button>
        ))}
      </div>
      <button className={styles.primary} disabled={working || text.trim().length < 3 || !comparison} onClick={onRecord} type="button">{working ? "Saving…" : "Record outcome"}</button>
    </section>
  );
}

function OutcomeSummary({ outcome }: { outcome: ClientExecutionState["outcomes"][number] }) {
  return (
    <section className={styles.summary}>
      <div className={styles.label}>Outcome · {outcome.comparison}</div>
      <strong className={styles.outcome}>{outcome.actualResult}</strong>
      <details>
        <summary>Compare with expectation</summary>
        <dl className={styles.details}>
          <div><dt>Expected</dt><dd>{outcome.expectedResult}</dd></div>
          <div><dt>Actual</dt><dd>{outcome.actualResult}</dd></div>
        </dl>
      </details>
    </section>
  );
}

function ReviewCapture({
  learning,
  onLearning,
  onSave,
  onStep,
  onSurprise,
  step,
  surprise,
  working,
}: {
  learning: string;
  onLearning: (value: string) => void;
  onSave: () => void;
  onStep: (value: "learning" | "surprise") => void;
  onSurprise: (value: string) => void;
  step: "learning" | "surprise";
  surprise: string;
  working: boolean;
}) {
  if (step === "surprise") {
    return (
      <section className={styles.card}>
        <div className={styles.cardHeading}>
          <span>Review</span>
          <strong>What surprised you about the result?</strong>
        </div>
        <textarea aria-label="Outcome review answer" className={styles.textarea} onChange={(event) => onSurprise(event.target.value)} rows={5} value={surprise} />
        <button className={styles.primary} onClick={() => onStep("learning")} type="button">Continue</button>
      </section>
    );
  }
  return (
    <section className={styles.card}>
      <div className={styles.cardHeading}>
        <span>Review</span>
        <strong>What did this result teach you?</strong>
      </div>
      <textarea aria-label="Outcome review answer" className={styles.textarea} onChange={(event) => onLearning(event.target.value)} rows={5} value={learning} />
      <button className={styles.primary} disabled={working || learning.trim().length < 3} onClick={onSave} type="button">{working ? "Saving…" : "Complete review"}</button>
    </section>
  );
}

function ReviewSummary({ review }: { review: ClientExecutionState["outcomeReviews"][number] }) {
  return (
    <section className={styles.summary}>
      <div className={styles.label}>Review</div>
      <strong>{review.learning}</strong>
      {review.surprise ? <p className={styles.statement}>{review.surprise}</p> : null}
      <span className={styles.meta}>Loop complete</span>
    </section>
  );
}
