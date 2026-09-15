"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { ClientEvidenceReference } from "@/features/evidence/client-reference";
import styles from "./ask-workspace.module.css";

type AskPhase = "idle" | "submitting" | "done" | "error";
type RetrievalState = "disabled" | "empty" | "ok" | "unavailable";
type PersonalContextState = "empty" | "ok";

type StreamEvent =
  | { type: "status"; message: string; stage: "retrieving" | "answering" }
  | {
      type: "sources";
      references: ClientEvidenceReference[];
      live?: RetrievalState;
      personal?: PersonalContextState;
      private?: RetrievalState;
    }
  | { type: "token"; token: string }
  | { type: "error"; code: string; message: string; retryable: boolean }
  | { type: "done" };

const prompts = [
  "What is reality here?",
  "What problem am I not confronting?",
  "Help me diagnose the root cause.",
  "What would a better machine look like?",
  "Which principle applies here?",
  "What should I reflect on?",
];

function parseEvent(line: string): StreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const value = JSON.parse(trimmed) as StreamEvent;
    return value && typeof value === "object" && "type" in value ? value : null;
  } catch {
    return null;
  }
}

function retrievalLabel(
  state: RetrievalState | null,
  kind: "knowledge" | "live",
): string {
  if (state === "ok") return "Connected";
  if (state === "empty") return "No match";
  if (state === "unavailable") return "Unavailable";
  if (state === "disabled") return "Off";
  return kind === "knowledge" ? "Not checked" : "Not requested";
}

