"use client";

import { useMemo, useState } from "react";
import type {
  ClientPeopleState,
  ClientPrincipleRecord,
  GoalDiscoveryResult,
  GoalDraft,
  ProblemProposal,
} from "./contracts";
import styles from "./people-workspace.module.css";

const emptyGoal: GoalDraft = {
  acceptedTradeoffs: "",
  desiredState: "",
  measures: "",
  nonNegotiables: "",
  successConditions: "",
  whyItMatters: "",
};

const goalQuestions: Record<keyof GoalDraft, string> = {
  acceptedTradeoffs: "What are you willing to give up or deprioritize for this goal?",
  desiredState: "What reality do you actually want to create?",
  measures: "Is there a useful measure that would help you see progress without replacing the goal?",
  nonNegotiables: "What boundary must remain true while you pursue this goal?",
  successConditions: "What would make you say this desired reality is genuinely true?",
  whyItMatters: "Why does this matter enough to organize your attention around it?",
};

type ReflectionDraft = {
  expected: string;
  happened: string;
  learning: string;
  recurrenceNote: string;
  recurring: boolean | null;
  surprise: string;
};

type ReflectionStep =
  | "happened"
  | "expected"
  | "surprise"
  | "recurring"
  | "recurrenceNote"
  | "learning";

const emptyReflection: ReflectionDraft = {
  expected: "",
  happened: "",
  learning: "",
  recurrenceNote: "",
  recurring: null,
  surprise: "",
};

const reflectionQuestions: Record<Exclude<ReflectionStep, "recurring">, string> = {
  expected: "What did you expect instead?",
  happened: "What happened?",
  learning: "What might this teach you?",
  recurrenceNote: "Where have you seen this pattern before?",
  surprise: "What surprised or hurt?",
};

function latestForGoal<T extends { goalId: string | null }>(
  items: T[],
  goalId: string
): T | undefined {
  return items.find((item) => item.goalId === goalId);
}

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

