"use client";

import { ArrowLeft, Check, Pencil, Sparkles, X } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import type {
  CouncilBrief,
  CouncilClaim,
  CouncilPlan,
  FactAssumption,
  RetrievedReference,
} from "@/lib/council/types";
import type { PrincipleCandidate } from "@/lib/judgment/types";
import { THINKERS } from "@/lib/principles-graph";
import councilStyles from "./council-v1.module.css";
import baseStyles from "./decision-workspace.module.css";
import styles from "./judgment-loop.module.css";
import { WorkspaceShell } from "./workspace-shell";

type DecisionStatus =
  | "draft"
  | "exploring"
  | "decided"
  | "review_due"
  | "reviewed"
  | "archived";

type DecisionRecord = {
  councilAnalysis: string | null;
  councilBrief: CouncilBrief | null;
  councilPlan: CouncilPlan | null;
  context: string | null;
  createdAt: string;
  evidence: unknown;
  id: string;
  principleCandidate: PrincipleCandidate | null;
  question: string;
  status: DecisionStatus;
  title: string;
  updatedAt: string;
};

type JudgmentRecord = {
  confidence: "low" | "medium" | "high" | null;
  confidencePercent: number | null;
  createdAt: string;
  id: string;
  rationale: string | null;
  selectedOption: string | null;
  summary: string;
};

type PrincipleRecord = {
  createdAt: string;
  description: string | null;
  id: string;
  relation: "suggested" | "applied" | "challenged" | "created" | "adopted";
  revision: number;
  statement: string;
  status: "active" | "revised" | "retired";
};

type OutcomeRecord = {
  createdAt: string;
  id: string;
  lessons: string | null;
  result: string;
  verdict: "positive" | "mixed" | "negative" | "too_early";
};

type DecisionDetailPayload = {
  decision: DecisionRecord;
  judgments: JudgmentRecord[];
  outcomes: OutcomeRecord[];
  principles: PrincipleRecord[];
};

type FeedEvent = Record<string, unknown> & { type?: string };

type RefreshDecision = () => Promise<DecisionDetailPayload>;

const STATUS_LABELS: Record<DecisionStatus, string> = {
  archived: "Archived",
  decided: "Decided",
  draft: "Draft",
  exploring: "Exploring",
  review_due: "Review due",
  reviewed: "Reviewed",
};

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }
  return payload;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asPlan(value: unknown): CouncilPlan | null {
  if (
    !isObject(value) ||
    !Array.isArray(value.lenses) ||
    !Array.isArray(value.members)
  ) {
    return null;
  }
  return value as unknown as CouncilPlan;
}

function asBrief(value: unknown): CouncilBrief | null {
  if (!isObject(value) || !isObject(value.situation)) {
    return null;
  }
  return value as unknown as CouncilBrief;
}

function asEvidence(value: unknown): RetrievedReference[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isObject).map((item, index) => ({
    chunkId: typeof item.chunkId === "string" ? item.chunkId : null,
    datasetId: typeof item.datasetId === "string" ? item.datasetId : null,
    documentId: typeof item.documentId === "string" ? item.documentId : null,
    key: typeof item.key === "string" ? item.key : `R${index + 1}`,
    positions: Array.isArray(item.positions) ? item.positions : [],
    retrievalContexts: Array.isArray(item.retrievalContexts)
      ? (item.retrievalContexts.filter(
          isObject
        ) as RetrievedReference["retrievalContexts"])
      : [],
    score: typeof item.score === "number" ? item.score : null,
    text: typeof item.text === "string" ? item.text : "",
    title: typeof item.title === "string" ? item.title : "RAGFlow document",
  }));
}

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  const delta = timestamp - Date.now();
  const minutes = Math.round(delta / 60_000);
  if (Math.abs(minutes) < 60) {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
      minutes,
      "minute"
    );
  }
  const hours = Math.round(delta / 3_600_000);
  if (Math.abs(hours) < 24) {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
      hours,
      "hour"
    );
  }
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function legacyConfidence(value: JudgmentRecord["confidence"]) {
  if (value === "low") {
    return "Low confidence";
  }
  if (value === "high") {
    return "High confidence";
  }
  return value === "medium" ? "Medium confidence" : "Confidence not set";
}

function consumeNdjsonStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: FeedEvent) => void,
  decoder = new TextDecoder(),
  buffer = ""
): Promise<void> {
  return reader.read().then((chunk) => {
    const nextBuffer =
      buffer + (chunk.value ? decoder.decode(chunk.value, { stream: !chunk.done }) : "");
    if (chunk.done) {
      if (nextBuffer.trim()) {
        onEvent(JSON.parse(nextBuffer) as FeedEvent);
      }
      return;
    }

    const rows = nextBuffer.split("\n");
    const remainder = rows.pop() ?? "";
    for (const row of rows) {
      if (row.trim()) {
        onEvent(JSON.parse(row) as FeedEvent);
      }
    }
    return consumeNdjsonStream(reader, onEvent, decoder, remainder);
  });
}

function CitationLinks({ citations }: { citations: string[] }) {
  if (!citations.length) {
    return null;
  }
  return (
    <span className={councilStyles.citationList}>
      {citations.map((citation) => (
        <a
          className={councilStyles.citation}
          href={`#evidence-${citation}`}
          key={citation}
        >
          {citation}
        </a>
      ))}
    </span>
  );
}

function ClaimView({
  claim,
  status,
}: {
  claim: CouncilClaim;
  status?: FactAssumption["status"];
}) {
  return (
    <div className={councilStyles.claim}>
      <p>{claim.text}</p>
      <div className={councilStyles.claimMeta}>
        {status ? (
          <span className={councilStyles.factBadge}>{status}</span>
        ) : null}
        <span className={councilStyles.layerBadge}>{claim.layer}</span>
        <CitationLinks citations={claim.citations} />
      </div>
    </div>
  );
}

function claimKey(prefix: string, claim: CouncilClaim) {
  return `${prefix}-${claim.layer}-${claim.text}-${claim.citations.join("-")}`;
}

function ClaimSection({
  claims,
  title,
}: {
  claims: CouncilClaim[];
  title: string;
}) {
  return (
    <section className={councilStyles.briefSection}>
      <h3>{title}</h3>
      {claims.length ? (
        <div className={councilStyles.claimList}>
          {claims.map((claim) => (
            <ClaimView claim={claim} key={claimKey(title, claim)} />
          ))}
        </div>
      ) : (
        <span className={councilStyles.emptySection}>No grounded claim.</span>
      )}
    </section>
  );
}

function CouncilBriefView({ brief }: { brief: CouncilBrief }) {
  return (
    <div className={councilStyles.brief} data-testid="council-brief">
      <section className={councilStyles.briefSection}>
        <h3>The situation</h3>
        <ClaimView claim={brief.situation} />
      </section>
      <section className={councilStyles.briefSection}>
        <h3>Facts vs assumptions</h3>
        {brief.factsVsAssumptions.length ? (
          <div className={councilStyles.claimList}>
            {brief.factsVsAssumptions.map((item) => (
              <ClaimView
                claim={item}
                key={claimKey(item.status, item)}
                status={item.status}
              />
            ))}
          </div>
        ) : (
          <span className={councilStyles.emptySection}>Not classified.</span>
        )}
      </section>
      <ClaimSection claims={brief.agreement} title="Where the council agrees" />
      <ClaimSection claims={brief.disagreement} title="Where it disagrees" />
      <ClaimSection claims={brief.crux} title="The crux" />
      <ClaimSection claims={brief.unknowns} title="What you still don't know" />
      <ClaimSection
        claims={brief.reversibilityDownside}
        title="Reversibility & downside"
      />
      <ClaimSection claims={brief.nextMoves} title="Suggested next move" />
    </div>
  );
}

