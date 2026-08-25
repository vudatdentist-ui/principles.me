"use client";

import { useState } from "react";
import type {
  ClientLearningPattern,
  ClientLearningState,
  LearningPatternDraft,
  LearningPatternProposal,
  PrincipleRevisionProposal,
} from "./contracts";
import styles from "./learning-workspace.module.css";

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

function proposalDraft(proposal: LearningPatternProposal): LearningPatternDraft {
  return {
    confidence: proposal.confidence,
    contradictingEvidence: proposal.contradictingEvidence,
    implication: proposal.implication,
    kind: proposal.kind,
    statement: proposal.statement,
    supportingEvidence: proposal.supportingEvidence,
    uncertainty: proposal.uncertainty,
  };
}

type RevisionDraft = {
  patternId: string;
  principleId: string;
  rationale: string;
  rule: string;
  trigger: string;
};

function revisionDraft(
  patternId: string,
  proposal: PrincipleRevisionProposal
): RevisionDraft {
  return {
    patternId,
    principleId: proposal.principleId,
    rationale: proposal.proposedRationale,
    rule: proposal.proposedRule,
    trigger: proposal.proposedTrigger,
  };
}

export function LearningWorkspace({
  email,
  initialState,
  workspaceName,
}: {
  email: string;
  initialState: ClientLearningState;
  workspaceName: string;
}) {
  const [state, setState] = useState(initialState);
  const [proposal, setProposal] = useState<LearningPatternProposal | null>(null);
  const [draft, setDraft] = useState<LearningPatternDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [revision, setRevision] = useState<RevisionDraft | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/";
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

  async function findPattern() {
    await run("proposal", async () => {
      const result = await jsonRequest<LearningPatternProposal>(
        "/api/learning/patterns/propose",
        { body: "{}", method: "POST" }
      );
      setProposal(result);
      setDraft(proposalDraft(result));
      setEditing(false);
    });
  }

  async function keepPattern() {
    if (!draft) {
      return;
    }
    await run("save", async () => {
      const result = await jsonRequest<ClientLearningState>(
        "/api/learning/patterns",
        { body: JSON.stringify(draft), method: "POST" }
      );
      setState(result);
      setProposal(null);
      setDraft(null);
      setEditing(false);
    });
  }

  async function rejectProposal() {
    await run("reject", async () => {
      await jsonRequest<{ ok: true }>("/api/learning/patterns/reject", {
        body: "{}",
        method: "POST",
      });
      setProposal(null);
      setDraft(null);
      setEditing(false);
    });
  }

  async function applyRevision() {
    if (!revision) {
      return;
    }
    await run("revision", async () => {
      const result = await jsonRequest<ClientLearningState>(
        "/api/learning/principles/revise",
        { body: JSON.stringify(revision), method: "POST" }
      );
      setState(result);
      setRevision(null);
    });
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/">Principles</a>
        <nav className={styles.nav} aria-label="Primary">
          <a href="/">People</a>
          <a href="/knowledge">Knowledge</a>
          <a aria-current="page" href="/learning">Learning</a>
        </nav>
        <div className={styles.account}>
          <span>{workspaceName}</span>
          <span>{email}</span>
          <button onClick={() => void signOut()} type="button">Sign out</button>
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Learning</p>
          <h1>What is your history teaching you?</h1>
        </div>

        {error ? <div className={styles.error} role="alert">{error}</div> : null}

        {state.historyCount < 2 && state.patterns.length === 0 ? (
          <section className={styles.card}>
            <strong>Not enough history yet.</strong>
          </section>
        ) : null}

        {state.historyCount >= 2 && !proposal ? (
          <section className={styles.actionBar}>
            <button
              className={styles.primary}
              disabled={working === "proposal"}
              onClick={() => void findPattern()}
              type="button"
            >
              {working === "proposal" ? "Thinking…" : "Find a pattern"}
            </button>
          </section>
        ) : null}

        {proposal && draft ? (
          <PatternProposalCard
            draft={draft}
            editing={editing}
            onChange={setDraft}
            onEdit={setEditing}
            onKeep={() => void keepPattern()}
            onReject={() => void rejectProposal()}
            onTryAnother={() => void findPattern()}
            proposal={proposal}
            working={working !== null}
          />
        ) : null}

        {state.patterns.length > 0 ? (
          <section className={styles.patterns} aria-label="Self Model patterns">
            {state.patterns.map((pattern) => (
              <PatternCard
                key={pattern.id}
                onApplyRevision={() => void applyRevision()}
                onBeginRevision={(value) => setRevision(value)}
                onCancelRevision={() => setRevision(null)}
                onRevisionChange={setRevision}
                pattern={pattern}
                revision={revision?.patternId === pattern.id ? revision : null}
                working={working === "revision"}
              />
            ))}
          </section>
        ) : null}
      </section>
    </main>
  );
}

