"use client";

// biome-ignore-all lint/performance/noJsxPropsBind: Interactive surface handlers are intentionally local.

import { ArrowUp } from "lucide-react";
import { useState } from "react";
import {
  type AskClarify,
  type AskComplete,
  type AskResponse,
  cortexAskClient,
} from "@/lib/cortex/ask-client";
import styles from "./ask-thinking-session.module.css";

function ResultSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.section}>
      <div className={styles.label}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

export function AskThinkingSession() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function run() {
    if (busy || input.trim().length < 3) {
      return;
    }
    setBusy(true);
    setError("");
    setResponse(null);
    setAnswers({});
    try {
      setResponse(await cortexAskClient.run(input.trim()));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ask failed.");
    } finally {
      setBusy(false);
    }
  }

  async function continueRun(skip = false) {
    if (response?.type !== "clarify" || busy) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const submitted = skip ? {} : answers;
      setResponse(await cortexAskClient.continue(response.runId, submitted));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ask failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDecision() {
    if (saving) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const request = await fetch("/api/decisions", {
        body: JSON.stringify({ input }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await request.json()) as {
        error?: string;
        decision?: { id: string };
      };
      if (!request.ok || !payload.decision) {
        throw new Error(payload.error ?? "Could not save decision.");
      }
      window.location.assign(`/decisions/${payload.decision.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save decision."
      );
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <h1 className={styles.title}>Ask your Principles</h1>
          <a className={styles.link} href="/decisions">
            Decisions
          </a>
        </header>

        <div className={styles.composer}>
          <textarea
            aria-label="Ask your Principles"
            className={styles.textarea}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                run().catch(() => undefined);
              }
            }}
            value={input}
          />
          <button
            aria-label="Ask"
            className={styles.submit}
            disabled={busy || input.trim().length < 3}
            onClick={() => run().catch(() => undefined)}
            type="button"
          >
            <ArrowUp size={17} />
          </button>
        </div>

        {busy ? <div className={styles.state}>Thinking…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}

        {response?.type === "clarify" ? (
          <Clarification
            answers={answers}
            busy={busy}
            onAnswers={setAnswers}
            onContinue={() => continueRun(false).catch(() => undefined)}
            onSkip={() => continueRun(true).catch(() => undefined)}
            response={response}
          />
        ) : null}

        {response?.type === "complete" ? (
          <Result
            onSave={() => saveDecision().catch(() => undefined)}
            response={response}
            saving={saving}
          />
        ) : null}
      </div>
    </main>
  );
}

function Clarification({
  response,
  answers,
  onAnswers,
  onContinue,
  onSkip,
  busy,
}: {
  response: AskClarify;
  answers: Record<string, string>;
  onAnswers: (answers: Record<string, string>) => void;
  onContinue: () => void;
  onSkip: () => void;
  busy: boolean;
}) {
  return (
    <section className={styles.clarify}>
      {response.questions.map((question) => (
        <div key={question.id}>
          <p className={styles.question}>{question.prompt}</p>
          {question.options?.length ? (
            <div className={styles.options}>
              {question.options.map((option) => (
                <button
                  className={`${styles.option} ${answers[question.id] === option ? styles.optionSelected : ""}`}
                  key={option}
                  onClick={() =>
                    onAnswers({ ...answers, [question.id]: option })
                  }
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}
          <input
            aria-label="Other context"
            className={styles.answer}
            onChange={(event) =>
              onAnswers({ ...answers, [question.id]: event.target.value })
            }
            placeholder="Something else"
            value={answers[question.id] ?? ""}
          />
        </div>
      ))}
      <div className={styles.actions}>
        <button
          className={styles.primary}
          disabled={busy}
          onClick={onContinue}
          type="button"
        >
          Continue
        </button>
        <button
          className={styles.secondary}
          disabled={busy}
          onClick={onSkip}
          type="button"
        >
          Continue with available information
        </button>
      </div>
    </section>
  );
}

function Result({
  response,
  saving,
  onSave,
}: {
  response: AskComplete;
  saving: boolean;
  onSave: () => void;
}) {
  const { result } = response;
  return (
    <section className={styles.result}>
      {result.framing ? (
        <ResultSection label="Framing">
          <p className={styles.value}>{result.framing}</p>
        </ResultSection>
      ) : null}
      {result.crux ? (
        <ResultSection label="Crux">
          <p className={styles.value}>{result.crux}</p>
        </ResultSection>
      ) : null}
      {result.evidence?.length ? (
        <ResultSection label="Evidence">
          <ul className={styles.list}>
            {result.evidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ResultSection>
      ) : null}
      {result.conflicts?.length ? (
        <ResultSection label="Conflicts">
          <ul className={styles.list}>
            {result.conflicts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ResultSection>
      ) : null}
      {result.read ? (
        <ResultSection label="My read">
          <p className={styles.value}>{result.read}</p>
        </ResultSection>
      ) : null}
      {result.confidence ? (
        <ResultSection label="Confidence">
          <p className={styles.value}>{result.confidence}</p>
        </ResultSection>
      ) : null}
      {result.wouldChange ? (
        <ResultSection label="Would change this">
          <p className={styles.value}>{result.wouldChange}</p>
        </ResultSection>
      ) : null}

      {result.sources?.length ? (
        <div className={styles.sources}>
          {result.sources.map((source) => (
            <details className={styles.source} key={source.id}>
              <summary>{source.title}</summary>
              {source.detail ? <p>{source.detail}</p> : null}
            </details>
          ))}
        </div>
      ) : null}

      <div className={styles.actions}>
        <button
          className={styles.primary}
          disabled={saving}
          onClick={onSave}
          type="button"
        >
          {saving ? "Saving…" : "Save as Decision"}
        </button>
      </div>
    </section>
  );
}
