"use client";

import { Brain, Check, ExternalLink, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type {
  PersonalContext,
  PersonalPrincipleMemory,
} from "@/lib/personal-brain/types";
import styles from "./personal-memory.module.css";

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

function PrincipleMemoryCard({
  decisionId,
  item,
  onApplied,
}: {
  decisionId: string;
  item: PersonalPrincipleMemory;
  onApplied: (principleId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const apply = useCallback(async () => {
    if (item.applied || busy) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await fetchJson(`/api/decisions/${decisionId}/principles/apply`, {
        body: JSON.stringify({ principleId: item.id }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      onApplied(item.id);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not apply principle."
      );
    } finally {
      setBusy(false);
    }
  }, [busy, decisionId, item.applied, item.id, onApplied]);

  return (
    <div className={styles.memoryCard} data-testid="personal-principle">
      <div className={styles.memoryLabel}>From your principles</div>
      <blockquote>“{item.statement}”</blockquote>
      <div className={styles.provenance}>
        <span>
          Revision {item.revision} · {item.status}
        </span>
        {item.originDecision ? (
          <a href={`/decisions/${item.originDecision.id}`}>
            Adopted after “{item.originDecision.title}” — {formatDate(item.originDecision.createdAt)}
            <ExternalLink size={12} />
          </a>
        ) : (
          <span>Origin decision is no longer available.</span>
        )}
      </div>
      {item.applied ? (
        <span className={styles.applied} data-testid="principle-applied">
          <Check size={13} /> Applied to this decision
        </span>
      ) : (
        <button className={styles.applyButton} disabled={busy} onClick={apply} type="button">
          <RotateCcw size={13} /> {busy ? "Applying…" : "Apply to this decision"}
        </button>
      )}
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}

export function PersonalMemory({ decisionId }: { decisionId: string }) {
  const [context, setContext] = useState<PersonalContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await fetchJson<{ personalContext: PersonalContext }>(
        `/api/decisions/${decisionId}/personal-context`
      );
      setContext(payload.personalContext);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not load personal memory."
      );
    } finally {
      setLoading(false);
    }
  }, [decisionId]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const markApplied = useCallback((principleId: string) => {
    setContext((current) =>
      current
        ? {
            ...current,
            principles: current.principles.map((item) =>
              item.id === principleId ? { ...item, applied: true } : item
            ),
          }
        : current
    );
  }, []);

  return (
    <aside className={styles.panel} data-testid="personal-memory">
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Personal context</span>
          <h2>
            <Brain size={17} /> Your prior judgment memory
          </h2>
        </div>
        <a className={styles.brainLink} href="/brain">
          My Brain <ExternalLink size={12} />
        </a>
      </div>
      <p className={styles.boundary}>
        Personal memory is user-owned context. External evidence remains separately sourced in Council Evidence.
      </p>

      {loading ? <p className={styles.muted}>Retrieving your prior decisions and principles…</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {context?.contradictions.map((item) => (
        <div className={styles.tension} key={item.principleId}>
          <strong>Possible contradiction</strong>
          <p>{item.reason}</p>
          <blockquote>“{item.principleStatement}”</blockquote>
          <span>{item.prompt}</span>
        </div>
      ))}

      {context?.principles.map((item) => (
        <PrincipleMemoryCard
          decisionId={decisionId}
          item={item}
          key={item.id}
          onApplied={markApplied}
        />
      ))}

      {context?.similarDecisions.length ? (
        <section className={styles.similar}>
          <h3>Similar decisions</h3>
          {context.similarDecisions.map((item) => (
            <a href={`/decisions/${item.id}`} key={item.id}>
              <strong>{item.question}</strong>
              {item.judgment ? <span>Judgment: {item.judgment}</span> : null}
              <small>
                {item.status} · {formatDate(item.createdAt)}
              </small>
            </a>
          ))}
        </section>
      ) : null}

      {!loading &&
      !error &&
      !context?.principles.length &&
      !context?.similarDecisions.length ? (
        <p className={styles.muted}>
          No relevant personal memory yet. Adopt principles and revisit decisions to make this layer compound.
        </p>
      ) : null}
    </aside>
  );
}
