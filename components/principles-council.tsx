// biome-ignore-all lint/a11y/useButtonType: These buttons are standalone controls, not form submissions.
// biome-ignore-all lint/performance/noJsxPropsBind: Local event handlers keep the visual prototype readable and scoped.
// biome-ignore-all lint/suspicious/noLeakedRender: All conditional values are controlled UI strings.
// biome-ignore-all lint/performance/noAwaitInLoops: The NDJSON reader must consume stream chunks in order.
// biome-ignore-all lint/suspicious/noShadow: Stream parsing uses narrow local names for protocol fields.
// biome-ignore-all lint/a11y/useAriaPropsSupportedByRole: The visual mode dock is a labelled control group.
// biome-ignore-all lint/complexity/noVoid: Fire-and-forget UI actions intentionally do not block event handlers.

"use client";

import {
  ArrowUpRight,
  BookOpen,
  Brain,
  ChevronRight,
  CircleHelp,
  GitBranch,
  Library,
  Network,
  Search,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { BrainScene } from "@/components/brain-scene";
import {
  type BrainMode,
  THINKERS,
  type Thinker,
  thinkerById,
} from "@/lib/principles-graph";

type Route =
  | "home"
  | "brain"
  | "council"
  | "response"
  | "sources"
  | "thinkers"
  | "profile"
  | "principles"
  | "concepts"
  | "mybrain"
  | "teambrain"
  | "decisions"
  | "library";
type FeedEvent = Record<string, unknown> & { type?: string };

const ROUTE_LABELS: Record<Route, string> = {
  brain: "Brain",
  concepts: "Concepts",
  council: "Council",
  decisions: "Decisions",
  home: "Home",
  library: "Library",
  mybrain: "My Brain",
  principles: "Principles",
  profile: "Thinker Profile",
  response: "Council Response",
  sources: "Sources",
  teambrain: "Team Brain",
  thinkers: "Thinkers",
};

const QUESTIONS = [
  "How should I choose a cofounder?",
  "What is the hidden incentive in this decision?",
  "How do I separate facts from assumptions?",
];

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function activeMode(route: Route): BrainMode {
  if (route === "brain" || route === "principles" || route === "concepts") {
    return "graph";
  }
  if (route === "thinkers" || route === "profile" || route === "library") {
    return "constellation";
  }
  if (route === "council" || route === "response" || route === "sources") {
    return "council";
  }
  return "brain";
}

export function PrinciplesCouncil() {
  const [route, setRoute] = useState<Route>("home");
  const [question, setQuestion] = useState("");
  const [councilQuestion, setCouncilQuestion] = useState(QUESTIONS[0]);
  const [selectedThinkerIds, setSelectedThinkerIds] = useState([
    "dalio",
    "munger",
    "buffett",
  ]);
  const [selectedThinkerId, setSelectedThinkerId] = useState("dalio");
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const references = useMemo(() => {
    const event = [...events]
      .reverse()
      .find((item) => item.type === "references");
    return Array.isArray(event?.references)
      ? event.references.filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null
        )
      : [];
  }, [events]);
  const tokens = events
    .filter((event) => event.type === "token")
    .map((event) => text(event.token))
    .join("");
  const currentThinker = thinkerById(selectedThinkerId);
  const mode = activeMode(route);

  const go = (next: Route) => setRoute(next);
  const chooseThinker = (id: string) => {
    setSelectedThinkerId(id);
    if (route === "thinkers") {
      setRoute("profile");
    }
  };
  const toggleThinker = (id: string) => {
    setSelectedThinkerIds((current) =>
      current.includes(id)
        ? current.length === 1
          ? current
          : current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  async function askCouncil(value = councilQuestion) {
    const trimmed = value.trim();
    if (!trimmed || busy) {
      return;
    }
    setCouncilQuestion(trimmed);
    setBusy(true);
    setError("");
    setEvents([]);
    setRoute("response");
    try {
      const response = await fetch("/api/council", {
        body: JSON.stringify({
          question: trimmed,
          thinkerIds: selectedThinkerIds,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok || !response.body) {
        throw new Error("Council endpoint không phản hồi.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(chunk, { stream: true });
        const rows = buffer.split("\n");
        buffer = rows.pop() || "";
        for (const row of rows) {
          if (!row.trim()) {
            continue;
          }
          try {
            const event = JSON.parse(row) as FeedEvent;
            setEvents((current) => [...current, event]);
            if (event.type === "error") {
              setError(text(event.message, "Council failed."));
            }
          } catch {
            // NDJSON rows are complete at the server boundary; ignore malformed telemetry.
          }
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Council failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="principles-app">
      <aside className="side-rail">
        <button
          aria-label="Principles home"
          className="brand"
          onClick={() => go("home")}
        >
          <span aria-hidden="true" className="brand-mark">
            <span />
            <span />
          </span>
          <span>PRINCIPLES</span>
        </button>
        <nav aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          <NavButton
            active={route === "home"}
            icon={<Brain size={15} />}
            label="Home"
            onClick={() => go("home")}
          />
          <NavButton
            active={route === "brain"}
            icon={<Network size={15} />}
            label="Brain"
            onClick={() => go("brain")}
          />
          <NavButton
            active={route === "council" || route === "response"}
            icon={<Sparkles size={15} />}
            label="Council"
            onClick={() => go("council")}
          />
          <NavButton
            active={route === "thinkers" || route === "profile"}
            icon={<Users size={15} />}
            label="Thinkers"
            onClick={() => go("thinkers")}
          />
          <p className="nav-label nav-spacer">Knowledge</p>
          <NavButton
            active={route === "principles"}
            icon={<GitBranch size={15} />}
            label="Principles"
            onClick={() => go("principles")}
          />
          <NavButton
            active={route === "concepts"}
            icon={<CircleHelp size={15} />}
            label="Concepts"
            onClick={() => go("concepts")}
          />
          <NavButton
            active={route === "library" || route === "sources"}
            icon={<Library size={15} />}
            label="Library"
            onClick={() => go("library")}
          />
          <p className="nav-label nav-spacer">Systems</p>
          <NavButton
            active={route === "mybrain"}
            icon={<Brain size={15} />}
            label="My Brain"
            onClick={() => go("mybrain")}
          />
          <NavButton
            active={route === "teambrain"}
            icon={<Users size={15} />}
            label="Team Brain"
            onClick={() => go("teambrain")}
          />
          <NavButton
            active={route === "decisions"}
            icon={<ArrowUpRight size={15} />}
            label="Decisions"
            onClick={() => go("decisions")}
          />
        </nav>
        <div className="side-user">
          <span className="user-avatar">Y</span>
          <span>
            <b>Your Workspace</b>
            <small>Local · private</small>
          </span>
        </div>
      </aside>

      <section className="workspace" data-route={route}>
        <BrainScene mode={mode} />
        <div className="workspace-shade" />
        <header className="topbar">
          <div className="topbar-route">
            <span className="status-dot" /> {ROUTE_LABELS[route]}
          </div>
          <div className="topbar-actions">
            <button aria-label="Search">
              <Search size={16} />
            </button>
            <button aria-label="Ask council" onClick={() => go("council")}>
              <Sparkles size={16} />
            </button>
            <span className="topbar-avatar">Y</span>
          </div>
        </header>

        <div aria-label="Brain mode" className="mode-dock glass-panel">
          {(["brain", "graph", "constellation", "council"] as BrainMode[]).map(
            (item) => (
              <button
                className={mode === item ? "active" : ""}
                key={item}
                onClick={() => {
                  go(
                    item === "brain"
                      ? "home"
                      : item === "graph"
                        ? "brain"
                        : item === "constellation"
                          ? "thinkers"
                          : "council"
                  );
                }}
              >
                {item === "brain"
                  ? "Brain"
                  : item === "graph"
                    ? "Graph"
                    : item === "constellation"
                      ? "Thinker Constellation"
                      : "Council"}
              </button>
            )
          )}
        </div>

        {route === "home" ? (
          <HomePage
            onAsk={() => {
              setCouncilQuestion(question.trim() || QUESTIONS[0]);
              go("council");
            }}
            onQuick={(item) => {
              setCouncilQuestion(item);
              go("council");
            }}
            onThinker={chooseThinker}
            question={question}
            setQuestion={setQuestion}
          />
        ) : null}
        {route === "brain" || route === "principles" || route === "concepts" ? (
          <GraphPage onAsk={() => go("council")} route={route} />
        ) : null}
        {route === "council" ? (
          <CouncilPage
            onAsk={(value) => void askCouncil(value ?? councilQuestion)}
            question={councilQuestion}
            selectedThinkerIds={selectedThinkerIds}
            setQuestion={setCouncilQuestion}
            toggleThinker={toggleThinker}
          />
        ) : null}
        {route === "response" ? (
          <ResponsePage
            busy={busy}
            error={error}
            events={events}
            onNew={() => go("council")}
            onSources={() => go("sources")}
            question={councilQuestion}
            references={references}
            tokens={tokens}
          />
        ) : null}
        {route === "sources" ? (
          <SourcesPage
            onBack={() => go("response")}
            question={councilQuestion}
            references={references}
          />
        ) : null}
        {route === "thinkers" ? (
          <ThinkersPage onSelect={chooseThinker} />
        ) : null}
        {route === "profile" ? (
          <ProfilePage
            onAsk={() => {
              setCouncilQuestion(
                `What can I learn from ${currentThinker.name} about this decision?`
              );
              go("council");
            }}
            onBack={() => go("thinkers")}
            thinker={currentThinker}
          />
        ) : null}
        {route === "library" ? (
          <LibraryPage
            onSources={() => go("sources")}
            references={references}
          />
        ) : null}
        {route === "mybrain" ||
        route === "teambrain" ||
        route === "decisions" ? (
          <SystemPage onAsk={() => go("council")} route={route} />
        ) : null}
      </section>
    </main>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`nav-button${active ? " active" : ""}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function HomePage({
  question,
  setQuestion,
  onAsk,
  onQuick,
  onThinker,
}: {
  question: string;
  setQuestion: (value: string) => void;
  onAsk: () => void;
  onQuick: (value: string) => void;
  onThinker: (id: string) => void;
}) {
  return (
    <div className="page home-page">
      <div className="hero-block">
        <span className="eyebrow">A thinking operating system</span>
        <h1>
          Think with
          <br />
          <span className="gradient-text">the greats.</span>
        </h1>
        <p>
          Bring a real question to a council of thinkers. Retrieval finds the
          evidence. DeepSeek reasons across the lenses. You decide what becomes
          part of your system.
        </p>
        <div className="ask-bar">
          <input
            aria-label="Ask your council"
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onAsk();
              }
            }}
            placeholder="Ask your council anything…"
            value={question}
          />
          <button aria-label="Ask Council" onClick={onAsk}>
            <Send size={17} />
          </button>
        </div>
        <div className="quick-row">
          {QUESTIONS.map((item) => (
            <button key={item} onClick={() => onQuick(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="home-rail">
        <div className="glass-panel quote-panel">
          <span className="eyebrow">Today’s signal</span>
          <p>
            “The quality of your thinking depends on the quality of the
            questions you ask.”
          </p>
          <small>— Council protocol · evidence first</small>
        </div>
        <div className="glass-panel topics-panel">
          <span className="eyebrow">Explore the constellation</span>
          {[
            "Systems & incentives",
            "Character & judgment",
            "Power & institutions",
          ].map((item, index) => (
            <button key={item} onClick={() => onQuick(QUESTIONS[index])}>
              <span className="topic-orb">{index + 1}</span>
              {item}
              <ChevronRight size={13} />
            </button>
          ))}
        </div>
      </div>
      <div className="thinker-dock glass-panel">
        <div className="section-line">
          <span className="eyebrow">A few minds in the room</span>
          <button onClick={() => onThinker("dalio")}>
            View constellation <ArrowUpRight size={12} />
          </button>
        </div>
        <div className="thinker-row">
          {THINKERS.map((thinker) => (
            <button
              className="thinker-card"
              key={thinker.id}
              onClick={() => onThinker(thinker.id)}
            >
              <span
                className="thinker-sigil"
                style={{ "--sigil": thinker.accent } as React.CSSProperties}
              >
                {thinker.name.slice(0, 1)}
              </span>
              <span>
                <b>{thinker.name}</b>
                <small>{thinker.tradition}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function GraphPage({ route, onAsk }: { route: Route; onAsk: () => void }) {
  const title =
    route === "principles"
      ? "Principles graph"
      : route === "concepts"
        ? "Concept constellation"
        : "Brain explorer";
  return (
    <div className="page overlay-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            Knowledge graph · Principles data model
          </span>
          <h2>{title}</h2>
          <p>
            Explore relationships between thinkers, principles, mechanisms and
            questions. This graph is native to Principles; RAGFlow evidence
            stays in Sources.
          </p>
        </div>
        <button className="primary-button" onClick={onAsk}>
          <Sparkles size={14} /> Ask Council
        </button>
      </div>
      <div className="stats-row">
        <Stat label="Nodes" value="42" />
        <Stat label="Relations" value="86" />
        <Stat label="Thinkers" value="6" />
        <Stat label="Evidence links" value="0" />
      </div>
      <div className="graph-inspector glass-panel">
        <span className="eyebrow">Selected node</span>
        <h3>Incentives</h3>
        <p>
          Behavior follows rewards more reliably than slogans. Connect this idea
          to a question, a decision or a source when evidence is available.
        </p>
        <div className="relation-line">
          <span className="signal cyan" /> develops <b>Charlie Munger</b>
        </div>
        <div className="relation-line">
          <span className="signal violet" /> contrasts <b>Radical truth</b>
        </div>
      </div>
    </div>
  );
}

function CouncilPage({
  question,
  setQuestion,
  selectedThinkerIds,
  toggleThinker,
  onAsk,
}: {
  question: string;
  setQuestion: (value: string) => void;
  selectedThinkerIds: string[];
  toggleThinker: (id: string) => void;
  onAsk: (value?: string) => void;
}) {
  return (
    <div className="page overlay-page council-page">
      <div className="council-heading">
        <div>
          <span className="eyebrow">
            Council room · retrieval → reasoning → synthesis
          </span>
          <h2>Ask the council.</h2>
          <p>
            Choose the lenses you want in the room. RAGFlow retrieves evidence;
            DeepSeek performs the synthesis.
          </p>
        </div>
        <span className="protocol-pill">
          <span className="status-dot" /> grounded protocol
        </span>
      </div>
      <div className="council-layout">
        <div className="glass-panel council-form">
          <label className="eyebrow" htmlFor="council-question">
            Your question
          </label>
          <textarea
            id="council-question"
            onChange={(event) => setQuestion(event.target.value)}
            value={question}
          />
          <div className="scope-row">
            <button className="active">My knowledge</button>
            <button>Selected thinkers</button>
            <button>Open inquiry</button>
          </div>
          <div className="council-footer">
            <small>
              Evidence is shown in full after retrieval. No citation is
              invented.
            </small>
            <button
              className="primary-button"
              disabled={!question.trim()}
              onClick={() => onAsk(question)}
            >
              <Send size={14} /> Ask Council
            </button>
          </div>
        </div>
        <div className="glass-panel selected-panel">
          <div className="section-line">
            <div>
              <span className="eyebrow">The room</span>
              <h3>{selectedThinkerIds.length} thinkers selected</h3>
            </div>
            <Users size={16} />
          </div>
          <div className="select-list">
            {THINKERS.map((thinker) => (
              <button
                className={`select-thinker${selectedThinkerIds.includes(thinker.id) ? " selected" : ""}`}
                key={thinker.id}
                onClick={() => toggleThinker(thinker.id)}
              >
                <span
                  className="thinker-sigil"
                  style={{ "--sigil": thinker.accent } as React.CSSProperties}
                >
                  {thinker.name.slice(0, 1)}
                </span>
                <span>
                  <b>{thinker.name}</b>
                  <small>{thinker.lens}</small>
                </span>
                <span className="check-mark">
                  {selectedThinkerIds.includes(thinker.id) ? "✓" : "+"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResponsePage({
  question,
  events,
  references,
  tokens,
  busy,
  error,
  onSources,
  onNew,
}: {
  question: string;
  events: FeedEvent[];
  references: Record<string, unknown>[];
  tokens: string;
  busy: boolean;
  error: string;
  onSources: () => void;
  onNew: () => void;
}) {
  const answer = [...events].reverse().find((event) => event.type === "answer");
  const statuses = events
    .filter((event) => event.type === "status")
    .map((event) => text(event.message))
    .filter(Boolean);
  return (
    <div className="page overlay-page response-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Council response</span>
          <h2>
            {question.length > 70 ? `${question.slice(0, 70)}…` : question}
          </h2>
          <p>
            <span className="status-dot" />{" "}
            {busy
              ? statuses.at(-1) || "Council is thinking…"
              : answer
                ? "Synthesis complete · citations validated"
                : "Waiting for the council stream"}
          </p>
        </div>
        <div className="heading-actions">
          <button className="secondary-button" onClick={onSources}>
            <BookOpen size={14} /> Sources{" "}
            {references.length ? `(${references.length})` : ""}
          </button>
          <button className="primary-button" onClick={onNew}>
            <Sparkles size={14} /> New question
          </button>
        </div>
      </div>
      <div className="response-grid">
        <div className="response-main">
          <div className="glass-panel synthesis-panel">
            <div className="panel-top">
              <span className="eyebrow">DeepSeek synthesis</span>
              <span className="model-badge">DEEPSEEK</span>
            </div>
            {busy && tokens ? (
              <p className="stream-copy">{tokens}</p>
            ) : answer ? (
              <p className="answer-copy">{text(answer.answer, "No answer.")}</p>
            ) : (
              <div className="empty-stream">
                <Sparkles size={17} />
                <span>Retrieval and reasoning will appear here.</span>
              </div>
            )}
            {error ? <div className="error-banner">{error}</div> : null}
            {answer && !answer.grounded ? (
              <div className="caveat-banner">
                Không có evidence/citation hợp lệ cho câu trả lời này. Hãy nạp
                tài liệu vào RAGFlow rồi hỏi lại.
              </div>
            ) : null}
          </div>
          <div className="perspective-grid">
            {THINKERS.filter(
              (thinker) =>
                events.length === 0 ||
                text(answer?.answer).includes(thinker.name) ||
                true
            )
              .slice(0, 3)
              .map((thinker) => (
                <div className="glass-panel perspective-card" key={thinker.id}>
                  <div className="person-line">
                    <span
                      className="thinker-sigil"
                      style={
                        { "--sigil": thinker.accent } as React.CSSProperties
                      }
                    >
                      {thinker.name.slice(0, 1)}
                    </span>
                    <b>{thinker.name}</b>
                  </div>
                  <p>{thinker.lens}</p>
                  <small>Perspective lens · not evidence</small>
                </div>
              ))}
          </div>
        </div>
        <aside className="response-side">
          <div className="glass-panel agree-panel">
            <span className="eyebrow">Council protocol</span>
            <h3>Evidence before confidence.</h3>
            <p>
              Retrieval is separated from synthesis. The graph can surface
              hypotheses; only RAGFlow chunks become evidence.
            </p>
            <div className="protocol-line">
              <span className="signal green" /> RAGFlow ·{" "}
              {references.length ? `${references.length} chunks` : "no chunks"}
            </div>
            <div className="protocol-line">
              <span className="signal violet" /> DeepSeek ·{" "}
              {busy ? "streaming" : "ready"}
            </div>
          </div>
          <div className="glass-panel source-preview">
            <div className="section-line">
              <span className="eyebrow">Sources</span>
              <button onClick={onSources}>
                View all <ArrowUpRight size={12} />
              </button>
            </div>
            {references.slice(0, 3).map((reference, index) => (
              <div
                className="source-row"
                key={text(reference.key, `R${index + 1}`)}
              >
                <span>{text(reference.key, `R${index + 1}`)}</span>
                <p>{text(reference.title, "RAGFlow source")}</p>
              </div>
            ))}
            {references.length ? null : (
              <p className="muted-copy">No evidence retrieved yet.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SourcesPage({
  question,
  references,
  onBack,
}: {
  question: string;
  references: Record<string, unknown>[];
  onBack: () => void;
}) {
  return (
    <div className="page overlay-page sources-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Provenance · RAGFlow retrieval</span>
          <h2>Sources for this question.</h2>
          <p>{question}</p>
        </div>
        <button className="secondary-button" onClick={onBack}>
          <ChevronRight size={14} /> Back to response
        </button>
      </div>
      {references.length ? (
        <div className="source-list">
          {references.map((reference, index) => (
            <article
              className="glass-panel source-card"
              key={text(reference.key, `R${index + 1}`)}
            >
              <div className="source-card-top">
                <span className="source-key">
                  {text(reference.key, `R${index + 1}`)}
                </span>
                <span className="score">
                  {reference.score
                    ? `score ${Number(reference.score).toFixed(2)}`
                    : "retrieved"}
                </span>
              </div>
              <h3>{text(reference.title, "RAGFlow document")}</h3>
              <p>{text(reference.text, "No excerpt returned.")}</p>
              <small>
                Document {text(reference.documentId, "unresolved")} · Dataset{" "}
                {text(reference.datasetId, "unresolved")} · chunk{" "}
                {text(reference.chunkId, "unresolved")}
              </small>
            </article>
          ))}
        </div>
      ) : (
        <div className="glass-panel empty-panel">
          <BookOpen size={24} />
          <h3>No evidence retrieved.</h3>
          <p>
            RAGFlow chưa trả về chunk cho câu hỏi này. Sources không được dựng
            từ graph hoặc nội dung đoán.
          </p>
        </div>
      )}
    </div>
  );
}

function ThinkersPage({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="page overlay-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">The constellation</span>
          <h2>Thinkers.</h2>
          <p>
            Different traditions. Different blind spots. One room for better
            questions.
          </p>
        </div>
      </div>
      <div className="people-grid">
        {THINKERS.map((thinker) => (
          <button
            className="glass-panel person-card"
            key={thinker.id}
            onClick={() => onSelect(thinker.id)}
          >
            <span
              className="person-orbit"
              style={{ "--sigil": thinker.accent } as React.CSSProperties}
            >
              <span>{thinker.name.slice(0, 1)}</span>
            </span>
            <span className="eyebrow">{thinker.tradition}</span>
            <h3>{thinker.name}</h3>
            <p>{thinker.lens}</p>
            <small>{thinker.quote}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProfilePage({
  thinker,
  onBack,
  onAsk,
}: {
  thinker: Thinker;
  onBack: () => void;
  onAsk: () => void;
}) {
  return (
    <div className="page overlay-page profile-page">
      <button className="back-link" onClick={onBack}>
        ← Thinker constellation
      </button>
      <div className="profile-hero glass-panel">
        <span
          className="profile-sigil"
          style={{ "--sigil": thinker.accent } as React.CSSProperties}
        >
          {thinker.name.slice(0, 1)}
        </span>
        <div>
          <span className="eyebrow">{thinker.tradition}</span>
          <h2>{thinker.name}</h2>
          <p>{thinker.lens}</p>
        </div>
        <button className="primary-button" onClick={onAsk}>
          <Sparkles size={14} /> Bring to Council
        </button>
      </div>
      <div className="profile-grid">
        <div className="glass-panel profile-quote">
          <span className="eyebrow">Signal</span>
          <p>“{thinker.quote}”</p>
        </div>
        <div className="principle-list">
          {thinker.principles.map((principle, index) => (
            <div className="glass-panel principle-row" key={principle.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{principle.title}</h3>
                <p>{principle.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="glass-panel books-panel">
          <span className="eyebrow">Primary reading</span>
          {thinker.books.map((book) => (
            <div className="book-row" key={book}>
              <BookOpen size={13} />
              <span>{book}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LibraryPage({
  references,
  onSources,
}: {
  references: Record<string, unknown>[];
  onSources: () => void;
}) {
  return (
    <div className="page overlay-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Knowledge library</span>
          <h2>Sources, not vibes.</h2>
          <p>
            Ingested documents and retrieved chunks live here. Graph nodes are
            hypotheses until connected to evidence.
          </p>
        </div>
        <button className="secondary-button" onClick={onSources}>
          <BookOpen size={14} /> Retrieved sources
        </button>
      </div>
      <div className="library-grid">
        <div className="glass-panel library-card">
          <span className="library-icon">
            <BookOpen size={17} />
          </span>
          <h3>RAGFlow corpus</h3>
          <p>
            {references.length
              ? `${references.length} chunks in the last retrieval.`
              : "Connect a dataset to begin retrieval."}
          </p>
          <span className="status-label">
            <span className="status-dot" /> external service
          </span>
        </div>
        <div className="glass-panel library-card">
          <span className="library-icon">
            <Network size={17} />
          </span>
          <h3>Principles graph</h3>
          <p>
            Native nodes for thinkers, principles, concepts, questions and
            decisions.
          </p>
          <span className="status-label">
            <span className="signal violet" /> local model
          </span>
        </div>
        <div className="glass-panel library-card">
          <span className="library-icon">
            <Search size={17} />
          </span>
          <h3>Evidence policy</h3>
          <p>
            Unknown claims are labeled unknown. Unsupported citations are
            discarded.
          </p>
          <span className="status-label">
            <span className="signal green" /> enforced
          </span>
        </div>
      </div>
    </div>
  );
}

function SystemPage({ route, onAsk }: { route: Route; onAsk: () => void }) {
  const labels =
    route === "mybrain"
      ? ["Personal system", "My Brain"]
      : route === "teambrain"
        ? ["Shared system", "Team Brain"]
        : ["Decision workspace", "Decisions"];
  return (
    <div className="page overlay-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{labels[0]}</span>
          <h2>{labels[1]}</h2>
          <p>
            Build a living system of questions, principles and decisions around
            the evidence you trust.
          </p>
        </div>
        <button className="primary-button" onClick={onAsk}>
          <Sparkles size={14} /> Ask Council
        </button>
      </div>
      <div className="stats-row">
        <Stat label="Open questions" value="07" />
        <Stat label="Active principles" value="24" />
        <Stat label="Evidence coverage" value="—" />
        <Stat label="Review cadence" value="Weekly" />
      </div>
      <div className="dashboard-panels">
        <div className="glass-panel dashboard-card">
          <span className="eyebrow">Next reflection</span>
          <h3>Which assumption would change your decision if it were false?</h3>
          <p>
            No evidence is attached yet. Turn it into a council question when
            you are ready.
          </p>
          <button className="text-button" onClick={onAsk}>
            Explore with Council <ArrowUpRight size={12} />
          </button>
        </div>
        <div className="glass-panel dashboard-card">
          <span className="eyebrow">Graph health</span>
          <div className="health-orbit">
            <span />
            <b>72%</b>
          </div>
          <p>Structure is present. Evidence coverage is the missing layer.</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel stat-card">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
