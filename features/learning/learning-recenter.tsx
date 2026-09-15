"use client";

import { useMemo, useState } from "react";
import type { EvolutionState } from "@/features/evolution/contracts";
import type {
  ClientPeopleState,
  ClientPrincipleRecord,
  ReflectionRecord,
} from "@/features/people/contracts";
import type { ClientLearningState } from "./contracts";
import { LearningWorkspace } from "./learning-workspace";
import styles from "./learning-recenter.module.css";

async function jsonRequest<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) throw new Error(payload?.error || "Request failed.");
  if (!payload) throw new Error("Request failed.");
  return payload;
}

export function LearningRecenter({
  email,
  evolution,
  initialPeople,
  initialState,
  workspaceName,
}: {
  email: string;
  evolution: EvolutionState;
  initialPeople: ClientPeopleState;
  initialState: ClientLearningState;
  workspaceName: string;
}) {
  const [people, setPeople] = useState(initialPeople);
  const [learning, setLearning] = useState(initialState);
  const [showAdd, setShowAdd] = useState(false);
  const [trigger, setTrigger] = useState("");
  const [rule, setRule] = useState("");
  const [rationale, setRationale] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activePatterns = learning.patterns.filter(
    (pattern) => pattern.lifecycleState !== "retired",
  );
  const principles = people.principles.filter(
    (principle) =>
      principle.acceptanceState !== "rejected" &&
      principle.lifecycleState !== "retired",
  );
  const eligibleReflections = useMemo(
    () =>
      people.reflections.filter(
        (reflection) =>
          reflection.status === "completed" &&
          Boolean(reflection.goalId) &&
          Boolean(reflection.problemId),
      ),
    [people.reflections],
  );
  const pendingPrinciple =
    principles.find((principle) => principle.acceptanceState === "pending") ??
    null;
  const currentLearning =
    evolution.reflection?.learning ||
    pendingPrinciple?.rule ||
    activePatterns[0]?.statement ||
    "Live another cycle before forcing a lesson from too little evidence.";
  const currentLearningLabel = evolution.reflection?.learning
    ? "Latest reflection"
    : pendingPrinciple
      ? "Principle under review"
      : activePatterns[0]
        ? "Recurring pattern"
        : "Next evidence";

  async function refreshPeople() {
    const response = await fetch("/api/people/state", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not refresh Learning.");
    setPeople((await response.json()) as ClientPeopleState);
  }

  async function run(label: string, action: () => Promise<void>) {
    if (working) return;
    setWorking(label);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
    } finally {
      setWorking(null);
    }
  }

  async function addPrinciple() {
    await run("manual", async () => {
      await jsonRequest("/api/people/principles", {
        body: JSON.stringify({ rationale, rule, trigger }),
        method: "POST",
      });
      setTrigger("");
      setRule("");
      setRationale("");
      setShowAdd(false);
      await refreshPeople();
    });
  }

  async function distill(reflectionId: string) {
    await run(`distill:${reflectionId}`, async () => {
      await jsonRequest("/api/people/principles/propose", {
        body: JSON.stringify({ reflectionId }),
        method: "POST",
      });
      await refreshPeople();
    });
  }

  async function reviewPrinciple(
    principleId: string,
    action: "accept" | "reject",
  ) {
    await run(`review:${principleId}`, async () => {
      await jsonRequest("/api/people/principles/review", {
        body: JSON.stringify({ action, principleId }),
        method: "POST",
      });
      await refreshPeople();
    });
  }

  function openPrincipleEditor() {
    setShowAdd(true);
    requestAnimationFrame(() => {
      document
        .getElementById("principles-title")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className={styles.workspace}>
      <section className={styles.hero} aria-labelledby="learning-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Learning · evidence over time</p>
          <h1 id="learning-title">What is reality teaching you?</h1>
          <div
            aria-label="Pain plus Reflection leads to Progress"
            className={styles.equation}
            role="img"
          >
            <span>Experience</span>
            <b>→</b>
            <span>Reflection</span>
            <b>→</b>
            <span>Pattern</span>
            <b>→</b>
            <strong>Principle</strong>
            <b>→</b>
            <span>Revision</span>
          </div>
        </div>

        <aside
          className={styles.currentScene}
          aria-label="Current learning narrative"
        >
          <span>Now · {currentLearningLabel}</span>
          <strong>{currentLearning}</strong>
          <dl>
            <div>
              <dt>Reflections</dt>
              <dd>{eligibleReflections.length}</dd>
            </div>
            <div>
              <dt>Patterns</dt>
              <dd>{activePatterns.length}</dd>
            </div>
            <div>
              <dt>Principles</dt>
              <dd>{principles.length}</dd>
            </div>
          </dl>
          <button
            className={styles.primary}
            onClick={openPrincipleEditor}
            type="button"
          >
            + Add principle
          </button>
        </aside>
      </section>

      {error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : null}

      {evolution.reflection?.learning ? (
        <section
          className={styles.latest}
          aria-labelledby="latest-learning-title"
        >
          <div>
            <p className={styles.eyebrow}>01 · Experience → Reflection</p>
            <h2 id="latest-learning-title">{evolution.reflection.learning}</h2>
          </div>
        </section>
      ) : null}

      <section
        className={styles.principleSection}
        aria-labelledby="principles-title"
      >
        <div className={styles.sectionLead}>
          <div>
            <p className={styles.eyebrow}>03–04 · Pattern → Principle</p>
            <h2 id="principles-title">Rules I am testing</h2>
          </div>
        </div>

        {showAdd ? (
          <div className={styles.principleEditor}>
            <div className={styles.editorLead}>
              <span>Write a testable rule</span>
              <button
                className={styles.textButton}
                onClick={() => setShowAdd(false)}
                type="button"
              >
                Close
              </button>
            </div>
            <label>
              <span>When</span>
              <textarea
                aria-label="Principle trigger"
                onChange={(event) => setTrigger(event.target.value)}
                rows={2}
                value={trigger}
              />
            </label>
            <label>
              <span>Then</span>
              <textarea
                aria-label="Principle rule"
                onChange={(event) => setRule(event.target.value)}
                rows={3}
                value={rule}
              />
            </label>
            <label>
              <span>Why</span>
              <textarea
                aria-label="Principle rationale"
                onChange={(event) => setRationale(event.target.value)}
                rows={2}
                value={rationale}
              />
            </label>
            <button
              className={styles.primary}
              disabled={
                working === "manual" ||
                trigger.trim().length < 3 ||
                rule.trim().length < 3
              }
              onClick={() => void addPrinciple()}
              type="button"
            >
              {working === "manual" ? "Saving…" : "Save principle"}
            </button>
          </div>
        ) : null}

        {principles.length > 0 ? (
          <div className={styles.principles}>
            {principles.map((principle) => (
              <PrincipleCard
                key={principle.id}
                onReview={(action) =>
                  void reviewPrinciple(principle.id, action)
                }
                principle={principle}
                working={working === `review:${principle.id}`}
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>No principles yet.</div>
        )}
      </section>

      <section
        className={styles.reflectionSection}
        aria-labelledby="reflections-title"
      >
        <div className={styles.sectionLead}>
          <div>
            <p className={styles.eyebrow}>02 · Reflection</p>
            <h2 id="reflections-title">Pain worth learning from</h2>
          </div>
        </div>
        {eligibleReflections.length > 0 ? (
          <div className={styles.reflections}>
            {eligibleReflections.slice(0, 8).map((reflection) => {
              const linked = people.principles.find(
                (principle) =>
                  principle.originReflectionId === reflection.id &&
                  principle.acceptanceState !== "rejected",
              );
              return (
                <ReflectionCard
                  key={reflection.id}
                  linkedPrinciple={linked ?? null}
                  onDistill={() => void distill(reflection.id)}
                  reflection={reflection}
                  working={working === `distill:${reflection.id}`}
                />
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>No completed reflections yet.</div>
        )}
      </section>

      <section
        className={styles.patternSection}
        aria-labelledby="patterns-title"
      >
        <div className={styles.sectionLead}>
          <div>
            <p className={styles.eyebrow}>03 · Pattern</p>
            <h2 id="patterns-title">Recurring reality</h2>
          </div>
        </div>
        {activePatterns.length > 0 ? (
          <div className={styles.patterns}>
            {activePatterns.slice(0, 4).map((pattern) => (
              <article key={pattern.id}>
                <div className={styles.patternMeta}>
                  <span>{pattern.lifecycleState}</span>
                  <span>{pattern.cases.length} cases</span>
                </div>
                <h3>{pattern.statement}</h3>
                <details>
                  <summary>Evidence</summary>
                  <dl>
                    <div>
                      <dt>For</dt>
                      <dd>{pattern.supportingEvidence || "Not recorded"}</dd>
                    </div>
                    <div>
                      <dt>Against</dt>
                      <dd>{pattern.contradictingEvidence || "Not recorded"}</dd>
                    </div>
                    <div>
                      <dt>Uncertainty</dt>
                      <dd>{pattern.uncertainty || "Not recorded"}</dd>
                    </div>
                  </dl>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            {learning.historyCount < 2
              ? "Not enough history yet. Live the loop before asking the system to define a pattern."
              : "No pattern kept yet."}
          </div>
        )}
      </section>

      <details
        className={styles.lab}
        open={activePatterns.length === 0 && learning.historyCount >= 2}
      >
        <summary>Pattern tools</summary>
        <div className={styles.legacy}>
          <LearningWorkspace
            email={email}
            initialState={learning}
            onStateChange={setLearning}
            workspaceName={workspaceName}
          />
        </div>
      </details>
    </div>
  );
}

function PrincipleCard({
  onReview,
  principle,
  working,
}: {
  onReview: (action: "accept" | "reject") => void;
  principle: ClientPrincipleRecord;
  working: boolean;
}) {
  return (
    <article className={styles.principle}>
      <div className={styles.principleTop}>
        <span>{principle.lifecycleState}</span>
        {principle.originReflectionId ? (
          <span>from reflection</span>
        ) : (
          <span>mine</span>
        )}
      </div>
      <p>When {principle.trigger}</p>
      <h3>{principle.rule}</h3>
      {principle.rationale ? (
        <details>
          <summary>Why</summary>
          <p>{principle.rationale}</p>
        </details>
      ) : null}
      {principle.acceptanceState === "pending" ? (
        <div className={styles.buttonRow}>
          <button
            className={styles.primary}
            disabled={working}
            onClick={() => onReview("accept")}
            type="button"
          >
            Accept for testing
          </button>
          <button
            className={styles.secondary}
            disabled={working}
            onClick={() => onReview("reject")}
            type="button"
          >
            Reject
          </button>
        </div>
      ) : null}
    </article>
  );
}

function ReflectionCard({
  linkedPrinciple,
  onDistill,
  reflection,
  working,
}: {
  linkedPrinciple: ClientPrincipleRecord | null;
  onDistill: () => void;
  reflection: ReflectionRecord;
  working: boolean;
}) {
  return (
    <article className={styles.reflection}>
      <h3>{reflection.learning || reflection.happened}</h3>
      {reflection.surprise ? <p>{reflection.surprise}</p> : null}
      {linkedPrinciple ? (
        <span className={styles.linked}>
          Principle · {linkedPrinciple.lifecycleState}
        </span>
      ) : (
        <button
          className={styles.secondary}
          disabled={working}
          onClick={onDistill}
          type="button"
        >
          {working ? "Distilling…" : "Distill principle"}
        </button>
      )}
    </article>
  );
}
