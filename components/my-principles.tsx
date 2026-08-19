"use client";

import { Archive, Pencil, RotateCcw } from "lucide-react";
import { type ChangeEvent, useCallback, useEffect, useState } from "react";
import baseStyles from "./decision-workspace.module.css";
import styles from "./judgment-loop.module.css";
import { WorkspaceShell } from "./workspace-shell";

type PrincipleRevisionRecord = {
  createdAt: string;
  description: string | null;
  id: string;
  revision: number;
  statement: string;
};

type PrincipleRecord = {
  createdAt: string;
  description: string | null;
  id: string;
  originDecision: {
    id: string;
    question: string;
    title: string;
  } | null;
  revision: number;
  revisions: PrincipleRevisionRecord[];
  sourceDecisionId: string | null;
  statement: string;
  status: "active" | "revised" | "retired";
  timesApplied: number;
  updatedAt: string;
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

function PrincipleCard({
  item,
  onRefresh,
}: {
  item: PrincipleRecord;
  onRefresh: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editStatement, setEditStatement] = useState(item.statement);
  const [editDescription, setEditDescription] = useState(
    item.description || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleStatementChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setEditStatement(event.target.value);
    },
    []
  );

  const handleDescriptionChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setEditDescription(event.target.value);
    },
    []
  );

  const startEditing = useCallback(() => {
    setEditStatement(item.statement);
    setEditDescription(item.description || "");
    setEditing(true);
    setError("");
  }, [item.description, item.statement]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setError("");
  }, []);

  const saveRevision = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      await fetchJson(`/api/principles/${item.id}`, {
        body: JSON.stringify({
          action: "revise",
          description: editDescription || undefined,
          statement: editStatement,
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      setEditing(false);
      await onRefresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not revise principle."
      );
    } finally {
      setSaving(false);
    }
  }, [editDescription, editStatement, item.id, onRefresh]);

  const retire = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      await fetchJson(`/api/principles/${item.id}`, {
        body: JSON.stringify({ action: "retire" }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      await onRefresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update principle status."
      );
    } finally {
      setSaving(false);
    }
  }, [item.id, onRefresh]);

  const activate = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      await fetchJson(`/api/principles/${item.id}`, {
        body: JSON.stringify({ action: "activate" }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      await onRefresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update principle status."
      );
    } finally {
      setSaving(false);
    }
  }, [item.id, onRefresh]);

  return (
    <article
      className={`${baseStyles.card} ${styles.principleCard}`}
      data-testid="principle-card"
    >
      <div className={styles.principleTopline}>
        <span className={`${styles.lifecycle} ${styles[item.status]}`}>
          {item.status}
        </span>
        <span>Revision {item.revision}</span>
      </div>

      {editing ? (
        <div className={baseStyles.form}>
          <div className={baseStyles.field}>
            <label htmlFor={`edit-statement-${item.id}`}>
              Edit principle statement
            </label>
            <textarea
              id={`edit-statement-${item.id}`}
              onChange={handleStatementChange}
              value={editStatement}
            />
          </div>
          <div className={baseStyles.field}>
            <label htmlFor={`edit-description-${item.id}`}>
              Edit principle nuance
            </label>
            <textarea
              id={`edit-description-${item.id}`}
              onChange={handleDescriptionChange}
              value={editDescription}
            />
          </div>
          <div className={styles.cardActions}>
            <button
              className={baseStyles.primaryButton}
              disabled={saving || !editStatement.trim()}
              onClick={saveRevision}
              type="button"
            >
              Save revision
            </button>
            <button
              className={baseStyles.secondaryButton}
              onClick={cancelEditing}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <strong className={styles.principleStatement}>{item.statement}</strong>
          {item.description ? <p>{item.description}</p> : null}
        </>
      )}

      {error ? <div className={baseStyles.error}>{error}</div> : null}

      <div className={styles.principleMeta}>
        <span>Created {formatDate(item.createdAt)}</span>
        <span>Times applied: {item.timesApplied}</span>
        {item.originDecision ? (
          <a href={`/decisions/${item.originDecision.id}`}>
            Origin: {item.originDecision.question}
          </a>
        ) : (
          <span>Origin decision unavailable</span>
        )}
      </div>

      <details className={styles.revisionHistory}>
        <summary>Revision history</summary>
        <div className={styles.revisionList}>
          {item.revisions.map((revision) => (
            <div key={revision.id}>
              <strong>v{revision.revision}</strong>
              <p>{revision.statement}</p>
              <span>{formatDate(revision.createdAt)}</span>
            </div>
          ))}
        </div>
      </details>

      {editing ? null : (
        <div className={styles.cardActions}>
          <button
            className={baseStyles.secondaryButton}
            onClick={startEditing}
            type="button"
          >
            <Pencil size={14} /> Edit
          </button>
          {item.status === "retired" ? (
            <button
              className={baseStyles.secondaryButton}
              disabled={saving}
              onClick={activate}
              type="button"
            >
              <RotateCcw size={14} /> Reactivate
            </button>
          ) : (
            <button
              className={baseStyles.secondaryButton}
              disabled={saving}
              onClick={retire}
              type="button"
            >
              <Archive size={14} /> Retire
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export function MyPrinciplesWorkspace() {
  const [principles, setPrinciples] = useState<PrincipleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPrinciples = useCallback(async () => {
    const payload = await fetchJson<{ principles: PrincipleRecord[] }>(
      "/api/principles"
    );
    setPrinciples(payload.principles);
  }, []);

  useEffect(() => {
    loadPrinciples()
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load principles."
        )
      )
      .finally(() => setLoading(false));
  }, [loadPrinciples]);

  return (
    <WorkspaceShell active="principles" title="My Principles">
      <section>
        <div className={baseStyles.pageHeader}>
          <div>
            <span className={baseStyles.eyebrow}>What you chose to keep</span>
            <h1>My Principles</h1>
            <p>
              User-owned rules extracted from real decisions, with origin and
              revision history intact.
            </p>
          </div>
        </div>

        {loading ? (
          <div className={baseStyles.loading}>Loading principles…</div>
        ) : null}
        {error ? <div className={baseStyles.error}>{error}</div> : null}
        {!loading && !error && principles.length === 0 ? (
          <div className={baseStyles.empty}>
            <strong>No adopted principles yet.</strong>
            Complete a Decision → Council → Judgment loop, then explicitly adopt
            a principle worth reusing.
          </div>
        ) : null}

        <div className={styles.principlesGrid}>
          {principles.map((item) => (
            <PrincipleCard item={item} key={item.id} onRefresh={loadPrinciples} />
          ))}
        </div>
      </section>
    </WorkspaceShell>
  );
}
