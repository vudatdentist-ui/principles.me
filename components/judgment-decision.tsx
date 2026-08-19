"use client";

import { ArrowLeft, Check, Pencil, Sparkles, X } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
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

type JudgmentRecord = {
  confidence: "low" | "medium" | "high" | null;
  confidencePercent: number | null;
  id: string;
  rationale: string | null;
  selectedOption: string | null;
  summary: string;
};

type PrincipleRecord = {
  description: string | null;
  id: string;
  relation: "suggested" | "applied" | "challenged" | "created" | "adopted";
  revision: number;
  statement: string;
};

type OutcomeRecord = {
  id: string;
  lessons: string | null;
  result: string;
  verdict: "positive" | "mixed" | "negative" | "too_early";
};

type DecisionDetailPayload = {
  decision: {
    context: string | null;
    councilAnalysis: string | null;
    councilBrief: CouncilBrief | null;
    councilPlan: CouncilPlan | null;
    evidence: unknown;
    principleCandidate: PrincipleCandidate | null;
    question: string;
    status: DecisionStatus;
    updatedAt: string;
  };
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
  return isObject(value) && isObject(value.situation)
    ? (value as unknown as CouncilBrief)
    : null;
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
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function readNdjson(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: FeedEvent) => void,
  decoder = new TextDecoder(),
  buffer = ""
): Promise<void> {
  return reader.read().then(({ done, value }) => {
    const next =
      buffer + (value ? decoder.decode(value, { stream: !done }) : "");
    const rows = next.split("\n");
    const remainder = rows.pop() ?? "";
    for (const row of rows) {
      if (row.trim()) {
        onEvent(JSON.parse(row) as FeedEvent);
      }
    }
    if (done) {
      if (remainder.trim()) {
        onEvent(JSON.parse(remainder) as FeedEvent);
      }
      return;
    }
    return readNdjson(reader, onEvent, decoder, remainder);
  });
}

function CitationLinks({ citations }: { citations: string[] }) {
  return citations.length ? (
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
  ) : null;
}

function Claim({
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
            <Claim claim={claim} key={claimKey(title, claim)} />
          ))}
        </div>
      ) : (
        <span className={councilStyles.emptySection}>No grounded claim.</span>
      )}
    </section>
  );
}

