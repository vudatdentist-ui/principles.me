"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import styles from "./principles-registry.module.css";
import { WorkspaceShell } from "./workspace-shell";

type PrincipleOrigin = {
  href?: string;
  kind: "decision" | "journal" | "problem" | "manual" | "team";
  label: string;
  sourceId?: string;
};

type PrincipleRevisionRecord = {
  createdAt: string;
  description: string | null;
  id: string;
  revision: number;
  statement: string;
};

type RelatedDecision = {
  createdAt: string;
  id: string;
  outcomeId: string | null;
  outcomeResult: string | null;
  outcomeVerdict: "positive" | "mixed" | "negative" | "too_early" | null;
  question: string;
  relation: "suggested" | "applied" | "challenged" | "created" | "adopted";
  title: string;
};

type PrincipleRecord = {
  changedCount: number;
  createdAt: string;
  description: string | null;
  id: string;
  origins: PrincipleOrigin[];
  relatedDecisions: RelatedDecision[];
  revision: number;
  revisions: PrincipleRevisionRecord[];
  sourceDecisionId: string | null;
  statement: string;
  status: "active" | "revised" | "retired";
  timesUsed: number;
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

function changeLabel(count: number) {
  if (count === 0) {
    return null;
  }
  return count === 1 ? "changed once" : `changed ${count} times`;
}

function originKindLabel(kind: PrincipleOrigin["kind"]) {
  const labels: Record<PrincipleOrigin["kind"], string> = {
    decision: "Decision",
    journal: "Journal",
    manual: "Manual",
    problem: "Problem",
    team: "Team",
  };
  return labels[kind];
}

function uniqueDecisions(rows: RelatedDecision[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) {
      return false;
    }
    seen.add(row.id);
    return true;
  });
}