export function PeopleWorkspace({
  email,
  initialState,
  workspaceName,
}: {
  email: string;
  initialState: ClientPeopleState;
  workspaceName: string;
}) {
  const [state, setState] = useState(initialState);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [goalDraft, setGoalDraft] = useState<GoalDraft>(emptyGoal);
  const [goalDiscovery, setGoalDiscovery] = useState<GoalDiscoveryResult>({
    field: "desiredState",
    kind: "question",
    question: goalQuestions.desiredState,
  });
  const [problemProposal, setProblemProposal] = useState<ProblemProposal | null>(null);
  const [problemStatement, setProblemStatement] = useState("");
  const [problemGap, setProblemGap] = useState("");
  const [reflectionDraft, setReflectionDraft] = useState<ReflectionDraft>(emptyReflection);
  const [reflectionStep, setReflectionStep] = useState<ReflectionStep>("happened");
  const [editingPrinciple, setEditingPrinciple] = useState<ClientPrincipleRecord | null>(null);

  const activeGoal = useMemo(
    () => state.goals.find((goal) => goal.status === "chosen") ?? state.goals[0],
    [state.goals]
  );
  const reality = activeGoal
    ? state.reality.find((item) => item.goalId === activeGoal.id)
    : undefined;
  const problem = activeGoal
    ? state.problems.find((item) => item.goalId === activeGoal.id)
    : undefined;
  const reflection = activeGoal
    ? latestForGoal(state.reflections, activeGoal.id)
    : undefined;
  const principle = reflection
    ? state.principles.find((item) => item.originReflectionId === reflection.id)
    : undefined;

  const stage = !activeGoal
    ? 0
    : !reality
      ? 1
      : !problem
        ? 2
        : !reflection
          ? 3
          : 4;

  async function refreshState() {
    const response = await fetch("/api/people/state", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not refresh your state.");
    }
    setState((await response.json()) as ClientPeopleState);
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

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.reload();
  }

  async function continueGoal() {
    await run("goal", async () => {
      const result = await jsonRequest<GoalDiscoveryResult>(
        "/api/people/goal-discovery",
        { body: JSON.stringify(goalDraft), method: "POST" }
      );
      setGoalDiscovery(result);
    });
  }

  async function commitGoal() {
    await run("goal", async () => {
      await jsonRequest("/api/people/goals", {
        body: JSON.stringify(goalDraft),
        method: "POST",
      });
      await refreshState();
    });
  }

  async function recordReality(statement: string) {
    if (!activeGoal) {
      return;
    }
    await run("reality", async () => {
      await jsonRequest("/api/people/reality", {
        body: JSON.stringify({ goalId: activeGoal.id, statement }),
        method: "POST",
      });
      await refreshState();
    });
  }

  async function proposeProblem() {
    if (!activeGoal || !reality) {
      return;
    }
    await run("problem", async () => {
      const proposal = await jsonRequest<ProblemProposal>(
        "/api/people/problems/propose",
        {
          body: JSON.stringify({
            goalId: activeGoal.id,
            observationId: reality.observationId,
          }),
          method: "POST",
        }
      );
      setProblemProposal(proposal);
      setProblemStatement(proposal.statement);
      setProblemGap(proposal.gap);
    });
  }

  async function confirmProblem() {
    if (!activeGoal || !reality) {
      return;
    }
    await run("problem", async () => {
      await jsonRequest("/api/people/problems", {
        body: JSON.stringify({
          gap: problemGap,
          goalId: activeGoal.id,
          observationId: reality.observationId,
          statement: problemStatement,
          suggestionId: problemProposal?.suggestionId ?? null,
        }),
        method: "POST",
      });
      setProblemProposal(null);
      await refreshState();
    });
  }

  async function saveReflection() {
    if (!activeGoal || !problem || reflectionDraft.recurring === null) {
      return;
    }
    await run("reflection", async () => {
      await jsonRequest("/api/people/reflections", {
        body: JSON.stringify({
          ...reflectionDraft,
          goalId: activeGoal.id,
          problemId: problem.id,
        }),
        method: "POST",
      });
      setReflectionDraft(emptyReflection);
      setReflectionStep("happened");
      await refreshState();
    });
  }

  async function proposePrinciple() {
    if (!reflection) {
      return;
    }
    await run("principle", async () => {
      await jsonRequest("/api/people/principles/propose", {
        body: JSON.stringify({ reflectionId: reflection.id }),
        method: "POST",
      });
      await refreshState();
    });
  }

  async function reviewPrinciple(
    action: "accept" | "reject" | "revise",
    candidate: ClientPrincipleRecord
  ) {
    await run("principle", async () => {
      const editable = editingPrinciple ?? candidate;
      await jsonRequest("/api/people/principles/review", {
        body: JSON.stringify({
          action,
          principleId: candidate.id,
          ...(action === "revise"
            ? {
                rationale: editable.rationale ?? "",
                rule: editable.rule,
                trigger: editable.trigger,
              }
            : {}),
        }),
        method: "POST",
      });
      setEditingPrinciple(null);
      await refreshState();
    });
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/">Principles</a>
        <nav className={styles.nav} aria-label="Primary">
          <a aria-current="page" href="/">People</a>
          <a href="/knowledge">Knowledge</a>
          <a href="/learning">Learning</a>
          <a href="/organization">Organization</a>
        </nav>
        <div className={styles.account}>
          <span>{workspaceName}</span>
          <span>{email}</span>
          <button onClick={() => void signOut()} type="button">Sign out</button>
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Principles for People</p>
          <h1>Evolve from reality.</h1>
        </div>

        <ol className={styles.steps} aria-label="Evolution loop">
          {["Goal", "Reality", "Problem", "Reflect", "Principle"].map((label, index) => (
            <li
              className={index === stage ? styles.activeStep : index < stage ? styles.doneStep : undefined}
              key={label}
            >
              <span>{index + 1}</span>{label}
            </li>
          ))}
        </ol>

        {error ? <div className={styles.error} role="alert">{error}</div> : null}

        {!activeGoal ? (
          <GoalDiscovery
            discovery={goalDiscovery}
            draft={goalDraft}
            onChange={setGoalDraft}
            onCommit={() => void commitGoal()}
            onContinue={() => void continueGoal()}
            working={working === "goal"}
          />
        ) : (
          <GoalSummary goal={activeGoal} />
        )}

        {activeGoal && !reality ? (
          <RealityCapture
            onSave={(statement) => void recordReality(statement)}
            working={working === "reality"}
          />
        ) : null}

        {activeGoal && reality ? <RealitySummary reality={reality} /> : null}

        {activeGoal && reality && !problem ? (
          <ProblemCapture
            gap={problemGap}
            onConfirm={() => void confirmProblem()}
            onGapChange={setProblemGap}
            onPropose={() => void proposeProblem()}
            onStatementChange={setProblemStatement}
            proposal={problemProposal}
            statement={problemStatement}
            working={working === "problem"}
          />
        ) : null}

        {problem ? <ProblemSummary problem={problem} /> : null}

        {activeGoal && problem && !reflection ? (
          <ReflectionCapture
            draft={reflectionDraft}
            onChange={setReflectionDraft}
            onSave={() => void saveReflection()}
            onStepChange={setReflectionStep}
            step={reflectionStep}
            working={working === "reflection"}
          />
        ) : null}

        {reflection ? <ReflectionSummary reflection={reflection} /> : null}

        {reflection && !principle ? (
          <section className={styles.card}>
            <div className={styles.cardHeading}>
              <span>Principle</span>
              <strong>Turn learning into a rule.</strong>
            </div>
            <button
              className={styles.primary}
              disabled={working === "principle"}
              onClick={() => void proposePrinciple()}
              type="button"
            >
              {working === "principle" ? "Thinking…" : "Propose a principle"}
            </button>
          </section>
        ) : null}

        {principle ? (
          <PrincipleCandidate
            candidate={principle}
            editing={editingPrinciple}
            onEdit={setEditingPrinciple}
            onReview={(action) => void reviewPrinciple(action, principle)}
            onTryAnother={principle.acceptanceState === "rejected" ? () => void proposePrinciple() : undefined}
            working={working === "principle"}
          />
        ) : null}
      </section>
    </main>
  );
}

