"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { EvidenceReference } from "@/features/evidence/contracts";
import styles from "./ask-workspace.module.css";

type AskPhase = "idle" | "submitting" | "done" | "error";

type StreamEvent =
  | { type: "status"; message: string; stage: "retrieving" | "answering" }
  | { type: "sources"; references: EvidenceReference[] }
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

export function AskWorkspace() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<EvidenceReference[]>([]);
  const [status, setStatus] = useState("Ask a question about your knowledge base.");
  const [phase, setPhase] = useState<AskPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const lastQuestion = useRef("");

  const canSubmit = question.trim().length >= 3 && phase !== "submitting";
  const sourceLabel = useMemo(() => {
    if (phase === "submitting" && sources.length === 0) {
      return "Searching sources…";
    }
    if (sources.length === 0) {
      return "No sources retrieved";
    }
    return `${sources.length} source${sources.length === 1 ? "" : "s"}`;
  }, [phase, sources.length]);

  async function runAsk(rawQuestion: string) {
    const trimmed = rawQuestion.trim();
    if (trimmed.length < 3 || phase === "submitting") {
      return;
    }

    lastQuestion.current = trimmed;
    setPhase("submitting");
    setAnswer("");
    setSources([]);
    setError(null);
    setStatus("Searching the knowledge base…");

    try {
      const response = await fetch("/api/ask", {
        body: JSON.stringify({ question: trimmed }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      if (!response.ok || !response.body) {
        throw new Error("The Q&A service is unavailable.");
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

        for (const line of lines) {
          const event = parseEvent(line);
          if (!event) {
            continue;
          }

          if (event.type === "status") {
            setStatus(event.message);
          } else if (event.type === "sources") {
            setSources(event.references);
          } else if (event.type === "token") {
            setAnswer((current) => current + event.token);
          } else if (event.type === "error") {
            terminal = true;
            setError(event.message);
            setPhase("error");
            setStatus(event.retryable ? "You can try again." : "Request failed.");
          } else if (event.type === "done") {
            terminal = true;
            setPhase("done");
            setStatus("Answer complete.");
          }
        }
      }

      const tail = parseEvent(buffer);
      if (tail?.type === "done") {
        terminal = true;
        setPhase("done");
        setStatus("Answer complete.");
      } else if (tail?.type === "error") {
        terminal = true;
        setError(tail.message);
        setPhase("error");
        setStatus(tail.retryable ? "You can try again." : "Request failed.");
      }

      if (!terminal) {
        throw new Error("The answer stream ended unexpectedly.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The request failed.");
      setPhase("error");
      setStatus("You can try again.");
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
        <span className={styles.productDirection}>Personal + business management</span>
      </header>

      <section className={styles.workspace}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Current baseline · RAG + AI Q&A</p>
          <h1>Ask your knowledge base.</h1>
          <p>
            This is the only product capability currently considered complete.
            The rest of Principles is being rebuilt from a clean foundation.
          </p>
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
            <strong>Could not finish the answer.</strong>
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
              {answer || "Preparing an answer…"}
            </article>
          </section>
        ) : null}

        {phase !== "idle" ? (
          <section className={styles.sourcesSection}>
            <div className={styles.sectionHeading}>
              <h2>Sources</h2>
              <span>{sourceLabel}</span>
            </div>
            {sources.length > 0 ? (
              <div className={styles.sources}>
                {sources.map((source) => (
                  <details className={styles.source} key={source.key}>
                    <summary>
                      <span className={styles.sourceKey}>{source.key}</span>
                      <span>{source.title}</span>
                    </summary>
                    <p>{source.text}</p>
                    <div className={styles.sourceMeta}>
                      <span>{source.provider}</span>
                      {source.score === null ? null : (
                        <span>score {source.score.toFixed(3)}</span>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <p className={styles.emptySources}>
                No RAG sources have been retrieved for this answer.
              </p>
            )}
          </section>
        ) : null}
      </section>
    </main>
  );
}