function PrincipleItem({
  item,
  isOpen,
  onRefresh,
  onToggle,
}: {
  item: PrincipleRecord;
  isOpen: boolean;
  onRefresh: () => Promise<void>;
  onToggle: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editStatement, setEditStatement] = useState(item.statement);
  const [editDescription, setEditDescription] = useState(
    item.description ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const changed = changeLabel(item.changedCount);
  const supporting = uniqueDecisions(
    item.relatedDecisions.filter(
      (row) =>
        row.relation === "applied" ||
        row.relation === "adopted" ||
        row.relation === "created"
    )
  );
  const challenges = uniqueDecisions(
    item.relatedDecisions.filter((row) => row.relation === "challenged")
  );
  const outcomes = item.relatedDecisions.filter((row) => row.outcomeId);

  const handleToggle = useCallback(() => {
    onToggle(item.id);
  }, [item.id, onToggle]);

  const handleEditStatementChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setEditStatement(event.target.value);
    },
    []
  );

  const handleEditDescriptionChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setEditDescription(event.target.value);
    },
    []
  );

  const startEditing = useCallback(() => {
    setEditStatement(item.statement);
    setEditDescription(item.description ?? "");
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

  const updateStatus = useCallback(
    async (action: "retire" | "activate") => {
      setSaving(true);
      setError("");
      try {
        await fetchJson(`/api/principles/${item.id}`, {
          body: JSON.stringify({ action }),
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
    },
    [item.id, onRefresh]
  );

  const activate = useCallback(() => updateStatus("activate"), [updateStatus]);
  const retire = useCallback(() => updateStatus("retire"), [updateStatus]);

  return (
    <article className={styles.item} data-testid="principle-card">
      <button
        aria-expanded={isOpen}
        className={styles.rowButton}
        onClick={handleToggle}
        type="button"
      >
        <strong className={styles.statement}>{item.statement}</strong>
        <span className={styles.meta}>
          <span>Used {item.timesUsed} times</span>
          {changed ? <span className={styles.dot}>{changed}</span> : null}
          {item.status === "retired" ? (
            <span className={styles.dot}>Retired</span>
          ) : null}
        </span>
      </button>

      {isOpen ? (
        <div className={styles.detail}>
          {editing ? (
            <div className={styles.editForm}>
              <div className={styles.field}>
                <label htmlFor={`edit-statement-${item.id}`}>Statement</label>
                <textarea
                  id={`edit-statement-${item.id}`}
                  onChange={handleEditStatementChange}
                  value={editStatement}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor={`edit-description-${item.id}`}>Notes</label>
                <textarea
                  id={`edit-description-${item.id}`}
                  onChange={handleEditDescriptionChange}
                  value={editDescription}
                />
              </div>
              <div className={styles.actions}>
                <button
                  className={styles.primaryButton}
                  disabled={saving || !editStatement.trim()}
                  onClick={saveRevision}
                  type="button"
                >
                  Save revision
                </button>
                <button
                  className={styles.textButton}
                  onClick={cancelEditing}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : item.description ? (
            <p className={styles.description}>{item.description}</p>
          ) : null}

          {error ? <div className={styles.error}>{error}</div> : null}

          <section className={styles.section}>
            <h2>Origin</h2>
            <div className={styles.originList}>
              {item.origins.map((origin, index) => (
                <div
                  className={styles.origin}
                  key={`${origin.kind}-${origin.sourceId ?? index}`}
                >
                  <span>{originKindLabel(origin.kind)} · </span>
                  {origin.href ? (
                    <a href={origin.href}>{origin.label}</a>
                  ) : (
                    origin.label
                  )}
                </div>
              ))}
            </div>
          </section>

          {supporting.length > 0 ? (
            <section className={styles.section}>
              <h2>Supporting decisions</h2>
              <div className={styles.relatedList}>
                {supporting.map((related) => (
                  <div className={styles.related} key={related.id}>
                    <a href={`/decisions/${related.id}`}>{related.title}</a>
                    <span className={styles.relation}>{related.relation}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {challenges.length > 0 ? (
            <section className={styles.section}>
              <h2>Challenges</h2>
              <div className={styles.relatedList}>
                {challenges.map((related) => (
                  <div className={styles.related} key={related.id}>
                    <a href={`/decisions/${related.id}`}>{related.title}</a>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {outcomes.length > 0 ? (
            <section className={styles.section}>
              <h2>Usage & outcomes</h2>
              <div className={styles.relatedList}>
                {outcomes.map((related) => (
                  <div
                    className={styles.related}
                    key={`${related.id}-${related.outcomeId}`}
                  >
                    <a href={`/decisions/${related.id}`}>{related.title}</a>
                    {related.outcomeVerdict ? (
                      <span className={styles.relation}>
                        {related.outcomeVerdict}
                      </span>
                    ) : null}
                    {related.outcomeResult ? (
                      <span className={styles.outcome}>
                        {related.outcomeResult}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className={styles.section}>
            <h2>History</h2>
            <div className={styles.revisionList}>
              {item.revisions.map((revision) => (
                <div className={styles.revision} key={revision.id}>
                  <strong>v{revision.revision}</strong>
                  <span>{revision.statement}</span>
                </div>
              ))}
            </div>
          </section>

          {editing ? null : (
            <div className={styles.detailActions}>
              <button
                className={styles.textButton}
                onClick={startEditing}
                type="button"
              >
                Edit
              </button>
              {item.status === "retired" ? (
                <button
                  className={styles.textButton}
                  disabled={saving}
                  onClick={activate}
                  type="button"
                >
                  Reactivate
                </button>
              ) : (
                <button
                  className={styles.textButton}
                  disabled={saving}
                  onClick={retire}
                  type="button"
                >
                  Retire
                </button>
              )}
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}

export function MyPrinciplesWorkspace() {
  const [principles, setPrinciples] = useState<PrincipleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [statement, setStatement] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const activeCount = useMemo(
    () => principles.filter((item) => item.status !== "retired").length,
    [principles]
  );

  const loadPrinciples = useCallback(async () => {
    const payload = await fetchJson<{ principles: PrincipleRecord[] }>(
      "/api/principles"
    );
    setPrinciples(payload.principles);
  }, []);

  useEffect(() => {
    loadPrinciples()
      .catch((caught: unknown) => {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load principles."
        );
      })
      .finally(() => setLoading(false));
  }, [loadPrinciples]);

  const toggleCreating = useCallback(() => {
    setCreating((current) => !current);
  }, []);

  const cancelCreating = useCallback(() => {
    setCreating(false);
    setError("");
  }, []);

  const handleStatementChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setStatement(event.target.value);
    },
    []
  );

  const handleDescriptionChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setDescription(event.target.value);
    },
    []
  );

  const handleToggle = useCallback((id: string) => {
    setOpenId((current) => (current === id ? null : id));
  }, []);

  const createPrinciple = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const payload = await fetchJson<{ principle: { id: string } }>(
        "/api/principles",
        {
          body: JSON.stringify({
            description: description || undefined,
            statement,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        }
      );
      setStatement("");
      setDescription("");
      setCreating(false);
      setOpenId(payload.principle.id);
      await loadPrinciples();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not create principle."
      );
    } finally {
      setSaving(false);
    }
  }, [description, loadPrinciples, statement]);

  return (
    <WorkspaceShell active="principles" title="Principles">
      <section className={styles.workspace}>
        <header className={styles.header}>
          <div>
            <h1>Principles</h1>
            <span className={styles.count}>{activeCount} active</span>
          </div>
          <button
            aria-label="Add principle"
            className={styles.addButton}
            onClick={toggleCreating}
            type="button"
          >
            +
          </button>
        </header>

        {creating ? (
          <div className={styles.createForm}>
            <div className={styles.field}>
              <label htmlFor="new-principle-statement">Principle</label>
              <textarea
                autoFocus
                id="new-principle-statement"
                onChange={handleStatementChange}
                value={statement}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="new-principle-description">Notes</label>
              <textarea
                id="new-principle-description"
                onChange={handleDescriptionChange}
                value={description}
              />
            </div>
            <div className={styles.actions}>
              <button
                className={styles.primaryButton}
                disabled={saving || !statement.trim()}
                onClick={createPrinciple}
                type="button"
              >
                Add
              </button>
              <button
                className={styles.textButton}
                onClick={cancelCreating}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {loading ? <div className={styles.loading}>Loading…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}
        {!loading && !error && principles.length === 0 ? (
          <div className={styles.empty}>No principles yet.</div>
        ) : null}

        <div className={styles.list}>
          {principles.map((item) => (
            <PrincipleItem
              isOpen={openId === item.id}
              item={item}
              key={item.id}
              onRefresh={loadPrinciples}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </section>
    </WorkspaceShell>
  );
}
