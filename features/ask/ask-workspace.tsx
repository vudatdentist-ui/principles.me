"use client";

import { T, useI18n } from "@/features/i18n/locale";
import { AutoTextarea } from "@/features/ui/auto-textarea";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { ClientEvidenceReference } from "@/features/evidence/client-reference";
import styles from "./ask-workspace.module.css";

type AskPhase = "idle" | "submitting" | "done" | "error";
import { consumeAskStream, type PersonalContextState, type RetrievalState } from "./stream";

const prompts = [
  "What is reality here?",
  "What problem am I not confronting?",
  "Help me diagnose the root cause.",
  "What would a better machine look like?",
  "Which principle applies here?",
  "What should I reflect on?",
];

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
  const { t } = useI18n();
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
  const activeRequest = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      activeRequest.current?.abort();
    };
  }, []);

  const canSubmit = question.trim().length >= 3 && phase !== "submitting";
  const hasPartialAnswer = answer.trim().length > 0 && phase === "error";
  const sourceLabel = useMemo(() => {
    if (phase === "submitting" && sources.length === 0) return t("Searching…");
    if (sources.length === 0) return t("No sources");
    return sources.length === 1
      ? t("{count} source", { count: sources.length })
      : t("{count} sources", { count: sources.length });
  }, [phase, sources.length, t]);

  async function runAsk(rawQuestion: string) {
    const trimmed = rawQuestion.trim();
    if (trimmed.length < 3 || activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;

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
        signal: controller.signal,
      });

      if (response.status === 401) {
        window.location.reload();
        return;
      }
      if (response.status === 429) throw new Error(t("Limit reached. Try later."));
      if (!response.ok || !response.body) throw new Error(t("Request failed."));

      await consumeAskStream(response.body, (event) => {
        if (!mounted.current || controller.signal.aborted) return;
        if (event.type === "status") setStatus(event.message);
        else if (event.type === "sources") {
          setSources(event.references);
          setKnowledgeState(event.private ?? null);
          setLiveState(event.live ?? null);
          setPersonalState(event.personal ?? null);
        } else if (event.type === "token") setAnswer((current) => current + event.token);
        else if (event.type === "error") {
          setError(event.message);
          setPhase("error");
          setStatus(event.retryable ? "Try again" : "Failed");
        } else if (event.type === "done") {
          setPhase("done");
          setStatus("Complete");
        }
      }, controller.signal);
    } catch (cause) {
      if (!mounted.current) return;
      const stopped = controller.signal.aborted;
      setError(stopped ? t("Stopped before the answer was complete.") : cause instanceof Error ? cause.message : t("Request failed."));
      setPhase("error");
      setStatus(stopped ? "Stopped" : "Try again");
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runAsk(question);
  }

  return (
    <div className={styles.workspace}>
      <section
        aria-label={t("Current knowledge narrative")}
        aria-labelledby="knowledge-title"
        className={styles.hero}
      >
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><T>Knowledge</T></p>
          <h1 id="knowledge-title"><T>What is still unclear?</T></h1>
          <p><T>Ask a question. Inspect the sources before using the answer.</T></p>
        </div>

        <form
          aria-label={t("Knowledge working scene")}
          className={styles.askForm}
          onSubmit={onSubmit}
        >
          <label className={styles.label} htmlFor="question">
            <T>Question</T>
          </label>
          <AutoTextarea
            className={styles.textarea}
            disabled={phase === "submitting"}
            id="question"
            maxLength={4000}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={t("Name the decision, tension, or reality you need to understand.")}
            rows={4}
            value={question}
          />
          <div className={styles.formFooter}>
            <span className={styles.status} aria-live="polite">
              {t(status)}
            </span>
            {phase === "submitting" ? <button className={styles.stop} onClick={() => activeRequest.current?.abort()} type="button"><T>Stop</T></button> : null}
            <button
              className={styles.submit}
              disabled={!canSubmit}
              type="submit"
            >
              {phase === "submitting" ? t("Thinking…") : t("Ask")}
            </button>
          </div>
        </form>
      </section>

      <details className={styles.promptRail}>
        <summary><T>Need a starting question?</T></summary>
        <div>
        {prompts.map((prompt) => (
          <button
            disabled={phase === "submitting"}
            key={prompt}
            onClick={() => setQuestion(t(prompt))}
            type="button"
          >
            {t(prompt)}
          </button>
        ))}
        </div>
      </details>

      {error ? (
        <section className={styles.error} role="alert">
          <strong>
            {hasPartialAnswer ? t("Answer paused.") : t("Could not finish.")}
          </strong>
          <span>
            {t(error)}
            {hasPartialAnswer
              ? ` ${t("The answer already received is kept below.")}`
              : null}
          </span>
          {lastQuestion.current ? (
            <button
              className={styles.retry}
              onClick={() => void runAsk(lastQuestion.current)}
              type="button"
            >
              <T>Try again</T>
            </button>
          ) : null}
        </section>
      ) : null}

      {answer || phase === "submitting" ? (
        <section className={styles.answerSection} aria-live="polite">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}><T>Answer</T></p>
              <h2 aria-label={t("Answer")}><T>What the evidence suggests</T></h2>
            </div>
            <span>{sourceLabel}</span>
          </div>
          <div className={styles.answerContext}>
            <span><T>Question</T></span>
            <strong>{lastQuestion.current || question}</strong>
          </div>
          <article aria-busy={phase === "submitting"} className={styles.answer}>
            {answer ? <AnswerContent text={answer} /> : t("Preparing…")}
          </article>
          {phase === "done" ? (
            <div className={styles.bridge}>
              <div>
                <span><T>Next decision</T></span>
                <strong><T>What should this change in your next decision?</T></strong>
              </div>
              <a href="/"><T>Continue in Me →</T></a>
            </div>
          ) : null}
        </section>
      ) : null}

      {phase !== "idle" ? (
        <section className={styles.sourcesSection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}><T>Sources</T></p>
              <h2><T>What the evidence stands on</T></h2>
            </div>
            <span>{sourceLabel}</span>
          </div>
          <div className={styles.retrievalGrid}>
            <div className={styles.retrievalCard}>
              <span><T>Shared Principles knowledge</T></span>
              <strong>{t(retrievalLabel(knowledgeState, "knowledge"))}</strong>
            </div>
            <div className={styles.retrievalCard}>
              <span><T>Personal evolution context</T></span>
              <strong>
                {personalState === "ok"
                   ? t("Connected")
                   : personalState === "empty"
                     ? t("Empty")
                     : t("Not checked")}
              </strong>
            </div>
            <div className={styles.retrievalCard}>
              <span><T>Live public search</T></span>
              <strong>{t(retrievalLabel(liveState, "live"))}</strong>
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
                        <T>Open</T>
                      </a>
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <p className={styles.emptySources}>
              {knowledgeState === "unavailable"
                ? t("Shared knowledge unavailable.")
                : knowledgeState === "empty"
                  ? t("No shared match.")
                  : t("No sources returned.")}
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
      const body = lines.slice(1).join(" ");
      return (
        <Fragment key={keyFor(`heading-${block}`)}>
          <h3>{inlineMarkdown(firstLine.replace(/^#{1,3}\s+/, ""))}</h3>
          {body ? <p>{inlineMarkdown(body)}</p> : null}
        </Fragment>
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
