"use client";

import { type ChangeEvent, useCallback, useState } from "react";
import type { JournalCandidate } from "@/lib/journal/types";
import styles from "./journal.module.css";

type JournalEntryDetailProps = {
  candidate: JournalCandidate | null;
  entry: {
    body: string;
    id: string;
    occurredAt: Date | string;
  };
  principles: Array<{
    id: string;
    relation: "origin" | "supports";
    revision: number;
    statement: string;
    status: "active" | "revised" | "retired";
  }>;
  reflection: {
    observation: string | null;
    text: string;
  } | null;
};

export function JournalEntryView({
  candidate: initialCandidate,
  entry,
  principles,
  reflection,
}: JournalEntryDetailProps) {
  const [reflectionText, setReflectionText] = useState(reflection?.text ?? "");
  const [observation, setObservation] = useState(reflection?.observation ?? "");
  const [candidate, setCandidate] = useState(initialCandidate);
  const [candidateStatement, setCandidateStatement] = useState(
    initialCandidate?.statement ?? ""
  );
  const [candidateRationale, setCandidateRationale] = useState(
    initialCandidate?.rationale ?? ""
  );
  const [showCandidate, setShowCandidate] = useState(Boolean(initialCandidate));
  const [question, setQuestion] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveReflection = useCallback(async () => {
    const text = reflectionText.trim();
    if (!text || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/journal/${entry.id}/reflection`, {
      body: JSON.stringify({
        candidate:
          showCandidate && candidateStatement.trim()
            ? {
                rationale: candidateRationale.trim() || null,
                statement: candidateStatement.trim(),
              }
            : undefined,
        observation: observation.trim() || null,
        text,
      }),
      headers: { "content-type": "application/json" },
      method: "PUT",
    });
    setSaving(false);
    if (!response.ok) {
      setError("Could not save reflection.");
      return;
    }
    window.location.reload();
  }, [
    candidateRationale,
    candidateStatement,
    entry.id,
    observation,
    reflectionText,
    saving,
    showCandidate,
  ]);

  const askQuestion = useCallback(async () => {
    setError(null);
    const response = await fetch(`/api/journal/${entry.id}/reflection/assist`, {
      method: "POST",
    });
    if (!response.ok) {
      setError("Could not get a question.");
      return;
    }
    const payload = (await response.json()) as {
      suggestion: { question?: string };
    };
    setQuestion(payload.suggestion.question ?? null);
  }, [entry.id]);

  const candidateAction = useCallback(
    async (action: "edit" | "reject" | "adopt") => {
      if (candidate?.status !== "pending") {
        return;
      }
      setSaving(true);
      setError(null);
      const response = await fetch(`/api/journal/${entry.id}/reflection`, {
        body: JSON.stringify({
          action,
          candidateId: candidate.id,
          ...(action === "reject"
            ? {}
            : {
                rationale: candidateRationale.trim() || null,
                statement: candidateStatement.trim(),
              }),
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      setSaving(false);
      if (!response.ok) {
        setError("Could not update candidate.");
        return;
      }
      if (action === "reject") {
        setCandidate({ ...candidate, status: "rejected" });
        return;
      }
      if (action === "edit") {
        setCandidate({
          ...candidate,
          rationale: candidateRationale.trim() || null,
          statement: candidateStatement.trim(),
        });
        return;
      }
      window.location.reload();
    },
    [candidate, candidateRationale, candidateStatement, entry.id]
  );

  const editCandidate = useCallback(
    () => candidateAction("edit"),
    [candidateAction]
  );
  const rejectCandidate = useCallback(
    () => candidateAction("reject"),
    [candidateAction]
  );
  const adoptCandidate = useCallback(
    () => candidateAction("adopt"),
    [candidateAction]
  );
  const revealCandidate = useCallback(() => setShowCandidate(true), []);
  const handleReflectionChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setReflectionText(event.target.value);
    },
    []
  );
  const handleObservationChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setObservation(event.target.value);
    },
    []
  );
  const handleCandidateStatementChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setCandidateStatement(event.target.value);
    },
    []
  );
  const handleCandidateRationaleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setCandidateRationale(event.target.value);
    },
    []
  );

  return (
    <>
      <p className={styles.experience}>{entry.body}</p>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.label}>Reflection</span>
          <button
            className={styles.quietAction}
            onClick={askQuestion}
            type="button"
          >
            Question
          </button>
        </div>
        {question ? <p className={styles.assistQuestion}>{question}</p> : null}
        <textarea
          aria-label="Reflection"
          className={styles.reflectionArea}
          onChange={handleReflectionChange}
          placeholder="What did you learn?"
          value={reflectionText}
        />
        <textarea
          aria-label="Pattern or observation"
          className={styles.smallArea}
          onChange={handleObservationChange}
          placeholder="Pattern / observation"
          value={observation}
        />

        {showCandidate ? (
          <div className={styles.candidate}>
            <div className={styles.label}>Candidate principle</div>
            <textarea
              aria-label="Candidate principle"
              className={styles.candidateInput}
              disabled={candidate?.status === "adopted"}
              onChange={handleCandidateStatementChange}
              placeholder="IF context, THEN action."
              value={candidateStatement}
            />
            <textarea
              aria-label="Candidate rationale"
              className={styles.smallArea}
              disabled={candidate?.status === "adopted"}
              onChange={handleCandidateRationaleChange}
              placeholder="Why this rule?"
              value={candidateRationale}
            />
            {candidate ? (
              <div className={styles.actions}>
                <span className={styles.status}>{candidate.status}</span>
                {candidate.status === "pending" ? (
                  <>
                    <button
                      className={styles.quietAction}
                      disabled={saving || !candidateStatement.trim()}
                      onClick={editCandidate}
                      type="button"
                    >
                      Save edit
                    </button>
                    <button
                      className={styles.quietAction}
                      disabled={saving}
                      onClick={rejectCandidate}
                      type="button"
                    >
                      Reject
                    </button>
                    <button
                      className={styles.action}
                      disabled={saving || !candidateStatement.trim()}
                      onClick={adoptCandidate}
                      type="button"
                    >
                      Adopt
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <button
            className={styles.quietAction}
            onClick={revealCandidate}
            type="button"
          >
            + Candidate principle
          </button>
        )}

        <div className={styles.actions}>
          <button
            className={styles.action}
            disabled={saving || !reflectionText.trim()}
            onClick={saveReflection}
            type="button"
          >
            {saving ? "Saving" : "Save reflection"}
          </button>
        </div>
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>

      {principles.length ? (
        <section className={styles.section}>
          <div className={styles.label}>Principles</div>
          {principles.map((principle) => (
            <p className={styles.entryBody} key={principle.id}>
              {principle.statement}
            </p>
          ))}
        </section>
      ) : null}
    </>
  );
}
