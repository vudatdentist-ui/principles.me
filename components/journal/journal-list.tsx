"use client";

import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import styles from "./journal.module.css";

type EntrySummary = {
  body: string;
  candidateStatus: "pending" | "adopted" | "rejected" | null;
  createdAt: Date | string;
  id: string;
  observation: string | null;
  occurredAt: Date | string;
  reflectedAt: Date | string | null;
  reflection: string | null;
  updatedAt: Date | string;
};

function dateKey(value: Date | string) {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function timeLabel(value: Date | string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function entryStatusLabel(entry: EntrySummary) {
  if (entry.candidateStatus === "pending") {
    return " · Candidate";
  }
  if (entry.candidateStatus === "adopted") {
    return " · Principle";
  }
  return "";
}

export function JournalList({ entries }: { entries: EntrySummary[] }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => {
    const groups = new Map<string, EntrySummary[]>();
    for (const entry of entries) {
      const key = dateKey(entry.occurredAt);
      const group = groups.get(key) ?? [];
      group.push(entry);
      groups.set(key, group);
    }
    return [...groups.entries()];
  }, [entries]);

  const createEntry = useCallback(async () => {
    const text = body.trim();
    if (!text || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetch("/api/journal", {
      body: JSON.stringify({ body: text }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      setSaving(false);
      setError("Could not save entry.");
      return;
    }
    const payload = (await response.json()) as { entry: { id: string } };
    window.location.assign(`/journal/${payload.entry.id}`);
  }, [body, saving]);

  const handleBodyChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setBody(event.target.value);
    },
    []
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        createEntry();
      }
    },
    [createEntry]
  );

  return (
    <>
      <section className={styles.composer}>
        <textarea
          aria-label="New journal entry"
          autoFocus
          className={styles.textarea}
          onChange={handleBodyChange}
          onKeyDown={handleKeyDown}
          placeholder="What happened?"
          value={body}
        />
        <div className={styles.composerFooter}>
          <button
            className={styles.quietAction}
            disabled={!body.trim() || saving}
            onClick={createEntry}
            type="button"
          >
            {saving ? "Saving" : "Save →"}
          </button>
        </div>
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>

      {grouped.length ? (
        grouped.map(([day, dayEntries]) => (
          <section className={styles.day} key={day}>
            <div className={styles.dayLabel}>{day}</div>
            {dayEntries.map((entry) => (
              <a
                className={styles.entryLink}
                href={`/journal/${entry.id}`}
                key={entry.id}
              >
                <p className={styles.entryBody}>{entry.body}</p>
                <div className={styles.entryMeta}>
                  {timeLabel(entry.occurredAt)}
                  {entry.reflection ? " · Reflected" : " · Reflect →"}
                  {entryStatusLabel(entry)}
                </div>
              </a>
            ))}
          </section>
        ))
      ) : (
        <p className={styles.empty}>No entries yet.</p>
      )}
    </>
  );
}
