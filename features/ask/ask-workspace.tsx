"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { ClientEvidenceReference } from "@/features/evidence/client-reference";
import styles from "./ask-workspace.module.css";

type AskPhase = "idle" | "submitting" | "done" | "error";
type RetrievalState = "disabled" | "empty" | "ok" | "unavailable";

type StreamEvent =
  | { type: "status"; message: string; stage: "retrieving" | "answering" }
  | {
      type: "sources";
      references: ClientEvidenceReference[];
      live?: RetrievalState;
      private?: RetrievalState;
    }
  | { type: "token"; token: string }
  | { type: "error"; code: string; message: string; retryable: boolean }
  | { type: "done" };

function parseEvent(line: string): StreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const value = JSON.parse(trimmed) as StreamEvent;
    return value && typeof value === "object" && "type" in value ? value : null;
  } catch {
    return null;
  }
}

function retrievalLabel(
  state: RetrievalState | null,
  kind: "private" | "live"
): string {
  if (state === "ok") {
    return "Connected";
  }
  if (state === "empty") {
    return "No matching evidence";
  }
  if (state === "unavailable") {
    return "Unavailable";
  }
  if (state === "disabled") {
    return "Off";
  }
  return kind === "private" ? "Not checked" : "Not requested";
}

export function AskWorkspace({
  email,
  workspaceName,
}: {
  email: string;
  workspaceName: string;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<ClientEvidenceReference[]>([]);
  const [privateState, setPrivateState] = useState<RetrievalState | null>(null);
  const [liveState, setLiveState] = useState<RetrievalState | null>(null);
  const [status, setStatus] = useState("Ready");
  const [phase, setPhase] = useState<AskPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const lastQuestion = useRef("");

  const canSubmit = question.trim().length >= 3 && phase !== "submitting";
  const sourceLabel = useMemo(() => {
    if (phase === "submitting" && sources.length === 0) {
      return "Searching…";
    }
    if (sources.length === 0) {
      return "No sources";
    }
    return `${sources.length} source${sources.length === 1 ? "" : "s"}`;
  }, [phase, sources.length]);

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.reload();
  }

  async function runAsk(rawQuestion: string) {
    const trimmed = rawQuestion.trim();
    if (trimmed.length < 3 || phase === "submitting") {
      return;
    }

    lastQuestion.current = trimmed;
    setPhase("submitting");
    setAnswer("");
    setSources([]);
    setPrivateState(null);
    setLiveState(null);
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
      if (response.status === 429) {
        throw new Error("Limit reached. Try later.");
      }
      if (!response.ok || !response.body) {
        throw new Error("Request failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let terminal = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const streamLine of lines) {
          const event = parseEvent(streamLine);
          if (!event) {
            continue;
          }
          if (event.type === "status") {
            setStatus(event.message);
          } else if (event.type === "sources") {
            setSources(event.references);
            setPrivateState(event.private ?? null);
            setLiveState(event.live ?? null);
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
      if (!terminal) {
        throw new Error("Stream ended unexpectedly.");
      }
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
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/" aria-label="Principles home">
          Principles
        </a>
        <nav className={styles.nav} aria-label="Primary">
          <a href="/">People</a>
          <a aria-current="page" href="/knowledge">Knowledge</a>
          <a href="/learning">Learning</a>
          <a href="/organization">Organization</a>
        </nav>
        <div className={styles.account}>
          <span>{workspaceName}</span>
          <span>{email}</span>
          <button onClick={() => void signOut()} type="button">
            Sign out
          </button>
        </div>
      </header>

      <section className={styles.workspace}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Knowledge · Live · AI</p>
          <h1>Ask anything.</h1>
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
            placeholder="What do you want to know?"
            rows={5}
            value={question}
          />
          <div className={styles.formFooter}>
            <span className={styles.status} aria-live="polite">
              {status}
            </span>
            <button className={styles.submit} disabled={!canSubmit} type="submit">
              {phase === "submitting" ? "Working…" : "Ask"}
            </button>
          </div>
        </form>

        {error ? (
          <section className={styles.error} role="alert">
            <strong>Could not finish.</strong>
            <span>{error}</span>
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
            <article className={styles.answer}>
              {answer || "Preparing…"}
            </article>
          </section>
        ) : null}

        {phase !== "idle" ? (
          <section className={styles.sourcesSection}>
            <div className={styles.sectionHeading}>
              <h2>Sources</h2>
              <span>{sourceLabel}</span>
            </div>
            <fieldset
              aria-label="Retrieval status"
              className={styles.retrievalGrid}
            >
              <div className={styles.retrievalCard}>
                <span>Private knowledge</span>
                <strong>{retrievalLabel(privateState, "private")}</strong>
              </div>
              <div className={styles.retrievalCard}>
                <span>Live search</span>
                <strong>{retrievalLabel(liveState, "live")}</strong>
              </div>
            </fieldset>
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
                {privateState === "unavailable"
                  ? "Private knowledge could not be reached. Check the RAGFlow connection."
                  : privateState === "empty"
                    ? "No private document matched this question."
                    : "No sources were returned."}
              </p>
            )}
          </section>
        ) : null}
      </section>
    </main>
  );
}