function PatternProposalCard({
  draft,
  editing,
  onChange,
  onEdit,
  onKeep,
  onReject,
  onTryAnother,
  proposal,
  working,
}: {
  draft: LearningPatternDraft;
  editing: boolean;
  onChange: (value: LearningPatternDraft) => void;
  onEdit: (value: boolean) => void;
  onKeep: () => void;
  onReject: () => void;
  onTryAnother: () => void;
  proposal: LearningPatternProposal;
  working: boolean;
}) {
  if (editing) {
    return (
      <section className={styles.card}>
        <div className={styles.cardHeading}>
          <span>Pattern hypothesis</span>
          <strong>Correct the model.</strong>
        </div>
        <div className={styles.stack}>
          <label>
            Pattern
            <textarea
              aria-label="Pattern statement"
              className={styles.textarea}
              onChange={(event) => onChange({ ...draft, statement: event.target.value })}
              rows={4}
              value={draft.statement}
            />
          </label>
          <label>
            Implication
            <textarea
              aria-label="Pattern implication"
              className={styles.textarea}
              onChange={(event) => onChange({ ...draft, implication: event.target.value })}
              rows={3}
              value={draft.implication}
            />
          </label>
          <label>
            Evidence for
            <textarea
              className={styles.textarea}
              onChange={(event) =>
                onChange({ ...draft, supportingEvidence: event.target.value })
              }
              rows={3}
              value={draft.supportingEvidence}
            />
          </label>
          <label>
            Evidence against
            <textarea
              className={styles.textarea}
              onChange={(event) =>
                onChange({ ...draft, contradictingEvidence: event.target.value })
              }
              rows={3}
              value={draft.contradictingEvidence}
            />
          </label>
          <label>
            Uncertainty
            <textarea
              className={styles.textarea}
              onChange={(event) => onChange({ ...draft, uncertainty: event.target.value })}
              rows={3}
              value={draft.uncertainty}
            />
          </label>
        </div>
        <div className={styles.buttonRow}>
          <button className={styles.primary} disabled={working} onClick={onKeep} type="button">
            Save corrected pattern
          </button>
          <button className={styles.secondary} onClick={() => onEdit(false)} type="button">
            Cancel edit
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHeading}>
        <span>Pattern hypothesis</span>
        <strong className={styles.patternStatement}>{draft.statement}</strong>
      </div>
      <p className={styles.implication}>{draft.implication}</p>
      <PatternEvidence
        cases={proposal.cases}
        confidence={draft.confidence}
        contradictingEvidence={draft.contradictingEvidence}
        supportingEvidence={draft.supportingEvidence}
        uncertainty={draft.uncertainty}
      />
      <div className={styles.buttonRow}>
        <button className={styles.primary} disabled={working} onClick={onKeep} type="button">
          Keep this pattern
        </button>
        <button className={styles.secondary} disabled={working} onClick={() => onEdit(true)} type="button">
          Edit
        </button>
        <button className={styles.secondary} disabled={working} onClick={onReject} type="button">
          Reject
        </button>
        <button className={styles.secondary} disabled={working} onClick={onTryAnother} type="button">
          Try another
        </button>
      </div>
    </section>
  );
}