function GoalDiscovery({
  discovery,
  draft,
  onChange,
  onCommit,
  onContinue,
  working,
}: {
  discovery: GoalDiscoveryResult;
  draft: GoalDraft;
  onChange: (draft: GoalDraft) => void;
  onCommit: () => void;
  onContinue: () => void;
  working: boolean;
}) {
  if (discovery.kind === "ready") {
    return (
      <section className={styles.card}>
        <div className={styles.cardHeading}>
          <span>Goal</span>
          <strong>{draft.desiredState}</strong>
        </div>
        <p className={styles.statement}>{discovery.summary}</p>
        <button className={styles.primary} disabled={working} onClick={onCommit} type="button">
          {working ? "Saving…" : "Choose this goal"}
        </button>
      </section>
    );
  }

  const field = discovery.field;
  return (
    <section className={styles.card}>
      <div className={styles.cardHeading}>
        <span>Goal discovery</span>
        <strong>{discovery.question}</strong>
      </div>
      <textarea
        aria-label="Goal discovery answer"
        className={styles.textarea}
        onChange={(event) => onChange({ ...draft, [field]: event.target.value })}
        rows={5}
        value={draft[field]}
      />
      <button
        className={styles.primary}
        disabled={working || draft[field].trim().length < 1}
        onClick={onContinue}
        type="button"
      >
        {working ? "Thinking…" : "Continue"}
      </button>
    </section>
  );
}

function GoalSummary({ goal }: { goal: ClientPeopleState["goals"][number] }) {
  return (
    <section className={styles.summaryCard}>
      <div className={styles.summaryLabel}>Goal</div>
      <strong>{goal.desiredState}</strong>
      <details>
        <summary>Goal boundaries</summary>
        <dl className={styles.details}>
          <div><dt>Why</dt><dd>{goal.whyItMatters}</dd></div>
          <div><dt>Success</dt><dd>{goal.successConditions}</dd></div>
          <div><dt>Trade-offs</dt><dd>{goal.acceptedTradeoffs}</dd></div>
          <div><dt>Non-negotiable</dt><dd>{goal.nonNegotiables}</dd></div>
          {goal.measures ? <div><dt>Measure</dt><dd>{goal.measures}</dd></div> : null}
        </dl>
      </details>
    </section>
  );
}

