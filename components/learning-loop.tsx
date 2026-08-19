"use client";

import { CalendarClock, Check, RefreshCw, X } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import styles from "./learning-loop.module.css";

type OutcomeRecord = {
  createdAt: string;
  decisionQuality: "yes" | "no" | "unclear";
  id: string;
  lessons: string | null;
  reasoningQuality: "yes" | "no" | "partially";
  result: string;
  verdict: "positive" | "mixed" | "negative" | "too_early";
};

type PrincipleRecord = {
  id: string;
  revision: number;
  statement: string;
  status: "active" | "revised" | "retired";
};

type AssumptionReviewRecord = {
  assumptionText: string;
  id: string;
  note: string | null;
  outcomeId: string;
  verdict: "correct" | "incorrect" | "unclear";
};

type PrincipleReviewRecord = {
  action: "keep" | "revise" | "retire";
  id: string;
  outcomeId: string;
  principleId: string;
  resultingRevision: number;
  resultingStatement: string;
};

type LearningReviewPayload = {
  review: {
    assumptions: string[];
    assumptionReviews: AssumptionReviewRecord[];
    decision: {
      reviewAt: string | null;
      reviewedAt: string | null;
      status:
        | "draft"
        | "exploring"
        | "decided"
        | "review_due"
        | "reviewed"
        | "archived";
    };
    outcomes: OutcomeRecord[];
    principleReviews: PrincipleReviewRecord[];
    principles: PrincipleRecord[];
  };
};