export function AskWorkspace() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<ClientEvidenceReference[]>([]);
  const [knowledgeState, setKnowledgeState] = useState<RetrievalState | null>(
    null,
  );
  const [liveState, setLiveState] = useState<RetrievalState | null>(null);
  const [personalState, setPersonalState] =
    useState<PersonalContextState | null>(null);
  const [status, setStatus] = useState("Ready");
  const [phase, setPhase] = useState<AskPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const lastQuestion = useRef("");

  const canSubmit = question.trim().length >= 3 && phase !== "submitting";
  const hasPartialAnswer = answer.trim().length > 0 && phase === "error";
  const sourceLabel = useMemo(() => {
    if (phase === "submitting" && sources.length === 0) return "Searching…";
    if (sources.length === 0) return "No sources";
    return `${sources.length} source${sources.length === 1 ? "" : "s"}`;
  }, [phase, sources.length]);

  async function runAsk(rawQuestion: string) {
    const trimmed = rawQuestion.trim();
    if (trimmed.length < 3 || phase === "submitting") return;

    lastQuestion.current = trimmed;
    setQuestion(trimmed);
    setPhase("submitting");
    setAnswer("");
    setSources([]);
    setKnowledgeState(null);
    setLiveState(null);
    setPersonalState(null);
    setError(null);
    setStatus("Searching…");

    try {
      const response = await fetch("/api/ask", {
        body: JSON.stringify({ question: trimmed }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      if (response.status === 401) {
        window.location.reload();
        return;
      }
      if (response.status === 429) throw new Error("Limit reached. Try later.");
      if (!response.ok || !response.body) throw new Error("Request failed.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let terminal = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const streamLine of lines) {
          const event = parseEvent(streamLine);
          if (!event) continue;
          if (event.type === "status") {
            setStatus(event.message);
          } else if (event.type === "sources") {
            setSources(event.references);
            setKnowledgeState(event.private ?? null);
            setLiveState(event.live ?? null);
            setPersonalState(event.personal ?? null);
          } else if (event.type === "token") {
            setAnswer((current) => current + event.token);
          } else if (event.type === "error") {
            terminal = true;
            setError(event.message);
            setPhase("error");
            setStatus(event.retryable ? "Try again" : "Failed");
          } else if (event.type === "done") {
            terminal = true;
            setPhase("done");
            setStatus("Complete");
          }
        }
      }

      const tail = parseEvent(buffer);
      if (tail?.type === "done") {
        terminal = true;
        setPhase("done");
        setStatus("Complete");
      } else if (tail?.type === "error") {
        terminal = true;
        setError(tail.message);
        setPhase("error");
        setStatus(tail.retryable ? "Try again" : "Failed");
      }
      if (!terminal) throw new Error("Stream ended unexpectedly.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
      setPhase("error");
      setStatus("Try again");
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runAsk(question);
  }

  return (
    <div className={styles.workspace}>
      <section className={styles.hero} aria-labelledby="knowledge-title">
        <p className={styles.eyebrow}>Knowledge</p>
        <h1 id="knowledge-title">What is still unclear?</h1>
      </section>

      <div className={styles.promptRail}>
        {prompts.map((prompt) => (
          <button
            disabled={phase === "submitting"}
            key={prompt}
            onClick={() => setQuestion(prompt)}
            type="button"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form className={styles.askForm} onSubmit={onSubmit}>
        <label className={styles.label} htmlFor="question">
          Question
        </label>
        <textarea
          className={styles.textarea}
          disabled={phase === "submitting"}
          id="question"
          maxLength={4000}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="What are you trying to understand?"
          rows={5}
          value={question}
        />
        <div className={styles.formFooter}>
          <span className={styles.status} aria-live="polite">
            {status}
          </span>
          <button className={styles.submit} disabled={!canSubmit} type="submit">
            {phase === "submitting" ? "Thinking…" : "Ask"}
          </button>
        </div>
      </form>

      {error ? (
        <section className={styles.error} role="alert">
          <strong>
            {hasPartialAnswer ? "Answer paused." : "Could not finish."}
          </strong>
          <span>
            {error}
            {hasPartialAnswer
              ? " The answer already received is kept below."
              : null}
          </span>
          {lastQuestion.current ? (
            <button
              className={styles.retry}
              onClick={() => void runAsk(lastQuestion.current)}
              type="button"
            >
              Try again
            </button>
          ) : null}
        </section>
      ) : null}

      {answer || phase === "submitting" ? (
        <section className={styles.answerSection} aria-live="polite">
          <div className={styles.sectionHeading}>
            <h2>Answer</h2>
            <span>{sourceLabel}</span>
          </div>
          <article aria-busy={phase === "submitting"} className={styles.answer}>
            {answer ? <AnswerContent text={answer} /> : "Preparing…"}
          </article>
          {phase === "done" ? (
            <div className={styles.bridge}>
              <a href="/">Continue in Me →</a>
            </div>
          ) : null}
        </section>
      ) : null}

      {phase !== "idle" ? (
        <section className={styles.sourcesSection}>
          <div className={styles.sectionHeading}>
            <h2>Sources</h2>
            <span>{sourceLabel}</span>
          </div>
          <div className={styles.retrievalGrid}>
            <div className={styles.retrievalCard}>
              <span>Shared Principles knowledge</span>
              <strong>{retrievalLabel(knowledgeState, "knowledge")}</strong>
            </div>
            <div className={styles.retrievalCard}>
              <span>Personal evolution context</span>
              <strong>
                {personalState === "ok"
                  ? "Connected"
                  : personalState === "empty"
                    ? "Empty"
                    : "Not checked"}
              </strong>
            </div>
            <div className={styles.retrievalCard}>
              <span>Live public search</span>
              <strong>{retrievalLabel(liveState, "live")}</strong>
            </div>
          </div>
          {sources.length > 0 ? (
            <div className={styles.sources}>
              {sources.map((source) => (
                <details className={styles.source} key={source.key}>
                  <summary>
                    <span className={styles.sourceKey}>{source.key}</span>
                    <span>{source.title}</span>
                  </summary>
                  <p>{source.snippet}</p>
                  <div className={styles.sourceMeta}>
                    <span>
                      {source.sourceType === "live_web" ? "LIVE" : "RAG"}
                    </span>
                    {source.url ? (
                      <a href={source.url} rel="noreferrer" target="_blank">
                        Open
                      </a>
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <p className={styles.emptySources}>
              {knowledgeState === "unavailable"
                ? "Shared knowledge unavailable."
                : knowledgeState === "empty"
                  ? "No shared match."
                  : "No sources returned."}
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}

function AnswerContent({ text }: { text: string }) {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const usedKeys = new Map<string, number>();
  const keyFor = (value: string) => {
    const count = usedKeys.get(value) ?? 0;
    usedKeys.set(value, count + 1);
    return count === 0 ? value : `${value}-${count}`;
  };
  return blocks.map((block) => {
    const lines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const isList =
      lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line));
    const isQuote =
      lines.length > 0 && lines.every((line) => line.startsWith(">"));
    const firstLine = lines[0] ?? "";
    if (isList) {
      return (
        <ul key={keyFor(`list-${block}`)}>
          {lines.map((line) => (
            <li key={keyFor(`item-${line}`)}>
              {inlineMarkdown(line.replace(/^[-*]\s+/, ""))}
            </li>
          ))}
        </ul>
      );
    }
    if (isQuote) {
      return (
        <blockquote key={keyFor(`quote-${block}`)}>
          {inlineMarkdown(
            lines.map((line) => line.replace(/^>\s?/, "")).join(" "),
          )}
        </blockquote>
      );
    }
    if (/^#{1,3}\s+/.test(firstLine)) {
      return (
        <h3 key={keyFor(`heading-${block}`)}>
          {inlineMarkdown(firstLine.replace(/^#{1,3}\s+/, ""))}
        </h3>
      );
    }
    return (
      <p key={keyFor(`paragraph-${block}`)}>
        {inlineMarkdown(lines.join(" "))}
      </p>
    );
  });
}

function inlineMarkdown(value: string) {
  const parts = value.split(/(\*\*[^*]+\*\*|\[(?:R|W)\d+\])/g);
  const usedKeys = new Map<string, number>();
  const keyFor = (part: string) => {
    const count = usedKeys.get(part) ?? 0;
    usedKeys.set(part, count + 1);
    return count === 0 ? part : `${part}-${count}`;
  };
  return parts.map((part) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={keyFor(`strong-${part}`)}>{part.slice(2, -2)}</strong>
      );
    }
    if (/^\[(?:R|W)\d+\]$/.test(part)) {
      return (
        <span className={styles.citation} key={keyFor(`citation-${part}`)}>
          {part}
        </span>
      );
    }
    return part;
  });
}
