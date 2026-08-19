"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Compass,
  GitBranch,
  ListChecks,
  Network,
  Plus,
  Scale,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { THINKERS } from "@/lib/principles-graph";
import styles from "./decision-workspace.module.css";

type WorkspaceView =
  | "ask"
  | "decisions"
  | "principles"
  | "explore"
  | "decision";
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
  evidence: unknown;
  status: DecisionStatus;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
  reviewAt: string | null;
  reviewedAt: string | null;
};

type JudgmentRecord = {
  id: string;
  summary: string;
  selectedOption: string | null;
  rationale: string | null;
  confidence: "low" | "medium" | "high" | null;
  createdAt: string;
};

type PrincipleRecord = {
  id: string;
  statement: string;
  description: string | null;
  revision: number;
  status: "active" | "revised" | "retired";
  relation?: "suggested" | "applied" | "challenged" | "created" | "adopted";
  sourceDecisionId?: string | null;
  createdAt: string;
  updatedAt?: string;
};

type OutcomeRecord = {
  id: string;
  result: string;
  lessons: string | null;
  verdict: "positive" | "mixed" | "negative" | "too_early";
  createdAt: string;
};

type DecisionDetailPayload = {
  decision: DecisionRecord;
  judgments: JudgmentRecord[];
  principles: PrincipleRecord[];
  outcomes: OutcomeRecord[];
};

type FeedEvent = Record<string, unknown> & { type?: string };

const EXAMPLES = [
  "Cofounder của tôi rất giỏi nhưng né conflict. Tôi đang cân nhắc có nên tiếp tục partnership không.",
  "Should we raise now or keep extending runway for another six months?",
  "Tôi có hai ứng viên sales leader. Một người senior nhưng đắt, một người ít kinh nghiệm nhưng rất hungry.",
];

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

function asEvidence(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null
  );
}

function firstText(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
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
  const days = Math.round(delta / 86_400_000);
  if (Math.abs(days) < 14) {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
      days,
      "day"
    );
  }
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year:
      new Date(value).getFullYear() === new Date().getFullYear()
        ? undefined
        : "numeric",
  }).format(new Date(value));
}

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <a
      className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
      href={href}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

export function DecisionWorkspace({
  initialView,
  decisionId,
}: {
  initialView: WorkspaceView;
  decisionId?: string;
}) {
  const title =
    initialView === "ask"
      ? "Ask"
      : initialView === "decisions" || initialView === "decision"
        ? "Decisions"
        : initialView === "principles"
          ? "My Principles"
          : "Explore";

  return (
    <main className={styles.app}>
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="/">
          <span aria-hidden="true" className={styles.brandMark} />
          <span>PRINCIPLES</span>
        </a>
        <nav aria-label="Main navigation" className={styles.nav}>
          <NavLink
            active={initialView === "ask"}
            href="/"
            icon={<Sparkles size={16} />}
            label="Ask"
          />
          <NavLink
            active={initialView === "decisions" || initialView === "decision"}
            href="/decisions"
            icon={<ListChecks size={16} />}
            label="Decisions"
          />
          <NavLink
            active={initialView === "principles"}
            href="/principles"
            icon={<GitBranch size={16} />}
            label="My Principles"
          />
          <NavLink
            active={initialView === "explore"}
            href="/explore"
            icon={<Compass size={16} />}
            label="Explore"
          />
        </nav>
        <div className={styles.sidebarFooter}>
          <strong>Your Workspace</strong>
          Private decisions · persistent memory
        </div>
      </aside>

      <section className={styles.main}>
        <header className={styles.topbar}>
          <span className={styles.topbarTitle}>{title}</span>
          <span className={styles.topbarStatus}>
            <span className={styles.statusDot} /> PostgreSQL workspace
          </span>
        </header>
        <div className={styles.content}>
          {initialView === "ask" ? <AskView /> : null}
          {initialView === "decisions" ? <DecisionsView /> : null}
          {initialView === "decision" && decisionId ? (
            <DecisionDetailView decisionId={decisionId} />
          ) : null}
          {initialView === "principles" ? <PrinciplesView /> : null}
          {initialView === "explore" ? <ExploreView /> : null}
        </div>
      </section>

      <nav aria-label="Mobile navigation" className={styles.mobileNav}>
        <a href="/">Ask</a>
        <a href="/decisions">Decisions</a>
        <a href="/principles">Principles</a>
        <a href="/explore">Explore</a>
      </nav>
    </main>
  );
}

