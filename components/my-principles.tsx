"use client";

import { Archive, Pencil, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
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

export function MyPrinciplesWorkspace() {
  const [principles, setPrinciples] = useState<PrincipleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editStatement, setEditStatement] = useState("");
  const [editDescription, setEditDescription] = useState("");

  async function loadPrinciples() {
    const payload = await fetchJson<{ principles: PrincipleRecord[] }>(
      "/api/principles"
    );
    setPrinciples(payload.principles);
  }

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
  }, []);

  async function revise(item: PrincipleRecord) {
    setSaving(item.id);
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
      setEditingId("");
      await loadPrinciples();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not revise principle."
      );
    } finally {
      setSaving("");
    }
  }

  async function setStatus(item: PrincipleRecord, action: "retire" | "activate") {
    setSaving(item.id);
    setError("");
    try {
      await fetchJson(`/api/principles/${item.id}`, {
        body: JSON.stringify({ action }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      await loadPrinciples();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update principle status."
      );
    } finally {
      setSaving("");
    }
  }

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
            <article
              className={`${baseStyles.card} ${styles.principleCard}`}
              data-testid="principle-card"
              key={item.id}
            >
              <div className={styles.principleTopline}>
                <span className={`${styles.lifecycle} ${styles[item.status]}`}>
                  {item.status}
                </span>
                <span>Revision {item.revision}</span>
              </div>

              {editingId === item.id ? (
                <div className={baseStyles.form}>
                  <div className={baseStyles.field}>
                    <label htmlFor={`edit-statement-${item.id}`}>
                      Edit principle statement
                    </label>
                    <textarea
                      id={`edit-statement-${item.id}`}
                      onChange={(event) => setEditStatement(event.target.value)}
                      value={editStatement}
                    />
                  </div>
                  <div className={baseStyles.field}>
                    <label htmlFor={`edit-description-${item.id}`}>
                      Edit principle nuance
                    </label>
                    <textarea
                      id={`edit-description-${item.id}`}
                      onChange={(event) =>
                        setEditDescription(event.target.value)
                      }
                      value={editDescription}
                    />
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      className={baseStyles.primaryButton}
                      disabled={saving === item.id || !editStatement.trim()}
                      onClick={() => revise(item).catch(() => undefined)}
                      type="button"
                    >
                      Save revision
                    </button>
                    <button
                      className={baseStyles.secondaryButton}
                      onClick={() => setEditingId("")}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <strong className={styles.principleStatement}>
                    {item.statement}
                  </strong>
                  {item.description ? <p>{item.description}</p> : null}
                </>
              )}

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

              {editingId !== item.id ? (
                <div className={styles.cardActions}>
                  <button
                    className={baseStyles.secondaryButton}
                    onClick={() => {
                      setEditStatement(item.statement);
                      setEditDescription(item.description || "");
                      setEditingId(item.id);
                    }}
                    type="button"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  {item.status === "retired" ? (
                    <button
                      className={baseStyles.secondaryButton}
                      disabled={saving === item.id}
                      onClick={() =>
                        setStatus(item, "activate").catch(() => undefined)
                      }
                      type="button"
                    >
                      <RotateCcw size={14} /> Reactivate
                    </button>
                  ) : (
                    <button
                      className={baseStyles.secondaryButton}
                      disabled={saving === item.id}
                      onClick={() =>
                        setStatus(item, "retire").catch(() => undefined)
                      }
                      type="button"
                    >
                      <Archive size={14} /> Retire
                    </button>
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </WorkspaceShell>
  );
}