type AssumptionDraft = {
  assumptionText: string;
  note: string;
  verdict: "correct" | "incorrect" | "unclear";
};

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }
  return payload;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function PrincipleReviewCard({
  decisionId,
  latestOutcomeId,
  onSaved,
  principle,
  reviewed,
}: {
  decisionId: string;
  latestOutcomeId: string;
  onSaved: () => Promise<void>;
  principle: PrincipleRecord;
  reviewed: PrincipleReviewRecord | null;
}) {
  const [mode, setMode] = useState<"idle" | "revise">("idle");
  const [statement, setStatement] = useState(principle.statement);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submitAction = useCallback(
    async (action: "keep" | "retire" | "revise") => {
      setBusy(true);
      setError("");
      try {
        await fetchJson(`/api/decisions/${decisionId}/principle-review`, {
          body: JSON.stringify({
            action,
            outcomeId: latestOutcomeId,
            principleId: principle.id,
            ...(action === "revise" ? { revisedStatement: statement } : {}),
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        setMode("idle");
        await onSaved();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not save principle review."
        );
      } finally {
        setBusy(false);
      }
    },
    [decisionId, latestOutcomeId, onSaved, principle.id, statement]
  );

  const keep = useCallback(() => {
    submitAction("keep").catch(() => undefined);
  }, [submitAction]);
  const retire = useCallback(() => {
    submitAction("retire").catch(() => undefined);
  }, [submitAction]);
  const revise = useCallback(() => {
    submitAction("revise").catch(() => undefined);
  }, [submitAction]);
  const startRevise = useCallback(() => setMode("revise"), []);
  const cancelRevise = useCallback(() => setMode("idle"), []);
  const changeStatement = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) =>
      setStatement(event.target.value),
    []
  );

  return (
    <div
      className={styles.principleReview}
      data-testid="learning-principle-review"
    >
      <strong>“{principle.statement}”</strong>
      <span>
        Revision {principle.revision} · {principle.status}
      </span>
      {reviewed ? (
        <div
          className={styles.savedAction}
          data-testid="principle-review-saved"
        >
          <Check size={13} /> {reviewed.action} · resulting revision{" "}
          {reviewed.resultingRevision}
        </div>
      ) : null}
      {!reviewed && mode === "idle" ? (
        <div className={styles.actions}>
          <button disabled={busy} onClick={keep} type="button">
            Keep
          </button>
          <button disabled={busy} onClick={startRevise} type="button">
            Revise
          </button>
          <button disabled={busy} onClick={retire} type="button">
            Retire
          </button>
        </div>
      ) : null}
      {!reviewed && mode === "revise" ? (
        <div className={styles.reviseForm}>
          <label>
            Revised principle
            <textarea onChange={changeStatement} value={statement} />
          </label>
          <div className={styles.actions}>
            <button
              disabled={busy || statement.trim().length < 3}
              onClick={revise}
              type="button"
            >
              Save revision
            </button>
            <button disabled={busy} onClick={cancelRevise} type="button">
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}

export function LearningLoop({ decisionId }: { decisionId: string }) {
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState<LearningReviewPayload["review"] | null>(
    null
  );
  const [assumptions, setAssumptions] = useState<AssumptionDraft[]>([]);
  const [customDate, setCustomDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const payload = await fetchJson<LearningReviewPayload>(
      `/api/decisions/${decisionId}/learning-review`
    );
    setReview(payload.review);
    setAssumptions(
      payload.review.assumptions.map((assumptionText) => ({
        assumptionText,
        note: "",
        verdict: "unclear" as const,
      }))
    );
  }, [decisionId]);

  useEffect(() => {
    load().catch((caught) => {
      setError(
        caught instanceof Error ? caught.message : "Could not load review."
      );
    });
  }, [load]);

  const latestOutcome = review?.outcomes[0] ?? null;
  const latestAssumptionReviews = useMemo(
    () =>
      latestOutcome
        ? (review?.assumptionReviews.filter(
            (item) => item.outcomeId === latestOutcome.id
          ) ?? [])
        : [],
    [latestOutcome, review?.assumptionReviews]
  );

  const toggleOpen = useCallback(() => setOpen((current) => !current), []);
  const close = useCallback(() => setOpen(false), []);
  const changeCustomDate = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setCustomDate(event.target.value),
    []
  );

  const schedule = useCallback(
    async (preset: "30_days" | "90_days" | "none" | "custom") => {
      setBusy(true);
      setError("");
      try {
        await fetchJson(`/api/decisions/${decisionId}/review-schedule`, {
          body: JSON.stringify(
            preset === "custom" ? { customDate, preset } : { preset }
          ),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        await load();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not schedule review."
        );
      } finally {
        setBusy(false);
      }
    },
    [customDate, decisionId, load]
  );

  const schedule30 = useCallback(() => {
    schedule("30_days").catch(() => undefined);
  }, [schedule]);
  const schedule90 = useCallback(() => {
    schedule("90_days").catch(() => undefined);
  }, [schedule]);
  const scheduleNone = useCallback(() => {
    schedule("none").catch(() => undefined);
  }, [schedule]);
  const scheduleCustom = useCallback(() => {
    schedule("custom").catch(() => undefined);
  }, [schedule]);

  const changeAssumption = useCallback(
    (event: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
      const { dataset, value } = event.target;
      const index = Number(dataset.index);
      const field = dataset.field as "verdict" | "note";
      setAssumptions(
        (current) =>
          current.map((item, itemIndex) =>
            itemIndex === index ? { ...item, [field]: value } : item
          ) as AssumptionDraft[]
      );
    },
    []
  );

  const saveReview = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      setBusy(true);
      setError("");
      try {
        await fetchJson(`/api/decisions/${decisionId}/outcome`, {
          body: JSON.stringify({
            assumptionReviews: assumptions,
            decisionQuality: String(data.get("decisionQuality") || "unclear"),
            lessons: String(data.get("lessons") || ""),
            reasoningQuality: String(
              data.get("reasoningQuality") || "partially"
            ),
            result: String(data.get("result") || ""),
            verdict: String(data.get("verdict") || "too_early"),
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        form.reset();
        await load();
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Could not save review."
        );
      } finally {
        setBusy(false);
      }
    },
    [assumptions, decisionId, load]
  );

  if (!open) {
    return (
      <button
        className={styles.launcher}
        data-testid="learning-loop-launcher"
        onClick={toggleOpen}
        type="button"
      >
        <RefreshCw size={15} /> Review & learn
      </button>
    );
  }

  return (
    <aside className={styles.drawer} data-testid="learning-loop">
      <div className={styles.header}>
        <div>
          <span>Learning loop</span>
          <h2>Review reality, not just the decision</h2>
        </div>
        <button aria-label="Close learning loop" onClick={close} type="button">
          <X size={16} />
        </button>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}

      <section>
        <h3>
          <CalendarClock size={14} /> Review this decision later?
        </h3>
        <div className={styles.actions}>
          <button disabled={busy} onClick={schedule30} type="button">
            30 days
          </button>
          <button disabled={busy} onClick={schedule90} type="button">
            90 days
          </button>
          <button disabled={busy} onClick={scheduleNone} type="button">
            No review
          </button>
        </div>
        <div className={styles.customDate}>
          <input
            aria-label="Custom review date"
            min={new Date().toISOString().slice(0, 10)}
            onChange={changeCustomDate}
            type="date"
            value={customDate}
          />
          <button
            disabled={busy || !customDate}
            onClick={scheduleCustom}
            type="button"
          >
            Set custom
          </button>
        </div>
        {review?.decision.reviewAt ? (
          <p className={styles.savedAction} data-testid="review-scheduled">
            Scheduled for {formatDate(review.decision.reviewAt)}
          </p>
        ) : (
          <p className={styles.muted}>No future review scheduled.</p>
        )}
      </section>

      <section>
        <h3>Decision review</h3>
        <p className={styles.muted}>
          Separate what happened from whether the decision and reasoning were
          good.
        </p>
        <form className={styles.reviewForm} onSubmit={saveReview}>
          <label>
            What happened?
            <textarea name="result" required />
          </label>
          <label>
            Outcome
            <select defaultValue="too_early" name="verdict">
              <option value="positive">Positive</option>
              <option value="mixed">Mixed</option>
              <option value="negative">Negative</option>
              <option value="too_early">Too early</option>
            </select>
          </label>
          <div className={styles.twoColumns}>
            <label>
              Was the decision good?
              <select defaultValue="unclear" name="decisionQuality">
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unclear">Unclear</option>
              </select>
            </label>
            <label>
              Was the reasoning good?
              <select defaultValue="partially" name="reasoningQuality">
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="partially">Partially</option>
              </select>
            </label>
          </div>

          {assumptions.length ? (
            <div className={styles.assumptions}>
              <h4>Assumption review</h4>
              {assumptions.map((item, index) => (
                <div
                  data-testid="assumption-review-input"
                  key={item.assumptionText}
                >
                  <strong>{item.assumptionText}</strong>
                  <select
                    aria-label={`Was assumption ${index + 1} correct?`}
                    data-field="verdict"
                    data-index={index}
                    onChange={changeAssumption}
                    value={item.verdict}
                  >
                    <option value="correct">Correct</option>
                    <option value="incorrect">Incorrect</option>
                    <option value="unclear">Unclear</option>
                  </select>
                  <input
                    aria-label={`Assumption ${index + 1} note`}
                    data-field="note"
                    data-index={index}
                    onChange={changeAssumption}
                    placeholder="What did reality show?"
                    value={item.note}
                  />
                </div>
              ))}
            </div>
          ) : null}

          <label>
            What did you learn?
            <textarea name="lessons" />
          </label>
          <button disabled={busy} type="submit">
            {busy ? "Saving review…" : "Save decision review"}
          </button>
        </form>
      </section>

      {latestOutcome ? (
        <section data-testid="latest-learning-review">
          <h3>Latest reality check</h3>
          <p>{latestOutcome.result}</p>
          <div className={styles.qualityGrid}>
            <span>Outcome: {latestOutcome.verdict.replace("_", " ")}</span>
            <span>Decision good: {latestOutcome.decisionQuality}</span>
            <span>Reasoning good: {latestOutcome.reasoningQuality}</span>
          </div>
          {latestAssumptionReviews.map((item) => (
            <div className={styles.savedAssumption} key={item.id}>
              <strong>{item.assumptionText}</strong>
              <span>{item.verdict}</span>
              {item.note ? <p>{item.note}</p> : null}
            </div>
          ))}
        </section>
      ) : null}

      {latestOutcome && review?.principles.length ? (
        <section>
          <h3>Principle review</h3>
          <p className={styles.muted}>
            Keep what survived reality. Revise or retire what did not.
          </p>
          {review.principles.map((principle) => (
            <PrincipleReviewCard
              decisionId={decisionId}
              key={principle.id}
              latestOutcomeId={latestOutcome.id}
              onSaved={load}
              principle={principle}
              reviewed={
                review.principleReviews.find(
                  (item) =>
                    item.outcomeId === latestOutcome.id &&
                    item.principleId === principle.id
                ) ?? null
              }
            />
          ))}
        </section>
      ) : null}
    </aside>
  );
}