function RealityCapture({ onSave, working }: { onSave: (value: string) => void; working: boolean }) {
  const [value, setValue] = useState("");
  return (
    <section className={styles.card}>
      <div className={styles.cardHeading}>
        <span>Reality</span>
        <strong>What is actually true right now?</strong>
      </div>
      <textarea
        aria-label="Reality observation"
        className={styles.textarea}
        onChange={(event) => setValue(event.target.value)}
        rows={5}
        value={value}
      />
      <button className={styles.primary} disabled={working || value.trim().length < 3} onClick={() => onSave(value)} type="button">
        {working ? "Saving…" : "Record observation"}
      </button>
    </section>
  );
}

function RealitySummary({ reality }: { reality: ClientPeopleState["reality"][number] }) {
  return (
    <section className={styles.summaryCard}>
      <div className={styles.summaryLabel}>Reality</div>
      <strong>{reality.statement}</strong>
      <details>
        <summary>Evidence</summary>
        <p className={styles.evidence}>{reality.statement}</p>
        <span className={styles.meta}>Direct observation · {new Date(reality.observedAt).toLocaleDateString()}</span>
      </details>
    </section>
  );
}

function ProblemCapture({
  gap,
  onConfirm,
  onGapChange,
  onPropose,
  onStatementChange,
  proposal,
  statement,
  working,
}: {
  gap: string;
  onConfirm: () => void;
  onGapChange: (value: string) => void;
  onPropose: () => void;
  onStatementChange: (value: string) => void;
  proposal: ProblemProposal | null;
  statement: string;
  working: boolean;
}) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeading}>
        <span>Problem</span>
        <strong>Where does reality miss the goal?</strong>
      </div>
      {!proposal ? (
        <button className={styles.primary} disabled={working} onClick={onPropose} type="button">
          {working ? "Looking at the gap…" : "Recognize the gap"}
        </button>
      ) : (
        <div className={styles.stack}>
          <label>Problem<textarea className={styles.textarea} onChange={(event) => onStatementChange(event.target.value)} rows={3} value={statement} /></label>
          <label>Gap<textarea className={styles.textarea} onChange={(event) => onGapChange(event.target.value)} rows={3} value={gap} /></label>
          <button className={styles.primary} disabled={working || statement.trim().length < 3} onClick={onConfirm} type="button">
            {working ? "Saving…" : "This is the problem"}
          </button>
        </div>
      )}
    </section>
  );
}

function ProblemSummary({ problem }: { problem: ClientPeopleState["problems"][number] }) {
  return (
    <section className={styles.summaryCard}>
      <div className={styles.summaryLabel}>Problem</div>
      <strong>{problem.statement}</strong>
      {problem.gap ? <p className={styles.statement}>{problem.gap}</p> : null}
    </section>
  );
}

function ReflectionCapture({
  draft,
  onChange,
  onSave,
  onStepChange,
  step,
  working,
}: {
  draft: ReflectionDraft;
  onChange: (draft: ReflectionDraft) => void;
  onSave: () => void;
  onStepChange: (step: ReflectionStep) => void;
  step: ReflectionStep;
  working: boolean;
}) {
  if (step === "recurring") {
    return (
      <section className={styles.card}>
        <div className={styles.cardHeading}><span>Reflect</span><strong>Is this recurring?</strong></div>
        <div className={styles.choiceRow}>
          <button className={styles.secondary} onClick={() => { onChange({ ...draft, recurring: true }); onStepChange("recurrenceNote"); }} type="button">Yes</button>
          <button className={styles.secondary} onClick={() => { onChange({ ...draft, recurring: false, recurrenceNote: "" }); onStepChange("learning"); }} type="button">No</button>
        </div>
      </section>
    );
  }

  const value = draft[step];
  const next: Partial<Record<ReflectionStep, ReflectionStep>> = {
    expected: "surprise",
    happened: "expected",
    recurrenceNote: "learning",
    surprise: "recurring",
  };
  const final = step === "learning";
  return (
    <section className={styles.card}>
      <div className={styles.cardHeading}><span>Reflect</span><strong>{reflectionQuestions[step]}</strong></div>
      <textarea
        aria-label="Reflection answer"
        className={styles.textarea}
        onChange={(event) => onChange({ ...draft, [step]: event.target.value })}
        rows={5}
        value={String(value)}
      />
      <button
        className={styles.primary}
        disabled={working || String(value).trim().length < 2}
        onClick={final ? onSave : () => onStepChange(next[step] ?? "learning")}
        type="button"
      >
        {working ? "Saving…" : final ? "Complete reflection" : "Continue"}
      </button>
    </section>
  );
}