function CouncilPlanView({ plan }: { plan: CouncilPlan }) {
  return (
    <div className={councilStyles.planBlock} data-testid="council-plan">
      <div className={councilStyles.modeRow}>
        <strong>Relevant lenses</strong>
        <span className={councilStyles.modeBadge}>
          {plan.mode === "auto" ? "Auto Council" : "Customized Council"}
        </span>
      </div>
      <div className={councilStyles.lensList}>
        {plan.lenses.map((lens) => (
          <span className={councilStyles.lensChip} key={lens.id}>
            {lens.label}
          </span>
        ))}
      </div>
      <div className={councilStyles.memberGrid}>
        {plan.members.map((member) => (
          <div className={councilStyles.memberCard} key={member.id}>
            <strong>{member.name}</strong>
            <span>{member.lens}</span>
            <p>{member.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomizeCouncil({
  disabled,
  onToggle,
  selected,
}: {
  disabled: boolean;
  onToggle: (id: string) => void;
  selected: string[];
}) {
  const handleToggle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onToggle(event.currentTarget.value);
    },
    [onToggle]
  );

  return (
    <details className={councilStyles.customize}>
      <summary>Customize Council</summary>
      <p className={councilStyles.sourceNote}>
        Auto-select is the default. Override only when a specific reasoning lens
        matters to you.
      </p>
      <div className={councilStyles.customizeGrid}>
        {THINKERS.map((thinker) => (
          <label className={councilStyles.customizeOption} key={thinker.id}>
            <input
              checked={selected.includes(thinker.id)}
              disabled={disabled}
              onChange={handleToggle}
              type="checkbox"
              value={thinker.id}
            />
            <span>
              <strong>{thinker.name}</strong>
              <br />
              {thinker.lens}
            </span>
          </label>
        ))}
      </div>
    </details>
  );
}

function JudgmentStage({
  brief,
  decisionId,
  hasCouncil,
  judgments,
  onRefresh,
}: {
  brief: CouncilBrief | null;
  decisionId: string;
  hasCouncil: boolean;
  judgments: JudgmentRecord[];
  onRefresh: RefreshDecision;
}) {
  const [judgmentSummary, setJudgmentSummary] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [rationale, setRationale] = useState("");
  const [confidencePercent, setConfidencePercent] = useState(65);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const suggestedStarts = brief
    ? [...brief.nextMoves, ...brief.crux, ...brief.agreement]
        .map((item) => item.text)
        .filter((text, index, all) => all.indexOf(text) === index)
        .slice(0, 3)
    : [];

  const chooseStartingPoint = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      setJudgmentSummary(event.currentTarget.value);
    },
    []
  );

  const handleSummaryChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setJudgmentSummary(event.target.value);
    },
    []
  );

  const handleOptionChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSelectedOption(event.target.value);
    },
    []
  );

  const handleRationaleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setRationale(event.target.value);
    },
    []
  );

  const handleConfidenceChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setConfidencePercent(
        Math.min(100, Math.max(0, Number(event.target.value)))
      );
    },
    []
  );

  const submitJudgment = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSaving(true);
      setError("");
      try {
        await fetchJson(`/api/decisions/${decisionId}/judgment`, {
          body: JSON.stringify({
            confidencePercent,
            rationale: rationale || undefined,
            selectedOption: selectedOption || undefined,
            summary: judgmentSummary,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        setJudgmentSummary("");
        setSelectedOption("");
        setRationale("");
        await onRefresh();

        if (hasCouncil) {
          try {
            await fetchJson(`/api/decisions/${decisionId}/principle-candidate`, {
              method: "POST",
            });
            await onRefresh();
          } catch (caught) {
            setError(
              caught instanceof Error
                ? `Judgment saved. Candidate principle was not generated: ${caught.message}`
                : "Judgment saved. Candidate principle was not generated."
            );
          }
        }
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Could not save judgment."
        );
      } finally {
        setSaving(false);
      }
    },
    [
      confidencePercent,
      decisionId,
      hasCouncil,
      judgmentSummary,
      onRefresh,
      rationale,
      selectedOption,
    ]
  );

  return (
    <article
      className={`${baseStyles.card} ${styles.judgmentStage}`}
      id="make-judgment"
    >
      <div className={styles.stageHeader}>
        <div>
          <span className={styles.step}>Your judgment · not the AI's</span>
          <h2>Make your judgment</h2>
          <p>After considering the evidence, what do you believe?</p>
        </div>
        <span className={styles.ownershipBadge}>You own this</span>
      </div>

      {judgments.length ? (
        <div className={styles.judgmentHistory}>
          {judgments.map((item) => (
            <div className={styles.judgmentRecord} key={item.id}>
              <strong>{item.summary}</strong>
              {item.selectedOption ? <p>Choice: {item.selectedOption}</p> : null}
              {item.rationale ? <p>{item.rationale}</p> : null}
              <span>
                {item.confidencePercent === null
                  ? legacyConfidence(item.confidence)
                  : `${item.confidencePercent}% confidence`}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {suggestedStarts.length ? (
        <div className={styles.startingPoints}>
          <span>Optional starting points — edit before saving</span>
          <div className={styles.startingPointGrid}>
            {suggestedStarts.map((text) => (
              <button
                data-testid="judgment-start"
                key={text}
                onClick={chooseStartingPoint}
                type="button"
                value={text}
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <div className={baseStyles.error}>{error}</div> : null}

      <form className={baseStyles.form} onSubmit={submitJudgment}>
        <div className={baseStyles.field}>
          <label htmlFor="judgment-summary">What did you decide?</label>
          <textarea
            id="judgment-summary"
            onChange={handleSummaryChange}
            placeholder="I will continue the partnership, but only after a direct conversation with explicit behavioral expectations."
            required
            value={judgmentSummary}
          />
        </div>
        <div className={baseStyles.field}>
          <label htmlFor="selected-option">Selected option</label>
          <input
            id="selected-option"
            onChange={handleOptionChange}
            placeholder="Continue with explicit conditions"
            value={selectedOption}
          />
        </div>
        <div className={baseStyles.field}>
          <label htmlFor="judgment-rationale">Rationale</label>
          <textarea
            id="judgment-rationale"
            onChange={handleRationaleChange}
            placeholder="Why this judgment survives the strongest counterargument…"
            value={rationale}
          />
        </div>
        <div className={styles.confidenceField}>
          <div className={styles.confidenceHeader}>
            <label htmlFor="judgment-confidence">Confidence (%)</label>
            <strong>{confidencePercent}%</strong>
          </div>
          <input
            aria-label="Confidence slider"
            max={100}
            min={0}
            onChange={handleConfidenceChange}
            type="range"
            value={confidencePercent}
          />
          <input
            id="judgment-confidence"
            max={100}
            min={0}
            onChange={handleConfidenceChange}
            type="number"
            value={confidencePercent}
          />
        </div>
        <button
          className={baseStyles.primaryButton}
          disabled={saving || !judgmentSummary.trim()}
          type="submit"
        >
          Save judgment
        </button>
      </form>
    </article>
  );
}

function CandidateStage({
  candidate,
  decisionId,
  hasCouncil,
  hasJudgment,
  onRefresh,
}: {
  candidate: PrincipleCandidate | null;
  decisionId: string;
  hasCouncil: boolean;
  hasJudgment: boolean;
  onRefresh: RefreshDecision;
}) {
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [statement, setStatement] = useState(candidate?.statement || "");
  const [rationale, setRationale] = useState(candidate?.rationale || "");

  const generateCandidate = useCallback(async () => {
    setError("");
    setSaving("generate");
    try {
      await fetchJson(`/api/decisions/${decisionId}/principle-candidate`, {
        method: "POST",
      });
      await onRefresh();
      setEditing(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not generate a candidate principle."
      );
    } finally {
      setSaving("");
    }
  }, [decisionId, onRefresh]);

  const startEditing = useCallback(() => {
    if (!candidate) {
      return;
    }
    setStatement(candidate.statement);
    setRationale(candidate.rationale);
    setEditing(true);
    setError("");
  }, [candidate]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setError("");
  }, []);

  const handleStatementChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setStatement(event.target.value);
    },
    []
  );

  const handleRationaleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setRationale(event.target.value);
    },
    []
  );

  const saveCandidateEdit = useCallback(async () => {
    if (!candidate) {
      return;
    }
    setSaving("edit");
    setError("");
    try {
      await fetchJson(`/api/decisions/${decisionId}/principle-candidate`, {
        body: JSON.stringify({
          action: "edit",
          candidateId: candidate.id,
          rationale,
          statement,
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      await onRefresh();
      setEditing(false);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not edit candidate."
      );
    } finally {
      setSaving("");
    }
  }, [candidate, decisionId, onRefresh, rationale, statement]);

  const rejectCandidate = useCallback(async () => {
    if (!candidate) {
      return;
    }
    setSaving("reject");
    setError("");
    try {
      await fetchJson(`/api/decisions/${decisionId}/principle-candidate`, {
        body: JSON.stringify({ action: "reject", candidateId: candidate.id }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      await onRefresh();
      setEditing(false);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not reject candidate."
      );
    } finally {
      setSaving("");
    }
  }, [candidate, decisionId, onRefresh]);

  const adoptCandidate = useCallback(async () => {
    if (!candidate) {
      return;
    }
    setSaving("adopt");
    setError("");
    try {
      await fetchJson(`/api/decisions/${decisionId}/principles`, {
        body: JSON.stringify({
          candidateId: candidate.id,
          description: candidate.rationale,
          statement: candidate.statement,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      await onRefresh();
      setEditing(false);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not adopt candidate."
      );
    } finally {
      setSaving("");
    }
  }, [candidate, decisionId, onRefresh]);

  return (
    <article className={`${baseStyles.card} ${styles.candidateStage}`}>
      <div className={styles.stageHeader}>
        <div>
          <span className={styles.step}>
            AI proposal · requires your consent
          </span>
          <h2>Candidate principle</h2>
          <p>
            A reusable rule extracted from your judgment. It is not part of My
            Principles until you adopt it.
          </p>
        </div>
        {candidate ? (
          <span
            className={`${styles.candidateStatus} ${styles[candidate.status]}`}
          >
            {candidate.status}
          </span>
        ) : null}
      </div>

      {error ? <div className={baseStyles.error}>{error}</div> : null}

      {!candidate && hasCouncil && hasJudgment ? (
        <button
          className={baseStyles.secondaryButton}
          disabled={saving === "generate"}
          onClick={generateCandidate}
          type="button"
        >
          {saving === "generate"
            ? "Extracting…"
            : "Generate candidate principle"}
        </button>
      ) : null}

      {!candidate && (!hasCouncil || !hasJudgment) ? (
        <p className={baseStyles.muted}>
          Council + your saved judgment are required before AI can propose a
          candidate principle.
        </p>
      ) : null}

      {candidate ? (
        <div
          className={styles.candidateBody}
          data-testid="candidate-principle"
        >
          {editing && candidate.status === "pending" ? (
            <div className={baseStyles.form}>
              <div className={baseStyles.field}>
                <label htmlFor="candidate-statement">
                  Candidate principle statement
                </label>
                <textarea
                  id="candidate-statement"
                  onChange={handleStatementChange}
                  value={statement}
                />
              </div>
              <div className={baseStyles.field}>
                <label htmlFor="candidate-rationale">Candidate rationale</label>
                <textarea
                  id="candidate-rationale"
                  onChange={handleRationaleChange}
                  value={rationale}
                />
              </div>
              <div className={styles.candidateActions}>
                <button
                  className={baseStyles.primaryButton}
                  disabled={saving === "edit" || !statement.trim()}
                  onClick={saveCandidateEdit}
                  type="button"
                >
                  Save edit
                </button>
                <button
                  className={baseStyles.secondaryButton}
                  onClick={cancelEditing}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <strong className={styles.candidateStatement}>
                {candidate.statement}
              </strong>
              <p>{candidate.rationale}</p>
            </>
          )}

          {!editing && candidate.status === "pending" ? (
            <div className={styles.candidateActions}>
              <button
                className={baseStyles.primaryButton}
                disabled={saving === "adopt"}
                onClick={adoptCandidate}
                type="button"
              >
                <Check size={14} /> Adopt
              </button>
              <button
                className={baseStyles.secondaryButton}
                onClick={startEditing}
                type="button"
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                className={baseStyles.secondaryButton}
                disabled={saving === "reject"}
                onClick={rejectCandidate}
                type="button"
              >
                <X size={14} /> Reject
              </button>
            </div>
          ) : null}

          {candidate.status === "rejected" ? (
            <button
              className={baseStyles.secondaryButton}
              disabled={saving === "generate"}
              onClick={generateCandidate}
              type="button"
            >
              Generate another candidate
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function ManualPrinciples({
  decisionId,
  onRefresh,
  principles,
}: {
  decisionId: string;
  onRefresh: RefreshDecision;
  principles: PrincipleRecord[];
}) {
  const [statement, setStatement] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleStatementChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setStatement(event.target.value);
    },
    []
  );

  const handleDescriptionChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setDescription(event.target.value);
    },
    []
  );

  const submitPrinciple = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSaving(true);
      setError("");
      try {
        await fetchJson(`/api/decisions/${decisionId}/principles`, {
          body: JSON.stringify({
            description: description || undefined,
            statement,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        setStatement("");
        setDescription("");
        await onRefresh();
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Could not save principle."
        );
      } finally {
        setSaving(false);
      }
    },
    [decisionId, description, onRefresh, statement]
  );

  return (
    <article className={baseStyles.card}>
      <div className={baseStyles.cardHeader}>
        <h2>Principles</h2>
        <span>{principles.length} adopted</span>
      </div>
      <div className={baseStyles.principleList}>
        {principles.map((item) => (
          <div className={baseStyles.principleItem} key={item.id}>
            <strong>{item.statement}</strong>
            {item.description ? <p>{item.description}</p> : null}
            <p>
              Revision {item.revision} · {item.relation || "adopted"}
            </p>
          </div>
        ))}
      </div>
      {error ? <div className={baseStyles.error}>{error}</div> : null}
      <div className={styles.manualPrinciple}>
        <span>Write your own principle instead</span>
        <form className={baseStyles.form} onSubmit={submitPrinciple}>
          <div className={baseStyles.field}>
            <label htmlFor="principle-statement">Keep a principle</label>
            <input
              id="principle-statement"
              onChange={handleStatementChange}
              placeholder="Avoid partners who consistently evade hard conversations."
              required
              value={statement}
            />
          </div>
          <div className={baseStyles.field}>
            <label htmlFor="principle-description">Why it matters</label>
            <textarea
              id="principle-description"
              onChange={handleDescriptionChange}
              placeholder="Optional nuance, boundary conditions, exceptions…"
              value={description}
            />
          </div>
          <button
            className={baseStyles.secondaryButton}
            disabled={saving}
            type="submit"
          >
            Adopt principle
          </button>
        </form>
      </div>
    </article>
  );
}

function OutcomePanel({
  decisionId,
  onRefresh,
  outcomes,
}: {
  decisionId: string;
  onRefresh: RefreshDecision;
  outcomes: OutcomeRecord[];
}) {
  const [result, setResult] = useState("");
  const [lessons, setLessons] = useState("");
  const [verdict, setVerdict] = useState<
    "positive" | "mixed" | "negative" | "too_early"
  >("too_early");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleResultChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setResult(event.target.value);
    },
    []
  );

  const handleLessonsChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setLessons(event.target.value);
    },
    []
  );

  const handleVerdictChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setVerdict(
        event.target.value as "positive" | "mixed" | "negative" | "too_early"
      );
    },
    []
  );

  const submitOutcome = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSaving(true);
      setError("");
      try {
        await fetchJson(`/api/decisions/${decisionId}/outcome`, {
          body: JSON.stringify({
            lessons: lessons || undefined,
            result,
            verdict,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        setResult("");
        setLessons("");
        await onRefresh();
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Could not save outcome."
        );
      } finally {
        setSaving(false);
      }
    },
    [decisionId, lessons, onRefresh, result, verdict]
  );

  return (
    <article className={baseStyles.card}>
      <div className={baseStyles.cardHeader}>
        <h2>Outcome</h2>
        <span>{outcomes.length ? "Reviewed" : "Not reviewed"}</span>
      </div>
      <div className={baseStyles.outcomeList}>
        {outcomes.map((item) => (
          <div className={baseStyles.outcomeItem} key={item.id}>
            <strong>{item.result}</strong>
            {item.lessons ? <p>{item.lessons}</p> : null}
            <p>Verdict: {item.verdict.replace("_", " ")}</p>
          </div>
        ))}
      </div>
      {error ? <div className={baseStyles.error}>{error}</div> : null}
      <form className={baseStyles.form} onSubmit={submitOutcome}>
        <div className={baseStyles.field}>
          <label htmlFor="outcome-result">What happened?</label>
          <textarea
            id="outcome-result"
            onChange={handleResultChange}
            placeholder="Review the decision when reality gives you enough signal."
            required
            value={result}
          />
        </div>
        <div className={baseStyles.field}>
          <label htmlFor="outcome-verdict">Verdict</label>
          <select
            id="outcome-verdict"
            onChange={handleVerdictChange}
            value={verdict}
          >
            <option value="too_early">Too early</option>
            <option value="positive">Positive</option>
            <option value="mixed">Mixed</option>
            <option value="negative">Negative</option>
          </select>
        </div>
        <div className={baseStyles.field}>
          <label htmlFor="outcome-lessons">What did you learn?</label>
          <textarea
            id="outcome-lessons"
            onChange={handleLessonsChange}
            placeholder="What should future-you update?"
            value={lessons}
          />
        </div>
        <button
          className={baseStyles.secondaryButton}
          disabled={saving}
          type="submit"
        >
          Save outcome
        </button>
      </form>
    </article>
  );
}

export function JudgmentDecisionWorkspace({
  decisionId,
}: {
  decisionId: string;
}) {
  const [detail, setDetail] = useState<DecisionDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [councilBusy, setCouncilBusy] = useState(false);
  const [councilStatus, setCouncilStatus] = useState("");
  const [livePlan, setLivePlan] = useState<CouncilPlan | null>(null);
  const [liveBrief, setLiveBrief] = useState<CouncilBrief | null>(null);
  const [liveEvidence, setLiveEvidence] = useState<RetrievedReference[]>([]);
  const [customThinkerIds, setCustomThinkerIds] = useState<string[]>([]);

  const loadDetail = useCallback(async () => {
    const payload = await fetchJson<DecisionDetailPayload>(
      `/api/decisions/${decisionId}`
    );
    setDetail(payload);
    return payload;
  }, [decisionId]);

  useEffect(() => {
    loadDetail()
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error ? caught.message : "Could not load decision."
        )
      )
      .finally(() => setLoading(false));
  }, [loadDetail]);

  const toggleThinker = useCallback((id: string) => {
    setCustomThinkerIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }, []);

  const runCouncil = useCallback(async () => {
    if (!detail || councilBusy) {
      return;
    }
    setCouncilBusy(true);
    setError("");
    setCouncilStatus("Starting Council…");
    setLivePlan(null);
    setLiveBrief(null);
    setLiveEvidence([]);

    let finalPlan: CouncilPlan | null = null;
    let finalBrief: CouncilBrief | null = null;
    let finalEvidence: RetrievedReference[] = [];
    let finalAnswer = "";
    let streamError = "";

    try {
      const response = await fetch("/api/council", {
        body: JSON.stringify({
          context: detail.decision.context || "",
          question: detail.decision.question,
          thinkerIds: customThinkerIds,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok || !response.body) {
        throw new Error("Council endpoint did not respond.");
      }

      const reader = response.body.getReader();
      await consumeNdjsonStream(reader, (event) => {
        if (event.type === "status" && typeof event.message === "string") {
          setCouncilStatus(event.message);
        }
        if (event.type === "plan") {
          const parsedPlan = asPlan(event.plan);
          if (parsedPlan) {
            finalPlan = parsedPlan;
            setLivePlan(parsedPlan);
          }
        }
        if (event.type === "references") {
          finalEvidence = asEvidence(event.references);
          setLiveEvidence(finalEvidence);
        }
        if (event.type === "answer") {
          if (typeof event.answer === "string") {
            finalAnswer = event.answer;
          }
          const parsedBrief = asBrief(event.brief);
          if (parsedBrief) {
            finalBrief = parsedBrief;
            setLiveBrief(parsedBrief);
          }
          const answerPlan = asPlan(event.plan);
          if (answerPlan) {
            finalPlan = answerPlan;
            setLivePlan(answerPlan);
          }
        }
        if (event.type === "error" && typeof event.message === "string") {
          streamError = event.message;
        }
      });

      if (streamError && !finalAnswer) {
        throw new Error(streamError);
      }
      if (!finalPlan) {
        throw new Error("Council could not produce a reasoning plan.");
      }

      await fetchJson(`/api/decisions/${decisionId}/analysis`, {
        body: JSON.stringify({
          councilAnalysis:
            finalAnswer ||
            "No evidence retrieved for a grounded Council brief.",
          councilBrief: finalBrief,
          councilPlan: finalPlan,
          evidence: finalEvidence,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      await loadDetail();
      setCouncilStatus("");
      setLivePlan(null);
      setLiveBrief(null);
      setLiveEvidence([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Council failed.");
    } finally {
      setCouncilBusy(false);
    }
  }, [councilBusy, customThinkerIds, decisionId, detail, loadDetail]);

  if (loading) {
    return (
      <WorkspaceShell active="decisions" title="Decisions">
        <div className={baseStyles.loading}>Loading decision…</div>
      </WorkspaceShell>
    );
  }
  if (!detail) {
    return (
      <WorkspaceShell active="decisions" title="Decisions">
        <div className={baseStyles.error}>{error || "Decision not found."}</div>
      </WorkspaceShell>
    );
  }

  const persistedPlan = asPlan(detail.decision.councilPlan);
  const persistedBrief = asBrief(detail.decision.councilBrief);
  const plan = livePlan || persistedPlan;
  const brief = liveBrief || persistedBrief;
  const persistedEvidence = asEvidence(detail.decision.evidence);
  const evidence = liveEvidence.length ? liveEvidence : persistedEvidence;
  const candidate = detail.decision.principleCandidate;
  const hasCouncil = Boolean(brief || detail.decision.councilAnalysis);
  const hasJudgment = detail.judgments.length > 0;

  return (
    <WorkspaceShell active="decisions" title="Decisions">
      <section>
        <a className={baseStyles.backLink} href="/decisions">
          <ArrowLeft size={14} /> All decisions
        </a>
        <div className={baseStyles.detailHeader}>
          <div>
            <span className={baseStyles.eyebrow}>Decision</span>
            <h1>{detail.decision.question}</h1>
            <div className={baseStyles.detailMeta}>
              <span className={baseStyles.status}>
                {STATUS_LABELS[detail.decision.status]}
              </span>
              <span className={baseStyles.time}>
                Updated {relativeTime(detail.decision.updatedAt)}
              </span>
            </div>
          </div>
          <div className={styles.headerActions}>
            {hasCouncil && !hasJudgment ? (
              <a className={baseStyles.primaryButton} href="#make-judgment">
                Make your judgment
              </a>
            ) : null}
            <button
              className={
                hasCouncil
                  ? baseStyles.secondaryButton
                  : baseStyles.primaryButton
              }
              disabled={councilBusy}
              onClick={runCouncil}
              type="button"
            >
              <Sparkles size={15} />
              {councilBusy ? "Council thinking…" : "Run Council"}
            </button>
          </div>
        </div>
        {error ? <div className={baseStyles.error}>{error}</div> : null}
        {councilStatus ? (
          <p className={councilStyles.statusText}>{councilStatus}</p>
        ) : null}

        <div className={baseStyles.detailGrid}>
          <div className={baseStyles.stack}>
            <article className={baseStyles.card}>
              <div className={baseStyles.cardHeader}>
                <h2>Context</h2>
                <span>Original messy input</span>
              </div>
              <p className={baseStyles.bodyText}>
                {detail.decision.context || "No context saved."}
              </p>
            </article>

            <article className={baseStyles.card}>
              <div className={baseStyles.cardHeader}>
                <h2>Council setup</h2>
                <span>
                  {plan ? `${plan.lenses.length} lenses` : "Auto by default"}
                </span>
              </div>
              {plan ? (
                <CouncilPlanView plan={plan} />
              ) : (
                <p className={baseStyles.muted}>
                  Council will classify the decision, select relevant lenses,
                  and explain why each member is in the room.
                </p>
              )}
              <CustomizeCouncil
                disabled={councilBusy}
                onToggle={toggleThinker}
                selected={customThinkerIds}
              />
            </article>
          </div>

          <div className={baseStyles.stack}>
            <article className={baseStyles.card}>
              <div className={baseStyles.cardHeader}>
                <h2>Evidence</h2>
                <span>{evidence.length} chunks</span>
              </div>
              <p className={councilStyles.sourceNote}>
                Each R-key is retrieval evidence. Council claims link back here.
              </p>
              {evidence.length === 0 ? (
                <p className={baseStyles.muted}>No evidence retrieved yet.</p>
              ) : (
                <div className={baseStyles.evidenceList}>
                  {evidence.map((item) => (
                    <div
                      className={baseStyles.evidenceItem}
                      data-testid={`evidence-${item.key}`}
                      id={`evidence-${item.key}`}
                      key={item.key}
                    >
                      <strong>
                        <span className={councilStyles.evidenceKey}>
                          {item.key}
                        </span>
                        {item.title}
                      </strong>
                      {item.score === null ? null : (
                        <p>Retrieval score: {item.score.toFixed(3)}</p>
                      )}
                      {item.retrievalContexts.length ? (
                        <div className={councilStyles.contextList}>
                          {item.retrievalContexts.map((context) => (
                            <span
                              className={councilStyles.contextChip}
                              key={`${item.key}-${context.kind}-${context.id}`}
                            >
                              {context.label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {item.text ? <p>{item.text.slice(0, 900)}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>
        </div>

        <article className={`${baseStyles.card} ${styles.briefCard}`}>
          <div className={baseStyles.cardHeader}>
            <h2>Council brief</h2>
            <span>
              {councilBusy ? "Running" : brief ? "Grounded" : "Not run"}
            </span>
          </div>
          {brief ? <CouncilBriefView brief={brief} /> : null}
          {!brief && detail.decision.councilAnalysis ? (
            <div className={baseStyles.analysis}>
              {detail.decision.councilAnalysis}
            </div>
          ) : null}
          {!brief && !detail.decision.councilAnalysis ? (
            <p className={baseStyles.muted}>
              Run Council to create an evidence-backed brief before making your
              judgment.
            </p>
          ) : null}
        </article>

        <JudgmentStage
          brief={brief}
          decisionId={decisionId}
          hasCouncil={hasCouncil}
          judgments={detail.judgments}
          onRefresh={loadDetail}
        />

        <CandidateStage
          candidate={candidate}
          decisionId={decisionId}
          hasCouncil={hasCouncil}
          hasJudgment={hasJudgment}
          onRefresh={loadDetail}
        />

        <div className={baseStyles.detailGrid}>
          <div className={baseStyles.stack}>
            <ManualPrinciples
              decisionId={decisionId}
              onRefresh={loadDetail}
              principles={detail.principles}
            />
          </div>
          <div className={baseStyles.stack}>
            <OutcomePanel
              decisionId={decisionId}
              onRefresh={loadDetail}
              outcomes={detail.outcomes}
            />
          </div>
        </div>
      </section>
    </WorkspaceShell>
  );
}
