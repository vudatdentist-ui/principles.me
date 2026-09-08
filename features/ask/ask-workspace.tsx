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

function retrievalLabel(state: RetrievalState | null, kind: "knowledge" | "live"): string {
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
  const [knowledgeState, setKnowledgeState] = useState<RetrievalState | null>(null);
  const [liveState, setLiveState] = useState<RetrievalState | null>(null);
  const [personalState, setPersonalState] = useState<PersonalContextState | null>(null);
  const [status, setStatus] = useState("Ready");
  const [phase, setPhase] = useState<AskPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const lastQuestion = useRef("");

  const canSubmit = question.trim().length >= 3 && phase !== "submitting";
  const sourceLabel = useMemo(() => {
    if (phase === "submitting" && sources.length === 0) return "Searching…";
    if (sources.length === 0) return "No retrieved sources";
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
        <h1 id="knowledge-title">Think from principles.</h1>
        <p>
          Ask freely. Shared Principles knowledge provides evidence; your personal evolution
          state provides bounded context. Neither is silently written back into your life.
        </p>
      </section>

      <div className={styles.promptRail} aria-label="Principles prompts">
        {prompts.map((prompt) => (
          <button disabled={phase === "submitting"} key={prompt} onClick={() => setQuestion(prompt)} type="button">
            {prompt}
          </button>
        ))}
      </div>

      <form className={styles.askForm} onSubmit={onSubmit}>
        <label className={styles.label} htmlFor="question">Question</label>
        <textarea
          className={styles.textarea}
          disabled={phase === "submitting"}
          id="question"
          maxLength={4000}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="What are you trying to understand, diagnose, design, or learn?"
          rows={5}
          value={question}
        />
        <div className={styles.formFooter}>
          <span className={styles.status} aria-live="polite">{status}</span>
          <button className={styles.submit} disabled={!canSubmit} type="submit">
            {phase === "submitting" ? "Thinking…" : "Ask"}
          </button>
        </div>
      </form>

      {error ? (
        <section className={styles.error} role="alert">
          <strong>Could not finish.</strong>
          <span>{error}</span>
          {lastQuestion.current ? (
            <button className={styles.retry} onClick={() => void runAsk(lastQuestion.current)} type="button">Try again</button>
          ) : null}
        </section>
      ) : null}

      {answer || phase === "submitting" ? (
        <section className={styles.answerSection} aria-live="polite">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Answer</p>
              <h2>Reason with reality.</h2>
            </div>
            <span>{sourceLabel}</span>
          </div>
          <article className={styles.answer}>{answer || "Preparing…"}</article>
          {phase === "done" ? (
            <div className={styles.bridge}>
              <div>
                <span>Important conclusions still require your judgment.</span>
                <strong>Continue the thought inside your active evolution loop.</strong>
              </div>
              <a href="/">Use this thinking in People →</a>
            </div>
          ) : null}
        </section>
      ) : null}

      {phase !== "idle" ? (
        <section className={styles.sourcesSection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Grounding</p>
              <h2>What informed this answer?</h2>
            </div>
            <span>{sourceLabel}</span>
          </div>
          <div aria-label="Retrieval status" className={styles.retrievalGrid}>
            <div className={styles.retrievalCard}>
              <span>Shared Principles knowledge</span>
              <strong>{retrievalLabel(knowledgeState, "knowledge")}</strong>
            </div>
            <div className={styles.retrievalCard}>
              <span>Personal evolution context</span>
              <strong>{personalState === "ok" ? "Connected" : personalState === "empty" ? "Empty" : "Not checked"}</strong>
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
                    <span>{source.sourceType === "live_web" ? "LIVE" : "RAG"}</span>
                    {source.url ? <a href={source.url} rel="noreferrer" target="_blank">Open</a> : null}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <p className={styles.emptySources}>
              {knowledgeState === "unavailable"
                ? "Shared knowledge could not be reached."
                : knowledgeState === "empty"
                  ? "No shared document matched this question."
                  : "No retrieved sources were returned."}
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