function ReflectionSummary({ reflection }: { reflection: ClientPeopleState["reflections"][number] }) {
  return (
    <section className={styles.summaryCard}>
      <div className={styles.summaryLabel}>Reflection</div>
      <strong>{reflection.learning}</strong>
      <details>
        <summary>Case</summary>
        <dl className={styles.details}>
          <div><dt>Happened</dt><dd>{reflection.happened}</dd></div>
          {reflection.expected ? <div><dt>Expected</dt><dd>{reflection.expected}</dd></div> : null}
          {reflection.surprise ? <div><dt>Surprise</dt><dd>{reflection.surprise}</dd></div> : null}
          <div><dt>Recurring</dt><dd>{reflection.recurring ? "Yes" : "No"}</dd></div>
          {reflection.recurrenceNote ? <div><dt>Pattern</dt><dd>{reflection.recurrenceNote}</dd></div> : null}
        </dl>
      </details>
    </section>
  );
}

function PrincipleCandidate({
  candidate,
  editing,
  onEdit,
  onReview,
  onTryAnother,
  working,
}: {
  candidate: ClientPrincipleRecord;
  editing: ClientPrincipleRecord | null;
  onEdit: (candidate: ClientPrincipleRecord | null) => void;
  onReview: (action: "accept" | "reject" | "revise") => void;
  onTryAnother?: () => void;
  working: boolean;
}) {
  const value = editing ?? candidate;
  const accepted = candidate.acceptanceState === "accepted";
  return (
    <section className={styles.principleCard}>
      <div className={styles.cardHeading}>
        <span>Principle candidate</span>
        <strong>{accepted ? "Testing" : candidate.acceptanceState}</strong>
      </div>
      {editing ? (
        <div className={styles.stack}>
          <label>When<textarea className={styles.textarea} onChange={(event) => onEdit({ ...value, trigger: event.target.value })} rows={3} value={value.trigger} /></label>
          <label>Then<textarea className={styles.textarea} onChange={(event) => onEdit({ ...value, rule: event.target.value })} rows={3} value={value.rule} /></label>
          <label>Because<textarea className={styles.textarea} onChange={(event) => onEdit({ ...value, rationale: event.target.value })} rows={3} value={value.rationale ?? ""} /></label>
          <div className={styles.choiceRow}>
            <button className={styles.primary} disabled={working || !value.trigger.trim() || !value.rule.trim()} onClick={() => onReview("revise")} type="button">Save revision</button>
            <button className={styles.secondary} onClick={() => onEdit(null)} type="button">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <p className={styles.trigger}>When {candidate.trigger}</p>
          <p className={styles.rule}>{candidate.rule}</p>
          {candidate.rationale ? <p className={styles.statement}>{candidate.rationale}</p> : null}
          {candidate.confidence !== null ? <span className={styles.meta}>AI confidence {Math.round(candidate.confidence * 100)}%</span> : null}
          {!accepted && candidate.acceptanceState !== "rejected" ? (
            <div className={styles.choiceRow}>
              <button className={styles.primary} disabled={working} onClick={() => onReview("accept")} type="button">Test this principle</button>
              <button className={styles.secondary} disabled={working} onClick={() => onEdit(candidate)} type="button">Revise</button>
              <button className={styles.secondary} disabled={working} onClick={() => onReview("reject")} type="button">Reject</button>
            </div>
          ) : null}
          {candidate.acceptanceState === "rejected" && onTryAnother ? (
            <button className={styles.secondary} disabled={working} onClick={onTryAnother} type="button">Try another candidate</button>
          ) : null}
        </>
      )}
    </section>
  );
}
