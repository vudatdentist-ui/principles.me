"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { ClientOrganizationState } from "./contracts";
import type {
  ClientOrganizationEvolutionProblem,
  ClientOrganizationEvolutionState,
} from "./evolution-contracts";
import styles from "./organization-workspace.module.css";

async function jsonRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }
  if (!payload) {
    throw new Error("Request failed.");
  }
  return payload;
}

function field(form: HTMLFormElement, name: string): string {
  return String(new FormData(form).get(name) ?? "").trim();
}

function lines(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

export function OrganizationEvolution({
  email,
  organizations,
}: {
  email: string;
  organizations: ClientOrganizationState;
}) {
  const preferredHandle =
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("organization") ?? "";
  const firstHandle =
    organizations.organizations.find((item) => item.handle === preferredHandle)?.handle ??
    organizations.organizations[0]?.handle ??
    "";
  const [activeHandle, setActiveHandle] = useState(firstHandle);
  const [state, setState] = useState<ClientOrganizationEvolutionState | null>(null);
  const [activeGoalId, setActiveGoalId] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeHandle) {
      setState(null);
      return;
    }
    let cancelled = false;
    setError(null);
    void jsonRequest<ClientOrganizationEvolutionState>(
      `/api/organization/evolution?organization=${encodeURIComponent(activeHandle)}`
    )
      .then((next) => {
        if (!cancelled) {
          setState(next);
          setActiveGoalId((current) =>
            next.goals.some((goal) => goal.id === current) ? current : next.goals[0]?.id ?? ""
          );
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Request failed.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeHandle]);

  const activeGoal = useMemo(
    () => state?.goals.find((goal) => goal.id === activeGoalId) ?? state?.goals[0] ?? null,
    [activeGoalId, state]
  );

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/";
  }

  async function mutate(label: string, body: Record<string, unknown>) {
    if (!activeHandle || working) {
      return;
    }
    setWorking(label);
    setError(null);
    try {
      const next = await jsonRequest<ClientOrganizationEvolutionState>(
        "/api/organization/evolution",
        {
          body: JSON.stringify({ ...body, organizationHandle: activeHandle }),
          method: "POST",
        }
      );
      setState(next);
      setActiveGoalId((current) =>
        next.goals.some((goal) => goal.id === current) ? current : next.goals[0]?.id ?? ""
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
    } finally {
      setWorking(null);
    }
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
    label: string,
    body: (form: HTMLFormElement) => Record<string, unknown>
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    await mutate(label, body(form));
    if (!error) {
      form.reset();
    }
  }

  const owner = state?.membershipRole === "owner";

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/">Principles</a>
        <nav className={styles.nav} aria-label="Primary">
          <a href="/">People</a>
          <a href="/knowledge">Knowledge</a>
          <a href="/learning">Learning</a>
          <a aria-current="page" href="/organization">Organization</a>
        </nav>
        <div className={styles.account}>
          <span>{email}</span>
          <button onClick={() => void signOut()} type="button">Sign out</button>
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Organization · Evolve</p>
          <h1>Change the machine. Observe the result.</h1>
        </div>

        <section className={styles.organizationBar}>
          <div className={styles.switcher}>
            {organizations.organizations.map((organization) => (
              <button
                aria-pressed={activeHandle === organization.handle}
                className={activeHandle === organization.handle ? styles.activeSwitch : undefined}
                key={organization.handle}
                onClick={() => setActiveHandle(organization.handle)}
                type="button"
              >
                {organization.name}
              </button>
            ))}
          </div>
          <a href="/organization">Machine &amp; reality</a>
        </section>

        {error ? <div className={styles.error} role="alert">{error}</div> : null}

        {!activeHandle ? (
          <section className={styles.identity}>
            <h2>Create an organization first.</h2>
            <a href="/organization">Create organization</a>
          </section>
        ) : null}

        {state ? (
          <>
            <section className={styles.identity}>
              <div>
                <p className={styles.eyebrow}>{owner ? "Owner" : "Member"}</p>
                <h2>{state.name}</h2>
              </div>
              <span>{state.members.length} people</span>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}>Goal</p>
                <h2>Choose the desired reality.</h2>
              </div>
              {state.goals.length > 0 ? (
                <div className={styles.switcher}>
                  {state.goals.map((goal) => (
                    <button
                      aria-pressed={activeGoal?.id === goal.id}
                      className={activeGoal?.id === goal.id ? styles.activeSwitch : undefined}
                      key={goal.id}
                      onClick={() => setActiveGoalId(goal.id)}
                      type="button"
                    >
                      {goal.desiredState}
                    </button>
                  ))}
                </div>
              ) : null}
              {owner ? (
                <details className={styles.disclosure} open={state.goals.length === 0}>
                  <summary>New shared goal</summary>
                  <form
                    className={styles.form}
                    onSubmit={(event) =>
                      void submit(event, "goal", (form) => ({
                        acceptedTradeoffs: field(form, "acceptedTradeoffs"),
                        action: "createGoal",
                        desiredState: field(form, "desiredState"),
                        measures: field(form, "measures"),
                        nonNegotiables: field(form, "nonNegotiables"),
                        successConditions: field(form, "successConditions"),
                        whyItMatters: field(form, "whyItMatters"),
                      }))
                    }
                  >
                    <label>Desired reality<textarea name="desiredState" required rows={3} /></label>
                    <label>Why it matters<textarea name="whyItMatters" required rows={2} /></label>
                    <label>Success conditions<textarea name="successConditions" required rows={2} /></label>
                    <label>Accepted trade-offs<textarea name="acceptedTradeoffs" rows={2} /></label>
                    <label>Non-negotiables<textarea name="nonNegotiables" rows={2} /></label>
                    <label>Measures<textarea name="measures" rows={2} /></label>
                    <button className={styles.primary} disabled={working !== null} type="submit">Choose goal</button>
                  </form>
                </details>
              ) : null}
              {activeGoal ? (
                <article className={styles.card}>
                  <h3>{activeGoal.desiredState}</h3>
                  {activeGoal.whyItMatters ? <p>{activeGoal.whyItMatters}</p> : null}
                  {activeGoal.successConditions ? <p><b>Success:</b> {activeGoal.successConditions}</p> : null}
                </article>
              ) : null}
            </section>

            {activeGoal ? (
              <section className={styles.section}>
                <div className={styles.sectionHeading}>
                  <p className={styles.eyebrow}>Reality → Problem</p>
                  <h2>Surface the gap against the Goal.</h2>
                </div>
                <details className={styles.disclosure} open={activeGoal.problems.length === 0}>
                  <summary>Record observed problem</summary>
                  <form
                    className={styles.form}
                    onSubmit={(event) =>
                      void submit(event, "problem", (form) => ({
                        action: "recordIssue",
                        goalId: activeGoal.id,
                        observedReality: field(form, "observedReality"),
                        tension: field(form, "tension"),
                        title: field(form, "title"),
                      }))
                    }
                  >
                    <label>Problem<input name="title" required /></label>
                    <label>Observed reality<textarea name="observedReality" required rows={3} /></label>
                    <label>Gap from the Goal<textarea name="tension" required rows={3} /></label>
                    <button className={styles.primary} disabled={working !== null} type="submit">Record problem</button>
                  </form>
                </details>

                <div className={styles.stack}>
                  {activeGoal.problems.map((problem) => (
                    <ProblemLoop
                      email={email}
                      key={problem.id}
                      members={state.members.map((member) => member.email)}
                      mutate={mutate}
                      owner={owner}
                      principles={state.principles}
                      problem={problem}
                      working={working}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}>Relevant experience</p>
                <h2>Inspect context before assigning judgment.</h2>
              </div>
              <div className={styles.stack}>
                {state.contextEvidence.map((item, index) => (
                  <article className={styles.contextItem} key={`${item.subjectEmail}-${item.context}-${index}`}>
                    <div className={styles.cardHeading}>
                      <h3>{item.subjectEmail}</h3>
                      <span>{item.context}</span>
                    </div>
                    <p>{item.observation}</p>
                    {item.evidenceFor ? <p><b>For:</b> {item.evidenceFor}</p> : null}
                    {item.evidenceAgainst ? <p><b>Against:</b> {item.evidenceAgainst}</p> : null}
                    <p className={styles.meta}>Recorded by {item.createdByEmail}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}>Principles</p>
                <h2>Rules earned from outcomes.</h2>
              </div>
              <div className={styles.stack}>
                {state.principles.map((principle) => (
                  <article className={styles.card} key={principle.id}>
                    <div className={styles.cardHeading}>
                      <h3>{principle.trigger}</h3>
                      <span>{principle.lifecycleState}</span>
                    </div>
                    <p>{principle.rule}</p>
                    {principle.rationale ? <p>{principle.rationale}</p> : null}
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}

function ProblemLoop({
  email,
  members,
  mutate,
  owner,
  principles,
  problem,
  working,
}: {
  email: string;
  members: string[];
  mutate: (label: string, body: Record<string, unknown>) => Promise<void>;
  owner: boolean;
  principles: ClientOrganizationEvolutionState["principles"];
  problem: ClientOrganizationEvolutionProblem;
  working: string | null;
}) {
  const design = problem.design;
  const executor = Boolean(design && (owner || design.ownerEmail === email));
  const noPendingActions = Boolean(design && design.actions.every((action) => action.status !== "pending"));

  return (
    <article className={styles.issue}>
      <div className={styles.cardHeading}>
        <h3>{problem.statement}</h3>
        <span>{problem.status}</span>
      </div>
      <p>{problem.observedReality}</p>
      {problem.gap ? <p><b>Gap:</b> {problem.gap}</p> : null}
      <p className={styles.meta}>Raised by {problem.createdByEmail}</p>
      {problem.disagreements.map((item, index) => (
        <div className={styles.item} key={`${item.raisedByEmail}-${index}`}>
          <strong>{item.raisedByEmail}</strong>
          <p>{item.statement}</p>
          {item.reasoning ? <p>{item.reasoning}</p> : null}
        </div>
      ))}

      {!problem.diagnosis && owner ? (
        <details className={styles.disclosure} open>
          <summary>Diagnose root cause</summary>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              void mutate(`diagnosis-${problem.id}`, {
                action: "diagnose",
                alternativeHypotheses: field(form, "alternativeHypotheses"),
                contradictingEvidence: field(form, "contradictingEvidence"),
                problemId: problem.id,
                proximateCause: field(form, "proximateCause"),
                rootCauseHypothesis: field(form, "rootCauseHypothesis"),
                supportingEvidence: field(form, "supportingEvidence"),
                symptom: field(form, "symptom"),
                uncertainty: field(form, "uncertainty"),
              }).then(() => form.reset());
            }}
          >
            <label>Symptom<textarea name="symptom" required rows={2} /></label>
            <label>Proximate cause<textarea name="proximateCause" rows={2} /></label>
            <label>Root-cause hypothesis<textarea name="rootCauseHypothesis" required rows={3} /></label>
            <label>Evidence for<textarea name="supportingEvidence" rows={2} /></label>
            <label>Evidence against<textarea name="contradictingEvidence" rows={2} /></label>
            <label>Alternatives<textarea name="alternativeHypotheses" rows={2} /></label>
            <label>Uncertainty<textarea name="uncertainty" rows={2} /></label>
            <button className={styles.primary} disabled={working !== null} type="submit">Accept diagnosis</button>
          </form>
        </details>
      ) : null}

      {problem.diagnosis ? (
        <div className={styles.item}>
          <p className={styles.eyebrow}>Diagnosis</p>
          <strong>{problem.diagnosis.rootCauseHypothesis}</strong>
          {problem.diagnosis.uncertainty ? <p><b>Uncertainty:</b> {problem.diagnosis.uncertainty}</p> : null}
        </div>
      ) : null}

      {problem.diagnosis && !design && owner ? (
        <details className={styles.disclosure} open>
          <summary>Design the machine change</summary>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              void mutate(`design-${problem.id}`, {
                action: "design",
                actions: lines(field(form, "actions")),
                assignedToEmail: field(form, "assignedToEmail"),
                diagnosisId: problem.diagnosis?.id,
                expectedResult: field(form, "expectedResult"),
                machineChange: field(form, "machineChange"),
                problemId: problem.id,
                rationale: field(form, "rationale"),
                successSignal: field(form, "successSignal"),
              }).then(() => form.reset());
            }}
          >
            <label>Machine change<textarea name="machineChange" required rows={3} /></label>
            <label>Why this addresses the root cause<textarea name="rationale" required rows={3} /></label>
            <label>Expected result<textarea name="expectedResult" required rows={2} /></label>
            <label>Success signal<textarea name="successSignal" required rows={2} /></label>
            <label>Owner<select name="assignedToEmail" required defaultValue=""><option value="" disabled>Select</option>{members.map((member) => <option key={member} value={member}>{member}</option>)}</select></label>
            <label>Actions · one per line<textarea name="actions" required rows={4} /></label>
            <button className={styles.primary} disabled={working !== null} type="submit">Commit design</button>
          </form>
        </details>
      ) : null}

      {design ? (
        <div className={styles.item}>
          <p className={styles.eyebrow}>Design · {design.ownerEmail}</p>
          <strong>{design.machineChange}</strong>
          <p>{design.rationale}</p>
          <p><b>Expected:</b> {design.expectedResult}</p>
          <ul className={styles.compactList}>
            {design.actions.map((action) => (
              <li key={action.id}>
                {action.commitment} · {action.status}
                {executor && action.status === "pending" ? (
                  <span>
                    {" "}
                    <button
                      disabled={working !== null}
                      onClick={() =>
                        void mutate(`action-${action.id}`, {
                          action: "setActionStatus",
                          actionId: action.id,
                          designId: design.id,
                          status: "completed",
                        })
                      }
                      type="button"
                    >
                      Done
                    </button>
                    {" "}
                    <button
                      disabled={working !== null}
                      onClick={() =>
                        void mutate(`cancel-${action.id}`, {
                          action: "setActionStatus",
                          actionId: action.id,
                          designId: design.id,
                          status: "cancelled",
                        })
                      }
                      type="button"
                    >
                      Cancel
                    </button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {design && noPendingActions && !design.outcome && executor ? (
        <details className={styles.disclosure} open>
          <summary>Observe outcome</summary>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              void mutate(`outcome-${design.id}`, {
                action: "recordOutcome",
                actualResult: field(form, "actualResult"),
                comparison: field(form, "comparison"),
                designId: design.id,
              }).then(() => form.reset());
            }}
          >
            <label>What actually happened?<textarea name="actualResult" required rows={3} /></label>
            <label>Compared with expected<select name="comparison" required defaultValue=""><option value="" disabled>Select</option><option value="improved">Improved</option><option value="mixed">Mixed</option><option value="worse">Worse</option><option value="unclear">Unclear</option></select></label>
            <button className={styles.primary} disabled={working !== null} type="submit">Record outcome</button>
          </form>
        </details>
      ) : null}

      {design?.outcome ? (
        <div className={styles.item}>
          <p className={styles.eyebrow}>Outcome · {design.outcome.comparison}</p>
          <p>{design.outcome.actualResult}</p>
        </div>
      ) : null}

      {design?.outcome && !design.reflection && executor ? (
        <details className={styles.disclosure} open>
          <summary>Reflect</summary>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              void mutate(`reflection-${design.id}`, {
                action: "reflect",
                designId: design.id,
                expected: field(form, "expected"),
                happened: field(form, "happened"),
                learning: field(form, "learning"),
                recurring: field(form, "recurring") === "yes",
                surprise: field(form, "surprise"),
              }).then(() => form.reset());
            }}
          >
            <label>What happened?<textarea name="happened" required rows={2} /></label>
            <label>What did you expect?<textarea name="expected" rows={2} /></label>
            <label>What surprised you?<textarea name="surprise" rows={2} /></label>
            <label>What did the team learn?<textarea name="learning" required rows={3} /></label>
            <label>Recurring?<select name="recurring" defaultValue="no"><option value="no">No</option><option value="yes">Yes</option></select></label>
            <button className={styles.primary} disabled={working !== null} type="submit">Complete reflection</button>
          </form>
        </details>
      ) : null}

      {design?.reflection ? (
        <div className={styles.item}>
          <p className={styles.eyebrow}>Reflection</p>
          <p>{design.reflection.learning}</p>
        </div>
      ) : null}

      {design?.reflection && owner && problem.status !== "resolved" ? (
        <details className={styles.disclosure} open>
          <summary>Update an organizational Principle</summary>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              void mutate(`principle-${problem.id}`, {
                action: "savePrinciple",
                principleId: field(form, "principleId") || undefined,
                rationale: field(form, "rationale"),
                reflectionId: design.reflection?.id,
                rule: field(form, "rule"),
                trigger: field(form, "trigger"),
              }).then(() => form.reset());
            }}
          >
            {principles.length > 0 ? (
              <label>Revise existing<select name="principleId" defaultValue=""><option value="">Create new</option>{principles.map((principle) => <option key={principle.id} value={principle.id}>{principle.trigger}</option>)}</select></label>
            ) : null}
            <label>When this situation occurs<textarea name="trigger" required rows={2} /></label>
            <label>Rule<textarea name="rule" required rows={3} /></label>
            <label>Why<textarea name="rationale" rows={2} /></label>
            <button className={styles.primary} disabled={working !== null} type="submit">Save principle</button>
          </form>
        </details>
      ) : null}
    </article>
  );
}