function PatternEvidence({
  cases,
  confidence,
  contradictingEvidence,
  supportingEvidence,
  uncertainty,
}: {
  cases: LearningPatternProposal["cases"];
  confidence: number | null;
  contradictingEvidence: string;
  supportingEvidence: string;
  uncertainty: string;
}) {
  return (
    <details className={styles.detailsBlock}>
      <summary>Inspect the evidence</summary>
      <dl className={styles.details}>
        <div><dt>For</dt><dd>{supportingEvidence}</dd></div>
        <div><dt>Against</dt><dd>{contradictingEvidence}</dd></div>
        <div><dt>Uncertainty</dt><dd>{uncertainty}</dd></div>
        {confidence !== null ? (
          <div><dt>Confidence</dt><dd>{Math.round(confidence * 100)}%</dd></div>
        ) : null}
      </dl>
      <div className={styles.caseList}>
        {cases.map((item, index) => (
          <article className={styles.case} key={item.reflectionId}>
            <span>Case {index + 1} · {item.phase === "outcome_review" ? "Outcome review" : "Reflection"}</span>
            <strong>{item.problem}</strong>
            <p>{item.happened}</p>
            {item.outcome ? (
              <p>Outcome · {item.outcome.comparison}: {item.outcome.actualResult}</p>
            ) : null}
          </article>
        ))}
      </div>
    </details>
  );
}

function PatternCard({
  onApplyRevision,
  onBeginRevision,
  onCancelRevision,
  onRevisionChange,
  pattern,
  revision,
  working,
}: {
  onApplyRevision: () => void;
  onBeginRevision: (value: RevisionDraft) => void;
  onCancelRevision: () => void;
  onRevisionChange: (value: RevisionDraft) => void;
  pattern: ClientLearningPattern;
  revision: RevisionDraft | null;
  working: boolean;
}) {
  const proposal = pattern.principleRevisionProposal;
  return (
    <article className={styles.patternCard}>
      <div className={styles.cardHeading}>
        <span>{pattern.lifecycleState === "applied" ? "Applied learning" : "Self Model"}</span>
        <strong>{pattern.statement}</strong>
      </div>
      <p className={styles.implication}>{pattern.implication}</p>
      <PatternEvidence
        cases={pattern.cases}
        confidence={pattern.confidence}
        contradictingEvidence={pattern.contradictingEvidence ?? "No counter-evidence recorded."}
        supportingEvidence={pattern.supportingEvidence ?? "No supporting summary recorded."}
        uncertainty={pattern.uncertainty ?? "Uncertainty not recorded."}
      />

      {pattern.appliedRevision ? (
        <div className={styles.revisionSummary}>
          <span>Principle revised · testing</span>
          <strong>{pattern.appliedRevision.revisedRule}</strong>
        </div>
      ) : null}

      {pattern.lifecycleState === "active" && proposal && !revision ? (
        <button
          className={styles.primary}
          onClick={() => onBeginRevision(revisionDraft(pattern.id, proposal))}
          type="button"
        >
          Revise this principle
        </button>
      ) : null}

      {revision ? (
        <div className={styles.revisionEditor}>
          <div className={styles.cardHeading}>
            <span>Principle revision</span>
            <strong>Test a better rule.</strong>
          </div>
          <div className={styles.stack}>
            <label>
              Trigger
              <textarea
                aria-label="Revised principle trigger"
                className={styles.textarea}
                onChange={(event) =>
                  onRevisionChange({ ...revision, trigger: event.target.value })
                }
                rows={3}
                value={revision.trigger}
              />
            </label>
            <label>
              Rule
              <textarea
                aria-label="Revised principle rule"
                className={styles.textarea}
                onChange={(event) =>
                  onRevisionChange({ ...revision, rule: event.target.value })
                }
                rows={4}
                value={revision.rule}
              />
            </label>
            <label>
              Rationale
              <textarea
                aria-label="Revised principle rationale"
                className={styles.textarea}
                onChange={(event) =>
                  onRevisionChange({ ...revision, rationale: event.target.value })
                }
                rows={3}
                value={revision.rationale}
              />
            </label>
          </div>
          <div className={styles.buttonRow}>
            <button
              className={styles.primary}
              disabled={
                working ||
                revision.trigger.trim().length < 3 ||
                revision.rule.trim().length < 3 ||
                revision.rationale.trim().length < 3
              }
              onClick={onApplyRevision}
              type="button"
            >
              {working ? "Saving…" : "Revise and test"}
            </button>
            <button className={styles.secondary} onClick={onCancelRevision} type="button">
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