function Brief({ brief }: { brief: CouncilBrief }) {
  return (
    <div className={councilStyles.brief} data-testid="council-brief">
      <section className={councilStyles.briefSection}>
        <h3>The situation</h3>
        <Claim claim={brief.situation} />
      </section>
      <section className={councilStyles.briefSection}>
        <h3>Facts vs assumptions</h3>
        {brief.factsVsAssumptions.map((item) => (
          <Claim
            claim={item}
            key={claimKey(item.status, item)}
            status={item.status}
          />
        ))}
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

function Plan({ plan }: { plan: CouncilPlan }) {
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
  const judgmentRef = useRef<HTMLTextAreaElement>(null);
  const [confidence, setConfidence] = useState(65);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const starts = brief
    ? [...brief.nextMoves, ...brief.crux, ...brief.agreement]
        .map((item) => item.text)
        .filter((text, index, all) => all.indexOf(text) === index)
        .slice(0, 3)
    : [];

  const chooseStart = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    if (judgmentRef.current) {
      judgmentRef.current.value = event.currentTarget.value;
      judgmentRef.current.focus();
    }
  }, []);

  const updateConfidence = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setConfidence(Math.min(100, Math.max(0, Number(event.target.value))));
    },
    []
  );

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSaving(true);
      setError("");
      const form = new FormData(event.currentTarget);
      const summary = String(form.get("summary") ?? "").trim();
      try {
        await fetchJson(`/api/decisions/${decisionId}/judgment`, {
          body: JSON.stringify({
            confidencePercent: confidence,
            rationale: String(form.get("rationale") ?? "").trim() || undefined,
            selectedOption:
              String(form.get("selectedOption") ?? "").trim() || undefined,
            summary,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        event.currentTarget.reset();
        setConfidence(65);
        await onRefresh();
        if (hasCouncil) {
          try {
            await fetchJson(
              `/api/decisions/${decisionId}/principle-candidate`,
              { method: "POST" }
            );
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
    [confidence, decisionId, hasCouncil, onRefresh]
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
              {item.selectedOption ? (
                <p>Choice: {item.selectedOption}</p>
              ) : null}
              {item.rationale ? <p>{item.rationale}</p> : null}
              <span>
                {item.confidencePercent === null
                  ? item.confidence
                    ? `${item.confidence} confidence`
                    : "Confidence not set"
                  : `${item.confidencePercent}% confidence`}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {starts.length ? (
        <div className={styles.startingPoints}>
          <span>Optional starting points — edit before saving</span>
          <div className={styles.startingPointGrid}>
            {starts.map((text) => (
              <button
                data-testid="judgment-start"
                key={text}
                onClick={chooseStart}
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
      <form className={baseStyles.form} onSubmit={submit}>
        <div className={baseStyles.field}>
          <label htmlFor="judgment-summary">What did you decide?</label>
          <textarea
            id="judgment-summary"
            name="summary"
            ref={judgmentRef}
            required
          />
        </div>
        <div className={baseStyles.field}>
          <label htmlFor="selected-option">Selected option</label>
          <input id="selected-option" name="selectedOption" />
        </div>
        <div className={baseStyles.field}>
          <label htmlFor="judgment-rationale">Rationale</label>
          <textarea id="judgment-rationale" name="rationale" />
        </div>
        <div className={styles.confidenceField}>
          <div className={styles.confidenceHeader}>
            <label htmlFor="judgment-confidence">Confidence (%)</label>
            <strong>{confidence}%</strong>
          </div>
          <input
            aria-label="Confidence slider"
            max={100}
            min={0}
            onChange={updateConfidence}
            type="range"
            value={confidence}
          />
          <input
            id="judgment-confidence"
            max={100}
            min={0}
            onChange={updateConfidence}
            type="number"
            value={confidence}
          />
        </div>
        <button
          className={baseStyles.primaryButton}
          disabled={saving}
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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  const generate = useCallback(async () => {
    setSaving("generate");
    setError("");
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

  const startEdit = useCallback(() => setEditing(true), []);
  const cancelEdit = useCallback(() => setEditing(false), []);

  const saveEdit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!candidate) {
        return;
      }
      const form = new FormData(event.currentTarget);
      setSaving("edit");
      setError("");
      try {
        await fetchJson(`/api/decisions/${decisionId}/principle-candidate`, {
          body: JSON.stringify({
            action: "edit",
            candidateId: candidate.id,
            rationale: String(form.get("rationale") ?? "").trim(),
            statement: String(form.get("statement") ?? "").trim(),
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
    },
    [candidate, decisionId, onRefresh]
  );

  const reject = useCallback(async () => {
    if (!candidate) {
      return;
    }
    setSaving("reject");
    try {
      await fetchJson(`/api/decisions/${decisionId}/principle-candidate`, {
        body: JSON.stringify({ action: "reject", candidateId: candidate.id }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      await onRefresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not reject candidate."
      );
    } finally {
      setSaving("");
    }
  }, [candidate, decisionId, onRefresh]);

  const adopt = useCallback(async () => {
    if (!candidate) {
      return;
    }
    setSaving("adopt");
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
          <p>It is not part of My Principles until you adopt it.</p>
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
          onClick={generate}
          type="button"
        >
          Generate candidate principle
        </button>
      ) : null}
      {!candidate && (!hasCouncil || !hasJudgment) ? (
        <p className={baseStyles.muted}>
          Council + your saved judgment are required before AI can propose a
          candidate principle.
        </p>
      ) : null}

      {candidate ? (
        <div className={styles.candidateBody} data-testid="candidate-principle">
          {editing && candidate.status === "pending" ? (
            <form className={baseStyles.form} onSubmit={saveEdit}>
              <div className={baseStyles.field}>
                <label htmlFor="candidate-statement">
                  Candidate principle statement
                </label>
                <textarea
                  defaultValue={candidate.statement}
                  id="candidate-statement"
                  name="statement"
                  required
                />
              </div>
              <div className={baseStyles.field}>
                <label htmlFor="candidate-rationale">Candidate rationale</label>
                <textarea
                  defaultValue={candidate.rationale}
                  id="candidate-rationale"
                  name="rationale"
                  required
                />
              </div>
              <div className={styles.candidateActions}>
                <button
                  className={baseStyles.primaryButton}
                  disabled={saving === "edit"}
                  type="submit"
                >
                  Save edit
                </button>
                <button
                  className={baseStyles.secondaryButton}
                  onClick={cancelEdit}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
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
                onClick={adopt}
                type="button"
              >
                <Check size={14} /> Adopt
              </button>
              <button
                className={baseStyles.secondaryButton}
                onClick={startEdit}
                type="button"
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                className={baseStyles.secondaryButton}
                disabled={saving === "reject"}
                onClick={reject}
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
              onClick={generate}
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      setSaving(true);
      try {
        await fetchJson(`/api/decisions/${decisionId}/principles`, {
          body: JSON.stringify({
            description:
              String(form.get("description") ?? "").trim() || undefined,
            statement: String(form.get("statement") ?? "").trim(),
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        event.currentTarget.reset();
        await onRefresh();
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Could not save principle."
        );
      } finally {
        setSaving(false);
      }
    },
    [decisionId, onRefresh]
  );

  return (
    <article className={baseStyles.card}>
      <div className={baseStyles.cardHeader}>
        <h2>Principles</h2>
        <span>{principles.length} adopted</span>
      </div>
      {principles.map((item) => (
        <div className={baseStyles.principleItem} key={item.id}>
          <strong>{item.statement}</strong>
          {item.description ? <p>{item.description}</p> : null}
          <p>
            Revision {item.revision} · {item.relation}
          </p>
        </div>
      ))}
      {error ? <div className={baseStyles.error}>{error}</div> : null}
      <div className={styles.manualPrinciple}>
        <span>Write your own principle instead</span>
        <form className={baseStyles.form} onSubmit={submit}>
          <div className={baseStyles.field}>
            <label htmlFor="principle-statement">Keep a principle</label>
            <input id="principle-statement" name="statement" required />
          </div>
          <div className={baseStyles.field}>
            <label htmlFor="principle-description">Why it matters</label>
            <textarea id="principle-description" name="description" />
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      setSaving(true);
      try {
        await fetchJson(`/api/decisions/${decisionId}/outcome`, {
          body: JSON.stringify({
            lessons: String(form.get("lessons") ?? "").trim() || undefined,
            result: String(form.get("result") ?? "").trim(),
            verdict: String(form.get("verdict") ?? "too_early"),
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        event.currentTarget.reset();
        await onRefresh();
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Could not save outcome."
        );
      } finally {
        setSaving(false);
      }
    },
    [decisionId, onRefresh]
  );

  return (
    <article className={baseStyles.card}>
      <div className={baseStyles.cardHeader}>
        <h2>Outcome</h2>
        <span>{outcomes.length ? "Reviewed" : "Not reviewed"}</span>
      </div>
      {outcomes.map((item) => (
        <div className={baseStyles.outcomeItem} key={item.id}>
          <strong>{item.result}</strong>
          {item.lessons ? <p>{item.lessons}</p> : null}
          <p>Verdict: {item.verdict.replace("_", " ")}</p>
        </div>
      ))}
      {error ? <div className={baseStyles.error}>{error}</div> : null}
      <form className={baseStyles.form} onSubmit={submit}>
        <div className={baseStyles.field}>
          <label htmlFor="outcome-result">What happened?</label>
          <textarea id="outcome-result" name="result" required />
        </div>
        <div className={baseStyles.field}>
          <label htmlFor="outcome-verdict">Verdict</label>
          <select defaultValue="too_early" id="outcome-verdict" name="verdict">
            <option value="too_early">Too early</option>
            <option value="positive">Positive</option>
            <option value="mixed">Mixed</option>
            <option value="negative">Negative</option>
          </select>
        </div>
        <div className={baseStyles.field}>
          <label htmlFor="outcome-lessons">What did you learn?</label>
          <textarea id="outcome-lessons" name="lessons" />
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
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [livePlan, setLivePlan] = useState<CouncilPlan | null>(null);
  const [liveBrief, setLiveBrief] = useState<CouncilBrief | null>(null);
  const [liveEvidence, setLiveEvidence] = useState<RetrievedReference[]>([]);
  const [thinkerIds, setThinkerIds] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const payload = await fetchJson<DecisionDetailPayload>(
      `/api/decisions/${decisionId}`
    );
    setDetail(payload);
    return payload;
  }, [decisionId]);

  useEffect(() => {
    refresh()
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error ? caught.message : "Could not load decision."
        )
      )
      .finally(() => setLoading(false));
  }, [refresh]);

  const toggleThinker = useCallback((id: string) => {
    setThinkerIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }, []);

  const runCouncil = useCallback(async () => {
    if (!detail || busy) {
      return;
    }
    setBusy(true);
    setError("");
    setStatus("Starting Council…");
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
          thinkerIds,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok || !response.body) {
        throw new Error("Council endpoint did not respond.");
      }
      await readNdjson(response.body.getReader(), (event) => {
        if (event.type === "status" && typeof event.message === "string") {
          setStatus(event.message);
        } else if (event.type === "plan") {
          finalPlan = asPlan(event.plan);
          setLivePlan(finalPlan);
        } else if (event.type === "references") {
          finalEvidence = asEvidence(event.references);
          setLiveEvidence(finalEvidence);
        } else if (event.type === "answer") {
          finalAnswer = typeof event.answer === "string" ? event.answer : "";
          finalBrief = asBrief(event.brief);
          finalPlan = asPlan(event.plan) || finalPlan;
          setLiveBrief(finalBrief);
          setLivePlan(finalPlan);
        } else if (
          event.type === "error" &&
          typeof event.message === "string"
        ) {
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
      await refresh();
      setLivePlan(null);
      setLiveBrief(null);
      setLiveEvidence([]);
      setStatus("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Council failed.");
    } finally {
      setBusy(false);
    }
  }, [busy, decisionId, detail, refresh, thinkerIds]);

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

  const plan = livePlan || asPlan(detail.decision.councilPlan);
  const brief = liveBrief || asBrief(detail.decision.councilBrief);
  const persistedEvidence = asEvidence(detail.decision.evidence);
  const evidence = liveEvidence.length ? liveEvidence : persistedEvidence;
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
              disabled={busy}
              onClick={runCouncil}
              type="button"
            >
              <Sparkles size={15} />
              {busy ? "Council thinking…" : "Run Council"}
            </button>
          </div>
        </div>
        {error ? <div className={baseStyles.error}>{error}</div> : null}
        {status ? <p className={councilStyles.statusText}>{status}</p> : null}

        <div className={baseStyles.detailGrid}>
          <article className={baseStyles.card}>
            <div className={baseStyles.cardHeader}>
              <h2>Context</h2>
              <span>Original messy input</span>
            </div>
            <p className={baseStyles.bodyText}>
              {detail.decision.context || "No context saved."}
            </p>
            <CustomizeCouncil
              disabled={busy}
              onToggle={toggleThinker}
              selected={thinkerIds}
            />
            {plan ? <Plan plan={plan} /> : null}
          </article>

          <article className={baseStyles.card}>
            <div className={baseStyles.cardHeader}>
              <h2>Evidence</h2>
              <span>{evidence.length} chunks</span>
            </div>
            {evidence.length ? (
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
                    {item.text ? <p>{item.text.slice(0, 900)}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className={baseStyles.muted}>No evidence retrieved yet.</p>
            )}
          </article>
        </div>

        <article className={`${baseStyles.card} ${styles.briefCard}`}>
          <div className={baseStyles.cardHeader}>
            <h2>Council brief</h2>
            <span>{brief ? "Grounded" : "Not run"}</span>
          </div>
          {brief ? <Brief brief={brief} /> : null}
          {!brief && detail.decision.councilAnalysis ? (
            <div className={baseStyles.analysis}>
              {detail.decision.councilAnalysis}
            </div>
          ) : null}
        </article>

        <JudgmentStage
          brief={brief}
          decisionId={decisionId}
          hasCouncil={hasCouncil}
          judgments={detail.judgments}
          onRefresh={refresh}
        />
        <CandidateStage
          candidate={detail.decision.principleCandidate}
          decisionId={decisionId}
          hasCouncil={hasCouncil}
          hasJudgment={hasJudgment}
          onRefresh={refresh}
        />

        <div className={baseStyles.detailGrid}>
          <ManualPrinciples
            decisionId={decisionId}
            onRefresh={refresh}
            principles={detail.principles}
          />
          <OutcomePanel
            decisionId={decisionId}
            onRefresh={refresh}
            outcomes={detail.outcomes}
          />
        </div>
      </section>
    </WorkspaceShell>
  );
}