function AskView() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    if (input.trim().length < 3 || busy) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = await fetchJson<{ decision: DecisionRecord }>(
        "/api/decisions",
        {
          body: JSON.stringify({ input }),
          headers: { "content-type": "application/json" },
          method: "POST",
        }
      );
      window.location.assign(`/decisions/${payload.decision.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not create decision."
      );
      setBusy(false);
    }
  }

  return (
    <section className={styles.hero}>
      <span className={styles.eyebrow}>Decision workspace</span>
      <h1>What are you deciding?</h1>
      <p className={styles.heroLead}>
        Drop the messy version. Principles will turn it into a durable decision
        object you can explore, judge, revisit, and learn from.
      </p>
      <div className={styles.composer}>
        <textarea
          aria-label="What are you deciding?"
          onChange={(event) => setInput(event.target.value)}
          placeholder="Cofounder của tôi rất giỏi nhưng né conflict. Tôi đang cân nhắc có nên tiếp tục partnership không."
          value={input}
        />
        <div className={styles.composerFooter}>
          <span className={styles.composerHint}>
            No form. Context first — you can refine the judgment later.
          </span>
          <button
            className={styles.primaryButton}
            disabled={busy || input.trim().length < 3}
            onClick={() => create().catch(() => undefined)}
            type="button"
          >
            {busy ? "Creating…" : "Create decision"}
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
      {error ? <div className={styles.error}>{error}</div> : null}
      <div className={styles.examples}>
        {EXAMPLES.map((example) => (
          <button
            className={styles.exampleButton}
            key={example}
            onClick={() => setInput(example)}
            type="button"
          >
            {example.length > 70 ? `${example.slice(0, 70)}…` : example}
          </button>
        ))}
      </div>
    </section>
  );
}

function DecisionsView() {
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchJson<{ decisions: DecisionRecord[] }>("/api/decisions")
      .then((payload) => setDecisions(payload.decisions))
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error ? caught.message : "Could not load decisions."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <div className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Your decision memory</span>
          <h1>Decisions</h1>
          <p>Real decisions, ordered by the last time your thinking changed.</p>
        </div>
        <a className={styles.primaryButton} href="/">
          <Plus size={15} /> New decision
        </a>
      </div>
      {loading ? (
        <div className={styles.loading}>Loading decisions…</div>
      ) : null}
      {error ? <div className={styles.error}>{error}</div> : null}
      {!loading && !error && decisions.length === 0 ? (
        <div className={styles.empty}>
          <strong>No decisions yet.</strong>
          Start with the problem as it exists in your head — messy is fine.
        </div>
      ) : null}
      <div className={styles.list}>
        {decisions.map((item) => (
          <a
            className={styles.decisionRow}
            href={`/decisions/${item.id}`}
            key={item.id}
          >
            <span className={styles.decisionTitle}>
              <strong>{item.question}</strong>
              <span>{item.context || item.title}</span>
            </span>
            <span className={styles.status}>{STATUS_LABELS[item.status]}</span>
            <span className={styles.time}>{relativeTime(item.updatedAt)}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function PrinciplesView() {
  const [principles, setPrinciples] = useState<PrincipleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchJson<{ principles: PrincipleRecord[] }>("/api/principles")
      .then((payload) => setPrinciples(payload.principles))
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load principles."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <div className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>What you chose to keep</span>
          <h1>My Principles</h1>
          <p>
            Principles adopted from your own decisions — not a fake library
            count.
          </p>
        </div>
      </div>
      {loading ? (
        <div className={styles.loading}>Loading principles…</div>
      ) : null}
      {error ? <div className={styles.error}>{error}</div> : null}
      {!loading && !error && principles.length === 0 ? (
        <div className={styles.empty}>
          <strong>No adopted principles yet.</strong>
          Open a decision and capture a principle worth reusing.
        </div>
      ) : null}
      <div className={styles.principleList}>
        {principles.map((item) => (
          <div className={styles.principleItem} key={item.id}>
            <strong>{item.statement}</strong>
            {item.description ? <p>{item.description}</p> : null}
            <p>
              Revision {item.revision} · {item.status}
              {item.sourceDecisionId ? " · linked to a decision" : ""}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExploreView() {
  const conceptNames = Array.from(
    new Set(
      THINKERS.flatMap((thinker) =>
        thinker.principles.map((item) => item.title)
      )
    )
  ).slice(0, 12);

  return (
    <section>
      <div className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Knowledge and lenses</span>
          <h1>Explore</h1>
          <p>Brain, Graph, Thinkers, Concepts, and Library now live here.</p>
        </div>
      </div>
      <div className={styles.exploreGrid}>
        <article className={styles.exploreCard}>
          <Brain size={20} />
          <h2>Brain</h2>
          <p>
            Browse the knowledge system without making it the primary product
            mental model.
          </p>
        </article>
        <article className={styles.exploreCard}>
          <Network size={20} />
          <h2>Graph</h2>
          <p>
            See relationships among thinkers, principles, concepts, and
            questions.
          </p>
        </article>
        <article className={`${styles.exploreCard} ${styles.exploreWide}`}>
          <Users size={20} />
          <h2>Thinkers</h2>
          <p>
            The existing thinker lenses remain available as supporting context
            for decisions.
          </p>
          <div className={styles.thinkerGrid}>
            {THINKERS.map((thinker) => (
              <div className={styles.thinker} key={thinker.id}>
                <strong>{thinker.name}</strong>
                <span>{thinker.lens}</span>
              </div>
            ))}
          </div>
        </article>
        <article className={styles.exploreCard}>
          <Scale size={20} />
          <h2>Concepts</h2>
          <p>{conceptNames.join(" · ")}</p>
        </article>
        <article className={styles.exploreCard}>
          <BookOpen size={20} />
          <h2>Library</h2>
          <p>
            Evidence is attached to decisions. Source exploration remains
            secondary to the decision itself.
          </p>
        </article>
      </div>
    </section>
  );
}

function DecisionDetailView({ decisionId }: { decisionId: string }) {
  const [detail, setDetail] = useState<DecisionDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [councilBusy, setCouncilBusy] = useState(false);
  const [liveAnalysis, setLiveAnalysis] = useState("");
  const [judgmentSummary, setJudgmentSummary] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [rationale, setRationale] = useState("");
  const [confidence, setConfidence] = useState<"low" | "medium" | "high">(
    "medium"
  );
  const [principleStatement, setPrincipleStatement] = useState("");
  const [principleDescription, setPrincipleDescription] = useState("");
  const [outcomeResult, setOutcomeResult] = useState("");
  const [outcomeLessons, setOutcomeLessons] = useState("");
  const [outcomeVerdict, setOutcomeVerdict] = useState<
    "positive" | "mixed" | "negative" | "too_early"
  >("too_early");
  const [saving, setSaving] = useState("");

  async function loadDetail() {
    const payload = await fetchJson<DecisionDetailPayload>(
      `/api/decisions/${decisionId}`
    );
    setDetail(payload);
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

  async function runCouncil() {
    if (!detail || councilBusy) {
      return;
    }
    setCouncilBusy(true);
    setError("");
    setLiveAnalysis("");
    let tokens = "";
    let streamError = "";
    let references: Record<string, unknown>[] = [];

    try {
      const response = await fetch("/api/council", {
        body: JSON.stringify({
          question: detail.decision.question,
          thinkerIds: ["dalio", "munger", "buffett"],
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
          if (event.type === "token" && typeof event.token === "string") {
            tokens += event.token;
            setLiveAnalysis(tokens);
          }
          if (event.type === "references" && Array.isArray(event.references)) {
            references = event.references.filter(
              (item): item is Record<string, unknown> =>
                typeof item === "object" && item !== null
            );
          }
          if (event.type === "error" && typeof event.message === "string") {
            streamError = event.message;
            setLiveAnalysis(streamError);
          }
        }
      }

      const councilAnalysis =
        tokens.trim() || streamError || "No evidence retrieved.";
      await fetchJson(`/api/decisions/${decisionId}/analysis`, {
        body: JSON.stringify({ councilAnalysis, evidence: references }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      await loadDetail();
      setLiveAnalysis("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Council failed.");
    } finally {
      setCouncilBusy(false);
    }
  }

  async function submitJudgment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("judgment");
    setError("");
    try {
      await fetchJson(`/api/decisions/${decisionId}/judgment`, {
        body: JSON.stringify({
          confidence,
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
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save judgment."
      );
    } finally {
      setSaving("");
    }
  }

  async function submitPrinciple(event: React.FormEvent<HTMLFormElement>) {
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

  async function submitOutcome(event: React.FormEvent<HTMLFormElement>) {
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
    return <div className={styles.loading}>Loading decision…</div>;
  }
  if (!detail) {
    return <div className={styles.error}>{error || "Decision not found."}</div>;
  }

  const evidence = asEvidence(detail.decision.evidence);
  const analysis = liveAnalysis || detail.decision.councilAnalysis;

  return (
    <section>
      <a className={styles.backLink} href="/decisions">
        <ArrowLeft size={14} /> All decisions
      </a>
      <div className={styles.detailHeader}>
        <div>
          <span className={styles.eyebrow}>Decision</span>
          <h1>{detail.decision.question}</h1>
          <div className={styles.detailMeta}>
            <span className={styles.status}>
              {STATUS_LABELS[detail.decision.status]}
            </span>
            <span className={styles.time}>
              Updated {relativeTime(detail.decision.updatedAt)}
            </span>
          </div>
        </div>
        <button
          className={styles.primaryButton}
          disabled={councilBusy}
          onClick={() => runCouncil().catch(() => undefined)}
          type="button"
        >
          <Sparkles size={15} />{" "}
          {councilBusy ? "Council thinking…" : "Think with Council"}
        </button>
      </div>
      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.detailGrid}>
        <div className={styles.stack}>
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Context</h2>
              <span>Original messy input</span>
            </div>
            <p className={styles.bodyText}>
              {detail.decision.context || "No context saved."}
            </p>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Council analysis</h2>
              <span>
                {councilBusy ? "Running" : analysis ? "Saved" : "Not run"}
              </span>
            </div>
            {analysis ? (
              <div className={styles.analysis}>{analysis}</div>
            ) : (
              <p className={styles.muted}>
                Run Council when you want evidence-grounded lenses. The result
                is saved on this decision.
              </p>
            )}
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Evidence</h2>
              <span>{evidence.length} sources</span>
            </div>
            {evidence.length === 0 ? (
              <p className={styles.muted}>No evidence retrieved yet.</p>
            ) : (
              <div className={styles.evidenceList}>
                {evidence.map((item, index) => {
                  const title = firstText(item, [
                    "title",
                    "document_name",
                    "source",
                    "name",
                  ]);
                  const excerpt = firstText(item, [
                    "content",
                    "text",
                    "chunk",
                    "excerpt",
                  ]);
                  return (
                    <div
                      className={styles.evidenceItem}
                      key={`${title}-${index}`}
                    >
                      <strong>{title || `Evidence ${index + 1}`}</strong>
                      {excerpt ? <p>{excerpt.slice(0, 500)}</p> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </div>

        <div className={styles.stack}>
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Judgment</h2>
              <span>{detail.judgments.length ? "Decided" : "Your call"}</span>
            </div>
            <div className={styles.judgmentList}>
              {detail.judgments.map((item) => (
                <div className={styles.judgmentItem} key={item.id}>
                  <strong>{item.summary}</strong>
                  {item.selectedOption ? (
                    <p>Choice: {item.selectedOption}</p>
                  ) : null}
                  {item.rationale ? <p>{item.rationale}</p> : null}
                  <p>
                    {item.confidence
                      ? `${item.confidence} confidence`
                      : "Confidence not set"}
                  </p>
                </div>
              ))}
            </div>
            <form className={styles.form} onSubmit={submitJudgment}>
              <div className={styles.field}>
                <label htmlFor="judgment-summary">What did you decide?</label>
                <textarea
                  id="judgment-summary"
                  onChange={(event) => setJudgmentSummary(event.target.value)}
                  placeholder="I will continue the partnership, with a 60-day conflict protocol test."
                  required
                  value={judgmentSummary}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="selected-option">Selected option</label>
                <input
                  id="selected-option"
                  onChange={(event) => setSelectedOption(event.target.value)}
                  placeholder="Continue with conditions"
                  value={selectedOption}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="judgment-rationale">Rationale</label>
                <textarea
                  id="judgment-rationale"
                  onChange={(event) => setRationale(event.target.value)}
                  placeholder="Why this choice survives the strongest counterargument…"
                  value={rationale}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="judgment-confidence">Confidence</label>
                <select
                  id="judgment-confidence"
                  onChange={(event) =>
                    setConfidence(
                      event.target.value as "low" | "medium" | "high"
                    )
                  }
                  value={confidence}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <button
                className={styles.secondaryButton}
                disabled={saving === "judgment"}
                type="submit"
              >
                Save judgment
              </button>
            </form>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Principles</h2>
              <span>{detail.principles.length} adopted</span>
            </div>
            <div className={styles.principleList}>
              {detail.principles.map((item) => (
                <div className={styles.principleItem} key={item.id}>
                  <strong>{item.statement}</strong>
                  {item.description ? <p>{item.description}</p> : null}
                  <p>
                    Revision {item.revision} · {item.relation || "adopted"}
                  </p>
                </div>
              ))}
            </div>
            <form className={styles.form} onSubmit={submitPrinciple}>
              <div className={styles.field}>
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
              <div className={styles.field}>
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
                className={styles.secondaryButton}
                disabled={saving === "principle"}
                type="submit"
              >
                Adopt principle
              </button>
            </form>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Outcome</h2>
              <span>
                {detail.outcomes.length ? "Reviewed" : "Not reviewed"}
              </span>
            </div>
            <div className={styles.outcomeList}>
              {detail.outcomes.map((item) => (
                <div className={styles.outcomeItem} key={item.id}>
                  <strong>{item.result}</strong>
                  {item.lessons ? <p>{item.lessons}</p> : null}
                  <p>Verdict: {item.verdict.replace("_", " ")}</p>
                </div>
              ))}
            </div>
            <form className={styles.form} onSubmit={submitOutcome}>
              <div className={styles.field}>
                <label htmlFor="outcome-result">What happened?</label>
                <textarea
                  id="outcome-result"
                  onChange={(event) => setOutcomeResult(event.target.value)}
                  placeholder="Review the decision when reality gives you enough signal."
                  required
                  value={outcomeResult}
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
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
              </div>
              <div className={styles.field}>
                <label htmlFor="outcome-lessons">What did you learn?</label>
                <textarea
                  id="outcome-lessons"
                  onChange={(event) => setOutcomeLessons(event.target.value)}
                  placeholder="What should future-you update?"
                  value={outcomeLessons}
                />
              </div>
              <button
                className={styles.secondaryButton}
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
  );
}
