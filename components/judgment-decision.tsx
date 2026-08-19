"use client";

import { ArrowLeft, Check, Pencil, Sparkles, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
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
  id: string;
  title: string;
  question: string;
  context: string | null;
  councilAnalysis: string | null;
  councilBrief: CouncilBrief | null;
  councilPlan: CouncilPlan | null;
  evidence: unknown;
  principleCandidate: PrincipleCandidate | null;
  status: DecisionStatus;
  createdAt: string;
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
          {claims.map((claim, index) => (
            <ClaimView claim={claim} key={`${title}-${index}-${claim.text}`} />
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
            {brief.factsVsAssumptions.map((item, index) => (
              <ClaimView
                claim={item}
                key={`${item.status}-${index}-${item.text}`}
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
              onChange={() => onToggle(thinker.id)}
              type="checkbox"
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

function legacyConfidence(value: JudgmentRecord["confidence"]) {
  if (value === "low") {
    return "Low confidence";
  }
  if (value === "high") {
    return "High confidence";
  }
  return value === "medium" ? "Medium confidence" : "Confidence not set";
}

export function JudgmentDecisionWorkspace({ decisionId }: { decisionId: string }) {
  const [detail, setDetail] = useState<DecisionDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [candidateError, setCandidateError] = useState("");
  const [councilBusy, setCouncilBusy] = useState(false);
  const [councilStatus, setCouncilStatus] = useState("");
  const [livePlan, setLivePlan] = useState<CouncilPlan | null>(null);
  const [liveBrief, setLiveBrief] = useState<CouncilBrief | null>(null);
  const [liveEvidence, setLiveEvidence] = useState<RetrievedReference[]>([]);
  const [customThinkerIds, setCustomThinkerIds] = useState<string[]>([]);
  const [judgmentSummary, setJudgmentSummary] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [rationale, setRationale] = useState("");
  const [confidencePercent, setConfidencePercent] = useState(65);
  const [principleStatement, setPrincipleStatement] = useState("");
  const [principleDescription, setPrincipleDescription] = useState("");
  const [outcomeResult, setOutcomeResult] = useState("");
  const [outcomeLessons, setOutcomeLessons] = useState("");
  const [outcomeVerdict, setOutcomeVerdict] = useState<
    "positive" | "mixed" | "negative" | "too_early"
  >("too_early");
  const [saving, setSaving] = useState("");
  const [editingCandidate, setEditingCandidate] = useState(false);
  const [candidateStatement, setCandidateStatement] = useState("");
  const [candidateRationale, setCandidateRationale] = useState("");

  async function loadDetail() {
    const payload = await fetchJson<DecisionDetailPayload>(
      `/api/decisions/${decisionId}`
    );
    setDetail(payload);
    return payload;
  }

  useEffect(() => {
    loadDetail()
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error ? caught.message : "Could not load decision."
        )
      )
      .finally(() => setLoading(false));
  }, [decisionId]);

  function toggleThinker(id: string) {
    setCustomThinkerIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  async function runCouncil() {
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
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) {
          break;
        }
        buffer += decoder.decode(chunk.value, { stream: true });
        const rows = buffer.split("\n");
        buffer = rows.pop() ?? "";
        for (const row of rows) {
          if (!row.trim()) {
            continue;
          }
          const event = JSON.parse(row) as FeedEvent;
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
        }
      }

      if (streamError && !finalAnswer) {
        throw new Error(streamError);
      }
      if (!finalPlan) {
        throw new Error("Council could not produce a reasoning plan.");
      }

      await fetchJson(`/api/decisions/${decisionId}/analysis`, {
        body: JSON.stringify({
          councilAnalysis:
            finalAnswer || "No evidence retrieved for a grounded Council brief.",
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
  }

  async function generateCandidate() {
    setCandidateError("");
    setSaving("candidate");
    try {
      await fetchJson(`/api/decisions/${decisionId}/principle-candidate`, {
        method: "POST",
      });
      await loadDetail();
      setEditingCandidate(false);
    } catch (caught) {
      setCandidateError(
        caught instanceof Error
          ? caught.message
          : "Could not generate a candidate principle."
      );
    } finally {
      setSaving("");
    }
  }

  async function submitJudgment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("judgment");
    setError("");
    setCandidateError("");
    const hadCouncil = Boolean(
      detail?.decision.councilBrief || detail?.decision.councilAnalysis
    );
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
      await loadDetail();
      if (hadCouncil) {
        await generateCandidate();
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save judgment."
      );
    } finally {
      setSaving("");
    }
  }

  async function saveCandidateEdit() {
    const candidate = detail?.decision.principleCandidate;
    if (!candidate) {
      return;
    }
    setSaving("candidate-edit");
    setCandidateError("");
    try {
      await fetchJson(`/api/decisions/${decisionId}/principle-candidate`, {
        body: JSON.stringify({
          action: "edit",
          candidateId: candidate.id,
          rationale: candidateRationale,
          statement: candidateStatement,
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      await loadDetail();
      setEditingCandidate(false);
    } catch (caught) {
      setCandidateError(
        caught instanceof Error ? caught.message : "Could not edit candidate."
      );
    } finally {
      setSaving("");
    }
  }

  async function rejectCandidate() {
    const candidate = detail?.decision.principleCandidate;
    if (!candidate) {
      return;
    }
    setSaving("candidate-reject");
    setCandidateError("");
    try {
      await fetchJson(`/api/decisions/${decisionId}/principle-candidate`, {
        body: JSON.stringify({ action: "reject", candidateId: candidate.id }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      await loadDetail();
      setEditingCandidate(false);
    } catch (caught) {
      setCandidateError(
        caught instanceof Error ? caught.message : "Could not reject candidate."
      );
    } finally {
      setSaving("");
    }
  }

  async function adoptCandidate() {
    const candidate = detail?.decision.principleCandidate;
    if (!candidate) {
      return;
    }
    setSaving("candidate-adopt");
    setCandidateError("");
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
      await loadDetail();
      setEditingCandidate(false);
    } catch (caught) {
      setCandidateError(
        caught instanceof Error ? caught.message : "Could not adopt candidate."
      );
    } finally {
      setSaving("");
    }
  }

  async function submitPrinciple(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("principle");
    setError("");
    try {
      await fetchJson(`/api/decisions/${decisionId}/principles`, {
        body: JSON.stringify({
          description: principleDescription || undefined,
          statement: principleStatement,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      setPrincipleStatement("");
      setPrincipleDescription("");
      await loadDetail();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save principle."
      );
    } finally {
      setSaving("");
    }
  }

  async function submitOutcome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("outcome");
    setError("");
    try {
      await fetchJson(`/api/decisions/${decisionId}/outcome`, {
        body: JSON.stringify({
          lessons: outcomeLessons || undefined,
          result: outcomeResult,
          verdict: outcomeVerdict,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      setOutcomeResult("");
      setOutcomeLessons("");
      await loadDetail();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save outcome."
      );
    } finally {
      setSaving("");
    }
  }

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
  const suggestedStarts = brief
    ? [...brief.nextMoves, ...brief.crux, ...brief.agreement]
        .map((item) => item.text)
        .filter((text, index, all) => all.indexOf(text) === index)
        .slice(0, 3)
    : [];

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
                hasCouncil ? baseStyles.secondaryButton : baseStyles.primaryButton
              }
              disabled={councilBusy}
              onClick={() => runCouncil().catch(() => undefined)}
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
                <span>{plan ? `${plan.lenses.length} lenses` : "Auto by default"}</span>
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
                        <span className={councilStyles.evidenceKey}>{item.key}</span>
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
            <span>{councilBusy ? "Running" : brief ? "Grounded" : "Not run"}</span>
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

          {detail.judgments.length ? (
            <div className={styles.judgmentHistory}>
              {detail.judgments.map((item) => (
                <div className={styles.judgmentRecord} key={item.id}>
                  <strong>{item.summary}</strong>
                  {item.selectedOption ? <p>Choice: {item.selectedOption}</p> : null}
                  {item.rationale ? <p>{item.rationale}</p> : null}
                  <span>
                    {item.confidencePercent !== null
                      ? `${item.confidencePercent}% confidence`
                      : legacyConfidence(item.confidence)}
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
                    onClick={() => setJudgmentSummary(text)}
                    type="button"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <form className={baseStyles.form} onSubmit={submitJudgment}>
            <div className={baseStyles.field}>
              <label htmlFor="judgment-summary">What did you decide?</label>
              <textarea
                id="judgment-summary"
                onChange={(event) => setJudgmentSummary(event.target.value)}
                placeholder="I will continue the partnership, but only after a direct conversation with explicit behavioral expectations."
                required
                value={judgmentSummary}
              />
            </div>
            <div className={baseStyles.field}>
              <label htmlFor="selected-option">Selected option</label>
              <input
                id="selected-option"
                onChange={(event) => setSelectedOption(event.target.value)}
                placeholder="Continue with explicit conditions"
                value={selectedOption}
              />
            </div>
            <div className={baseStyles.field}>
              <label htmlFor="judgment-rationale">Rationale</label>
              <textarea
                id="judgment-rationale"
                onChange={(event) => setRationale(event.target.value)}
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
                onChange={(event) =>
                  setConfidencePercent(Number(event.target.value))
                }
                type="range"
                value={confidencePercent}
              />
              <input
                id="judgment-confidence"
                max={100}
                min={0}
                onChange={(event) =>
                  setConfidencePercent(
                    Math.min(100, Math.max(0, Number(event.target.value)))
                  )
                }
                type="number"
                value={confidencePercent}
              />
            </div>
            <button
              className={baseStyles.primaryButton}
              disabled={saving === "judgment" || !judgmentSummary.trim()}
              type="submit"
            >
              Save judgment
            </button>
          </form>
        </article>

        <article className={`${baseStyles.card} ${styles.candidateStage}`}>
          <div className={styles.stageHeader}>
            <div>
              <span className={styles.step}>AI proposal · requires your consent</span>
              <h2>Candidate principle</h2>
              <p>
                A reusable rule extracted from your judgment. It is not part of
                My Principles until you adopt it.
              </p>
            </div>
            {candidate ? (
              <span className={`${styles.candidateStatus} ${styles[candidate.status]}`}>
                {candidate.status}
              </span>
            ) : null}
          </div>

          {candidateError ? (
            <div className={baseStyles.error}>{candidateError}</div>
          ) : null}

          {!candidate && hasCouncil && hasJudgment ? (
            <button
              className={baseStyles.secondaryButton}
              disabled={saving === "candidate"}
              onClick={() => generateCandidate().catch(() => undefined)}
              type="button"
            >
              {saving === "candidate" ? "Extracting…" : "Generate candidate principle"}
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
              {editingCandidate && candidate.status === "pending" ? (
                <div className={baseStyles.form}>
                  <div className={baseStyles.field}>
                    <label htmlFor="candidate-statement">
                      Candidate principle statement
                    </label>
                    <textarea
                      id="candidate-statement"
                      onChange={(event) =>
                        setCandidateStatement(event.target.value)
                      }
                      value={candidateStatement}
                    />
                  </div>
                  <div className={baseStyles.field}>
                    <label htmlFor="candidate-rationale">Candidate rationale</label>
                    <textarea
                      id="candidate-rationale"
                      onChange={(event) =>
                        setCandidateRationale(event.target.value)
                      }
                      value={candidateRationale}
                    />
                  </div>
                  <div className={styles.candidateActions}>
                    <button
                      className={baseStyles.primaryButton}
                      disabled={saving === "candidate-edit"}
                      onClick={() => saveCandidateEdit().catch(() => undefined)}
                      type="button"
                    >
                      Save edit
                    </button>
                    <button
                      className={baseStyles.secondaryButton}
                      onClick={() => setEditingCandidate(false)}
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

              {!editingCandidate && candidate.status === "pending" ? (
                <div className={styles.candidateActions}>
                  <button
                    className={baseStyles.primaryButton}
                    disabled={saving === "candidate-adopt"}
                    onClick={() => adoptCandidate().catch(() => undefined)}
                    type="button"
                  >
                    <Check size={14} /> Adopt
                  </button>
                  <button
                    className={baseStyles.secondaryButton}
                    onClick={() => {
                      setCandidateStatement(candidate.statement);
                      setCandidateRationale(candidate.rationale);
                      setEditingCandidate(true);
                    }}
                    type="button"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    className={baseStyles.secondaryButton}
                    disabled={saving === "candidate-reject"}
                    onClick={() => rejectCandidate().catch(() => undefined)}
                    type="button"
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              ) : null}

              {candidate.status === "rejected" ? (
                <button
                  className={baseStyles.secondaryButton}
                  disabled={saving === "candidate"}
                  onClick={() => generateCandidate().catch(() => undefined)}
                  type="button"
                >
                  Generate another candidate
                </button>
              ) : null}
            </div>
          ) : null}
        </article>

        <div className={baseStyles.detailGrid}>
          <div className={baseStyles.stack}>
            <article className={baseStyles.card}>
              <div className={baseStyles.cardHeader}>
                <h2>Principles</h2>
                <span>{detail.principles.length} adopted</span>
              </div>
              <div className={baseStyles.principleList}>
                {detail.principles.map((item) => (
                  <div className={baseStyles.principleItem} key={item.id}>
                    <strong>{item.statement}</strong>
                    {item.description ? <p>{item.description}</p> : null}
                    <p>
                      Revision {item.revision} · {item.relation || "adopted"}
                    </p>
                  </div>
                ))}
              </div>
              <div className={styles.manualPrinciple}>
                <span>Write your own principle instead</span>
                <form className={baseStyles.form} onSubmit={submitPrinciple}>
                  <div className={baseStyles.field}>
                    <label htmlFor="principle-statement">Keep a principle</label>
                    <input
                      id="principle-statement"
                      onChange={(event) =>
                        setPrincipleStatement(event.target.value)
                      }
                      placeholder="Avoid partners who consistently evade hard conversations."
                      required
                      value={principleStatement}
                    />
                  </div>
                  <div className={baseStyles.field}>
                    <label htmlFor="principle-description">Why it matters</label>
                    <textarea
                      id="principle-description"
                      onChange={(event) =>
                        setPrincipleDescription(event.target.value)
                      }
                      placeholder="Optional nuance, boundary conditions, exceptions…"
                      value={principleDescription}
                    />
                  </div>
                  <button
                    className={baseStyles.secondaryButton}
                    disabled={saving === "principle"}
                    type="submit"
                  >
                    Adopt principle
                  </button>
                </form>
              </div>
            </article>
          </div>

          <div className={baseStyles.stack}>
            <article className={baseStyles.card}>
              <div className={baseStyles.cardHeader}>
                <h2>Outcome</h2>
                <span>{detail.outcomes.length ? "Reviewed" : "Not reviewed"}</span>
              </div>
              <div className={baseStyles.outcomeList}>
                {detail.outcomes.map((item) => (
                  <div className={baseStyles.outcomeItem} key={item.id}>
                    <strong>{item.result}</strong>
                    {item.lessons ? <p>{item.lessons}</p> : null}
                    <p>Verdict: {item.verdict.replace("_", " ")}</p>
                  </div>
                ))}
              </div>
              <form className={baseStyles.form} onSubmit={submitOutcome}>
                <div className={baseStyles.field}>
                  <label htmlFor="outcome-result">What happened?</label>
                  <textarea
                    id="outcome-result"
                    onChange={(event) => setOutcomeResult(event.target.value)}
                    placeholder="Review the decision when reality gives you enough signal."
                    required
                    value={outcomeResult}
                  />
                </div>
                <div className={baseStyles.field}>
                  <label htmlFor="outcome-verdict">Verdict</label>
                  <select
                    id="outcome-verdict"
                    onChange={(event) =>
                      setOutcomeVerdict(
                        event.target.value as
                          | "positive"
                          | "mixed"
                          | "negative"
                          | "too_early"
                      )
                    }
                    value={outcomeVerdict}
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
                    onChange={(event) => setOutcomeLessons(event.target.value)}
                    placeholder="What should future-you update?"
                    value={outcomeLessons}
                  />
                </div>
                <button
                  className={baseStyles.secondaryButton}
                  disabled={saving === "outcome"}
                  type="submit"
                >
                  Save outcome
                </button>
              </form>
            </article>
          </div>
        </div>
      </section>
    </WorkspaceShell>
  );
}
