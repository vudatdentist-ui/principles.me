"use client";

import { T, useI18n } from "@/features/i18n/locale";
import { AutoTextarea } from "@/features/ui/auto-textarea";

import { jsonRequest } from "@/features/ui/json-request";

import { useState } from "react";
import type {
  ClientLearningPattern,
  ClientLearningState,
  LearningPatternDraft,
  LearningPatternProposal,
  PrincipleRevisionProposal,
} from "./contracts";
import styles from "./learning-workspace.module.css";


function proposalDraft(
  proposal: LearningPatternProposal,
): LearningPatternDraft {
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
  proposal: PrincipleRevisionProposal,
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
  initialState,
  onStateChange,
}: {
  initialState: ClientLearningState;
  onStateChange?: (state: ClientLearningState) => void;
}) {
  const { t } = useI18n();
  const [state, setState] = useState(initialState);
  const [proposal, setProposal] = useState<LearningPatternProposal | null>(
    null,
  );
  const [draft, setDraft] = useState<LearningPatternDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [revision, setRevision] = useState<RevisionDraft | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);


  async function run(label: string, action: () => Promise<void>) {
    if (working) {
      return;
    }
    setWorking(label);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("Request failed."));
    } finally {
      setWorking(null);
    }
  }

  async function findPattern() {
    await run("proposal", async () => {
      const result = await jsonRequest<LearningPatternProposal>(
        "/api/learning/patterns/propose",
        { body: "{}", method: "POST" },
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
        { body: JSON.stringify(draft), method: "POST" },
      );
      setState(result);
      onStateChange?.(result);
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
        { body: JSON.stringify(revision), method: "POST" },
      );
      setState(result);
      onStateChange?.(result);
      setRevision(null);
    });
  }

  return (
    <div className={styles.shell}>

      <section className={styles.content}>

        {error ? (
          <div className={styles.error} role="alert">
            {t(error)}
          </div>
        ) : null}

        {state.historyCount < 2 && state.patterns.length === 0 ? (
          <section className={styles.card}>
            <strong><T>Not enough history yet.</T></strong>
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
              {working === "proposal" ? t("Thinking…") : t("Find a pattern")}
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
          <section className={styles.patterns} aria-label={t("Self Model patterns")}>
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
    </div>
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
  const { t } = useI18n();
  if (editing) {
    return (
      <section className={styles.card}>
        <div className={styles.cardHeading}>
          <span><T>Pattern hypothesis</T></span>
          <strong><T>Correct the model.</T></strong>
        </div>
        <div className={styles.stack}>
          <label>
            <T>Pattern</T>
            <AutoTextarea
              aria-label={t("Pattern statement")}
              className={styles.textarea}
              onChange={(event) =>
                onChange({ ...draft, statement: event.target.value })
              }
              rows={4}
              value={draft.statement}
            />
          </label>
          <label>
            <T>Implication</T>
            <AutoTextarea
              aria-label={t("Pattern implication")}
              className={styles.textarea}
              onChange={(event) =>
                onChange({ ...draft, implication: event.target.value })
              }
              rows={3}
              value={draft.implication}
            />
          </label>
          <label>
            <T>Evidence for</T>
            <AutoTextarea
              className={styles.textarea}
              onChange={(event) =>
                onChange({ ...draft, supportingEvidence: event.target.value })
              }
              rows={3}
              value={draft.supportingEvidence}
            />
          </label>
          <label>
            <T>Evidence against</T>
            <AutoTextarea
              className={styles.textarea}
              onChange={(event) =>
                onChange({
                  ...draft,
                  contradictingEvidence: event.target.value,
                })
              }
              rows={3}
              value={draft.contradictingEvidence}
            />
          </label>
          <label>
            <T>Uncertainty</T>
            <AutoTextarea
              className={styles.textarea}
              onChange={(event) =>
                onChange({ ...draft, uncertainty: event.target.value })
              }
              rows={3}
              value={draft.uncertainty}
            />
          </label>
        </div>
        <div className={styles.buttonRow}>
          <button
            className={styles.primary}
            disabled={working}
            onClick={onKeep}
            type="button"
          >
            <T>Save corrected pattern</T>
          </button>
          <button
            className={styles.secondary}
            onClick={() => onEdit(false)}
            type="button"
          >
            <T>Cancel edit</T>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHeading}>
        <span><T>Pattern hypothesis</T></span>
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
        <button
          className={styles.primary}
          disabled={working}
          onClick={onKeep}
          type="button"
        >
          <T>Keep this pattern</T>
        </button>
        <button
          className={styles.secondary}
          disabled={working}
          onClick={() => onEdit(true)}
          type="button"
        >
          <T>Edit</T>
        </button>
        <button
          className={styles.secondary}
          disabled={working}
          onClick={onReject}
          type="button"
        >
          <T>Reject</T>
        </button>
        <button
          className={styles.secondary}
          disabled={working}
          onClick={onTryAnother}
          type="button"
        >
          <T>Try another</T>
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
  const { t } = useI18n();
  return (
    <details className={styles.detailsBlock}>
      <summary><T>Inspect the evidence</T></summary>
      <dl className={styles.details}>
        <div>
          <dt><T>For</T></dt>
          <dd>{supportingEvidence}</dd>
        </div>
        <div>
          <dt><T>Against</T></dt>
          <dd>{contradictingEvidence}</dd>
        </div>
        <div>
          <dt><T>Uncertainty</T></dt>
          <dd>{uncertainty}</dd>
        </div>
        {confidence !== null ? (
          <div>
            <dt><T>Confidence</T></dt>
            <dd>{Math.round(confidence * 100)}%</dd>
          </div>
        ) : null}
      </dl>
      <div className={styles.caseList}>
        {cases.map((item, index) => (
          <article className={styles.case} key={item.reflectionId}>
            <span>
              {t("Case {count} · {phase}", { count: index + 1, phase: t(item.phase === "outcome_review" ? "Outcome review" : "Reflection") })}
            </span>
            <strong>{item.problem}</strong>
            <p>{item.happened}</p>
            {item.outcome ? (
              <p>
                {t("Outcome · {comparison}", { comparison: t(item.outcome.comparison) })}: {item.outcome.actualResult}
              </p>
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
  const { t } = useI18n();
  const proposal = pattern.principleRevisionProposal;
  return (
    <article className={styles.patternCard}>
      <div className={styles.cardHeading}>
        <span>
          {pattern.lifecycleState === "applied"
            ? "Applied learning"
            : "Self Model"}
        </span>
        <strong>{pattern.statement}</strong>
      </div>
      <p className={styles.implication}>{pattern.implication}</p>
      <PatternEvidence
        cases={pattern.cases}
        confidence={pattern.confidence}
        contradictingEvidence={
          pattern.contradictingEvidence ?? t("No counter-evidence recorded.")
        }
        supportingEvidence={
          pattern.supportingEvidence ?? t("No supporting summary recorded.")
        }
        uncertainty={pattern.uncertainty ?? t("Uncertainty not recorded.")}
      />

      {pattern.appliedRevision ? (
        <div className={styles.revisionSummary}>
          <span><T>Revision applied · testing</T></span>
          <strong>{pattern.appliedRevision.revisedRule}</strong>
        </div>
      ) : null}

      {pattern.lifecycleState === "active" && proposal && !revision ? (
        <button
          className={styles.primary}
          onClick={() => onBeginRevision(revisionDraft(pattern.id, proposal))}
          type="button"
        >
          <T>Revise this principle</T>
        </button>
      ) : null}

      {revision ? (
        <div className={styles.revisionEditor}>
          <div className={styles.cardHeading}>
            <span><T>Principle revision</T></span>
            <strong><T>Test a better rule.</T></strong>
          </div>
          <div className={styles.stack}>
            <label>
              <T>Trigger</T>
              <AutoTextarea
                aria-label={t("Revised principle trigger")}
                className={styles.textarea}
                onChange={(event) =>
                  onRevisionChange({ ...revision, trigger: event.target.value })
                }
                rows={3}
                value={revision.trigger}
              />
            </label>
            <label>
              <T>Rule</T>
              <AutoTextarea
                aria-label={t("Revised principle rule")}
                className={styles.textarea}
                onChange={(event) =>
                  onRevisionChange({ ...revision, rule: event.target.value })
                }
                rows={4}
                value={revision.rule}
              />
            </label>
            <label>
              <T>Rationale</T>
              <AutoTextarea
                aria-label={t("Revised principle rationale")}
                className={styles.textarea}
                onChange={(event) =>
                  onRevisionChange({
                    ...revision,
                    rationale: event.target.value,
                  })
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
              {working ? t("Saving…") : t("Revise and test")}
            </button>
            <button
              className={styles.secondary}
              onClick={onCancelRevision}
              type="button"
            >
              <T>Cancel</T>
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
