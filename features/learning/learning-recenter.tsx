"use client";

import { AutoTextarea } from "@/features/ui/auto-textarea";

import { jsonRequest } from "@/features/ui/json-request";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EvolutionState } from "@/features/evolution/contracts";
import type {
  ClientPeopleState,
  ClientPrincipleRecord,
  ReflectionRecord,
} from "@/features/people/contracts";
import type {
  ClientLearningState,
  LearningPatternDraft,
  LearningPatternProposal,
} from "./contracts";
import { LearningWorkspace } from "./learning-workspace";
import styles from "./learning-recenter.module.css";


async function fetchPeopleState(): Promise<ClientPeopleState> {
  const response = await fetch("/api/people/state", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not refresh Learning.");
  }
  return response.json() as Promise<ClientPeopleState>;
}

async function fetchLearningState(): Promise<ClientLearningState> {
  const response = await fetch("/api/learning/state", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not refresh Learning patterns.");
  }
  return response.json() as Promise<ClientLearningState>;
}

function proposalDraft(proposal: LearningPatternProposal): LearningPatternDraft {
  return {
    confidence: proposal.confidence,
    contradictingEvidence: proposal.contradictingEvidence,
    implication: proposal.implication,
    kind: proposal.kind,
    statement: proposal.statement,
    supportingEvidence: proposal.supportingEvidence,
    uncertainty: proposal.uncertainty,
  };
}

type EditorKind = "reflection" | "pattern" | "principle" | null;

type ReflectionDraft = {
  expected: string;
  goalId: string;
  happened: string;
  learning: string;
  problemId: string;
  recurrenceNote: string;
  recurring: boolean;
  surprise: string;
};

const emptyReflection: ReflectionDraft = {
  expected: "",
  goalId: "",
  happened: "",
  learning: "",
  problemId: "",
  recurrenceNote: "",
  recurring: false,
  surprise: "",
};

export function LearningRecenter({
  evolution,
  initialPeople,
  initialState,
}: {
  evolution: EvolutionState;
  initialPeople: ClientPeopleState;
  initialState: ClientLearningState;
}) {
  const [people, setPeople] = useState(initialPeople);
  const [learning, setLearning] = useState(initialState);
  const [editor, setEditor] = useState<EditorKind>(null);
  const [principleQuery, setPrincipleQuery] = useState("");
  const editorRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!editor) return;
    const panel = editorRef.current;
    panel?.scrollIntoView({ behavior: "auto", block: "nearest" });
    panel?.querySelector<HTMLElement>("textarea, select, input, button")?.focus({ preventScroll: true });
  }, [editor]);
  const [reflectionDraft, setReflectionDraft] =
    useState<ReflectionDraft>(emptyReflection);
  const [patternProposal, setPatternProposal] =
    useState<LearningPatternProposal | null>(null);
  const [patternDraft, setPatternDraft] =
    useState<LearningPatternDraft | null>(null);
  const [trigger, setTrigger] = useState("");
  const [rule, setRule] = useState("");
  const [rationale, setRationale] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activePatterns = learning.patterns.filter(
    (pattern) => pattern.lifecycleState !== "retired",
  );
  const hasImmediatePatternAction = activePatterns.some(
    (pattern) =>
      (pattern.lifecycleState === "active" &&
        Boolean(pattern.principleRevisionProposal)) ||
      Boolean(pattern.appliedRevision),
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
  const usableGoals = useMemo(
    () => people.goals.filter((goal) => goal.status !== "retired"),
    [people.goals],
  );
  const usableProblems = useMemo(
    () =>
      people.problems.filter(
        (problem) =>
          problem.status !== "retired" &&
          (!reflectionDraft.goalId || problem.goalId === reflectionDraft.goalId),
      ),
    [people.problems, reflectionDraft.goalId],
  );

  const matchingPrinciples = principles.filter((principle) =>
    `${principle.rule} ${principle.trigger} ${principle.rationale ?? ""}`.toLocaleLowerCase().includes(principleQuery.trim().toLocaleLowerCase()),
  );

  const pendingPrinciple =
    principles.find((principle) => principle.acceptanceState === "pending") ??
    null;
  const latestReflection = eligibleReflections[0] ?? null;
  const latestPattern = activePatterns[0] ?? null;
  const currentLearning =
    evolution.reflection?.learning ||
    pendingPrinciple?.rule ||
    latestPattern?.statement ||
    latestReflection?.learning ||
    "Record an experience, then decide what it teaches you.";
  const currentLearningLabel = evolution.reflection?.learning
    ? "Latest reflection"
    : pendingPrinciple
      ? "Principle under review"
      : latestPattern
        ? "Recurring pattern"
        : latestReflection
          ? "Reflection"
          : "Next evidence";
  const learningKey =
    learning.patterns
      .map(
        (pattern) =>
          `${pattern.id}:${pattern.lifecycleState}:${pattern.appliedRevision?.revisedRule ?? ""}`,
      )
      .join("|") || `history-${learning.historyCount}`;

  async function refreshPeople() {
    setPeople(await fetchPeopleState());
  }

  async function refreshAll() {
    const [nextPeople, nextLearning] = await Promise.all([
      fetchPeopleState(),
      fetchLearningState(),
    ]);
    setPeople(nextPeople);
    setLearning(nextLearning);
  }

  function synchronizeLearning(nextLearning: ClientLearningState) {
    setLearning(nextLearning);
    void refreshPeople().catch((cause) => {
      setError(
        cause instanceof Error ? cause.message : "Could not refresh Learning.",
      );
    });
  }

  async function run(label: string, action: () => Promise<void>) {
    if (working) {
      return;
    }
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

  function revealEditor(kind: Exclude<EditorKind, null>) {
    if (kind === "reflection") {
      const goal =
        usableGoals.find((item) => item.status === "chosen") ??
        usableGoals[0] ??
        null;
      const problem = goal
        ? people.problems.find(
            (item) => item.goalId === goal.id && item.status !== "retired",
          ) ?? null
        : null;
      setReflectionDraft((current) => ({
        ...current,
        goalId: current.goalId || goal?.id || "",
        problemId: current.problemId || problem?.id || "",
      }));
    }
    setEditor(kind);

  }

  async function addReflection() {
    await run("reflection", async () => {
      await jsonRequest<{ reflection: ReflectionRecord }>(
        "/api/people/reflections",
        {
          body: JSON.stringify(reflectionDraft),
          method: "POST",
        },
      );
      setReflectionDraft(emptyReflection);
      setEditor(null);
      await refreshAll();
    });
  }

  async function proposePattern() {
    if (learning.historyCount < 2) {
      return;
    }
    await run("pattern:propose", async () => {
      const result = await jsonRequest<LearningPatternProposal>(
        "/api/learning/patterns/propose",
        { body: "{}", method: "POST" },
      );
      setPatternProposal(result);
      setPatternDraft(proposalDraft(result));
    });
  }

  async function keepPattern() {
    if (!patternDraft) {
      return;
    }
    await run("pattern:save", async () => {
      const result = await jsonRequest<ClientLearningState>(
        "/api/learning/patterns",
        {
          body: JSON.stringify(patternDraft),
          method: "POST",
        },
      );
      setLearning(result);
      setPatternProposal(null);
      setPatternDraft(null);
      setEditor(null);
      await refreshPeople();
    });
  }

  async function rejectPattern() {
    if (!patternProposal) {
      setPatternDraft(null);
      setEditor(null);
      return;
    }
    await run("pattern:reject", async () => {
      await jsonRequest<{ ok: true }>("/api/learning/patterns/reject", {
        body: "{}",
        method: "POST",
      });
      setPatternProposal(null);
      setPatternDraft(null);
      setEditor(null);
    });
  }

  async function addPrinciple() {
    await run("principle", async () => {
      await jsonRequest("/api/people/principles", {
        body: JSON.stringify({ rationale, rule, trigger }),
        method: "POST",
      });
      setTrigger("");
      setRule("");
      setRationale("");
      setEditor(null);
      await refreshAll();
    });
  }

  async function distill(reflectionId: string) {
    await run(`distill:${reflectionId}`, async () => {
      await jsonRequest("/api/people/principles/propose", {
        body: JSON.stringify({ reflectionId }),
        method: "POST",
      });
      await refreshAll();
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
      await refreshAll();
    });
  }

  function updateReflectionGoal(goalId: string) {
    const firstProblem =
      people.problems.find(
        (problem) => problem.goalId === goalId && problem.status !== "retired",
      ) ?? null;
    setReflectionDraft((current) => ({
      ...current,
      goalId,
      problemId: firstProblem?.id ?? "",
    }));
  }

  const canSaveReflection =
    reflectionDraft.goalId.length > 0 &&
    reflectionDraft.problemId.length > 0 &&
    reflectionDraft.happened.trim().length >= 3 &&
    reflectionDraft.learning.trim().length >= 3;
  const canSavePattern =
    patternDraft !== null &&
    patternDraft.statement.trim().length >= 3 &&
    patternDraft.implication.trim().length >= 3 &&
    patternDraft.supportingEvidence.trim().length >= 3 &&
    patternDraft.contradictingEvidence.trim().length >= 3 &&
    patternDraft.uncertainty.trim().length >= 3;
  const canSavePrinciple =
    trigger.trim().length >= 3 && rule.trim().length >= 3;

  return (
    <div className={styles.workspace}>
      <section className={styles.hero} aria-labelledby="learning-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Learning</p>
          <h1 id="learning-title">What is reality teaching you?</h1>
        </div>

        <aside
          className={styles.currentScene}
          aria-label="Current learning narrative"
        >
          <span>Now · {currentLearningLabel}</span>
          <strong>{currentLearning}</strong>
          <div className={styles.sceneActions}>
            <button
              className={styles.primaryLight}
              onClick={() => revealEditor("reflection")}
              type="button"
            >
              Capture reflection
            </button>
          </div>
        </aside>
      </section>

      <nav className={styles.chapterRail} aria-label="Learning chapters">
        <a href="#learning-principle">Principles <span>{principles.length}</span></a>
        <a href="#learning-reflection">Reflections <span>{eligibleReflections.length}</span></a>
        <a href="#learning-pattern">Patterns <span>{activePatterns.length}</span></a>
        <a href="#pattern-tools">Revision tools</a>
      </nav>

      {error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : null}

      {editor ? (
        <section
          className={styles.editorPanel}
          id="learning-editor"
          ref={editorRef}
          aria-label={`Add ${editor}`}
        >
          <div className={styles.editorHeader}>
            <div>
              <p className={styles.eyebrow}>
                {editor === "reflection"
                  ? "Reflection"
                  : editor === "pattern"
                    ? "Pattern"
                    : "Principle"}
              </p>
              <h2>
                {editor === "reflection"
                  ? "What happened, and what did it teach you?"
                  : editor === "pattern"
                    ? "What seems to repeat across reality?"
                    : "What rule deserves a real-world test?"}
              </h2>
            </div>
            <button
              className={styles.textButton}
              onClick={() => setEditor(null)}
              type="button"
            >
              Close
            </button>
          </div>

          {editor === "reflection" ? (
            usableGoals.length === 0 || people.problems.length === 0 ? (
              <div className={styles.contextMissing}>
                <strong>Reflection needs a Dream and a Problem context.</strong>
                <p>
                  Start the cycle in Me first. Once a real gap exists, Learning can
                  attach the reflection to that evidence instead of creating an
                  orphan note.
                </p>
                <a href="/">Open Me →</a>
              </div>
            ) : (
              <div className={styles.editorGrid}>
                <label className={styles.field}>
                  <span>Dream / Goal</span>
                  <select
                    aria-label="Reflection goal"
                    onChange={(event) => updateReflectionGoal(event.target.value)}
                    value={reflectionDraft.goalId}
                  >
                    <option value="">Choose a goal</option>
                    {usableGoals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.desiredState}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Problem / Gap</span>
                  <select
                    aria-label="Reflection problem"
                    onChange={(event) =>
                      setReflectionDraft((current) => ({
                        ...current,
                        problemId: event.target.value,
                      }))
                    }
                    value={reflectionDraft.problemId}
                  >
                    <option value="">Choose a problem</option>
                    {usableProblems.map((problem) => (
                      <option key={problem.id} value={problem.id}>
                        {problem.statement}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span>What actually happened?</span>
                  <AutoTextarea
                    aria-label="Reflection happened"
                    onChange={(event) =>
                      setReflectionDraft((current) => ({
                        ...current,
                        happened: event.target.value,
                      }))
                    }
                    rows={3}
                    value={reflectionDraft.happened}
                  />
                </label>
                <label className={styles.field}>
                  <span>What did you expect?</span>
                  <AutoTextarea
                    aria-label="Reflection expected"
                    onChange={(event) =>
                      setReflectionDraft((current) => ({
                        ...current,
                        expected: event.target.value,
                      }))
                    }
                    rows={2}
                    value={reflectionDraft.expected}
                  />
                </label>
                <label className={styles.field}>
                  <span>What surprised you?</span>
                  <AutoTextarea
                    aria-label="Reflection surprise"
                    onChange={(event) =>
                      setReflectionDraft((current) => ({
                        ...current,
                        surprise: event.target.value,
                      }))
                    }
                    rows={2}
                    value={reflectionDraft.surprise}
                  />
                </label>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span>What did you learn?</span>
                  <AutoTextarea
                    aria-label="Reflection learning"
                    onChange={(event) =>
                      setReflectionDraft((current) => ({
                        ...current,
                        learning: event.target.value,
                      }))
                    }
                    rows={3}
                    value={reflectionDraft.learning}
                  />
                </label>
                <label className={styles.checkField}>
                  <input
                    checked={reflectionDraft.recurring}
                    onChange={(event) =>
                      setReflectionDraft((current) => ({
                        ...current,
                        recurring: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>This looks recurring</span>
                </label>
                {reflectionDraft.recurring ? (
                  <label className={styles.field}>
                    <span>Recurrence note</span>
                    <AutoTextarea
                      aria-label="Reflection recurrence note"
                      onChange={(event) =>
                        setReflectionDraft((current) => ({
                          ...current,
                          recurrenceNote: event.target.value,
                        }))
                      }
                      rows={2}
                      value={reflectionDraft.recurrenceNote}
                    />
                  </label>
                ) : null}
                <div className={styles.editorActions}>
                  <button
                    className={styles.primary}
                    disabled={!canSaveReflection || working === "reflection"}
                    onClick={() => void addReflection()}
                    type="button"
                  >
                    {working === "reflection" ? "Saving…" : "Save reflection"}
                  </button>
                </div>
              </div>
            )
          ) : null}

          {editor === "pattern" ? (
            learning.historyCount < 2 ? (
              <div className={styles.contextMissing}>
                <strong>Pattern needs at least two completed Reflections.</strong>
                <p>
                  A pattern is not a free-floating note. Capture another real case
                  first, then compare the evidence and decide what actually repeats.
                </p>
                <button
                  className={styles.primary}
                  onClick={() => revealEditor("reflection")}
                  type="button"
                >
                  Capture another reflection
                </button>
              </div>
            ) : patternProposal && patternDraft ? (
              <div className={styles.editorGrid}>
                <div className={styles.contextMissing}>
                  <strong>
                    Evidence base · {patternProposal.cases.length} durable cases
                  </strong>
                  <p>
                    The system compared completed Reflections. Correct the proposal
                    before keeping it if the evidence does not support the wording.
                  </p>
                </div>
                <label className={styles.field}>
                  <span>Pattern type</span>
                  <select
                    aria-label="Pattern kind"
                    onChange={(event) =>
                      setPatternDraft((current) =>
                        current
                          ? {
                              ...current,
                              kind: event.target
                                .value as LearningPatternDraft["kind"],
                            }
                          : current,
                      )
                    }
                    value={patternDraft.kind}
                  >
                    <option value="recurring_pattern">Recurring pattern</option>
                    <option value="design_learning">Design learning</option>
                    <option value="principle_effectiveness">
                      Principle effectiveness
                    </option>
                    <option value="constraint_hypothesis">
                      Constraint hypothesis
                    </option>
                  </select>
                </label>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span>Pattern hypothesis</span>
                  <AutoTextarea
                    aria-label="Pattern statement"
                    onChange={(event) =>
                      setPatternDraft((current) =>
                        current
                          ? { ...current, statement: event.target.value }
                          : current,
                      )
                    }
                    rows={3}
                    value={patternDraft.statement}
                  />
                </label>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span>If true, what does it imply?</span>
                  <AutoTextarea
                    aria-label="Pattern implication"
                    onChange={(event) =>
                      setPatternDraft((current) =>
                        current
                          ? { ...current, implication: event.target.value }
                          : current,
                      )
                    }
                    rows={2}
                    value={patternDraft.implication}
                  />
                </label>
                <label className={styles.field}>
                  <span>Evidence for</span>
                  <AutoTextarea
                    aria-label="Pattern evidence for"
                    onChange={(event) =>
                      setPatternDraft((current) =>
                        current
                          ? {
                              ...current,
                              supportingEvidence: event.target.value,
                            }
                          : current,
                      )
                    }
                    rows={3}
                    value={patternDraft.supportingEvidence}
                  />
                </label>
                <label className={styles.field}>
                  <span>Evidence against</span>
                  <AutoTextarea
                    aria-label="Pattern evidence against"
                    onChange={(event) =>
                      setPatternDraft((current) =>
                        current
                          ? {
                              ...current,
                              contradictingEvidence: event.target.value,
                            }
                          : current,
                      )
                    }
                    rows={3}
                    value={patternDraft.contradictingEvidence}
                  />
                </label>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span>What remains uncertain?</span>
                  <AutoTextarea
                    aria-label="Pattern uncertainty"
                    onChange={(event) =>
                      setPatternDraft((current) =>
                        current
                          ? { ...current, uncertainty: event.target.value }
                          : current,
                      )
                    }
                    rows={2}
                    value={patternDraft.uncertainty}
                  />
                </label>
                <div className={styles.contextMissing}>
                  <strong>Cases used in this proposal</strong>
                  {patternProposal.cases.map((item, index) => (
                    <p key={item.reflectionId}>
                      Case {index + 1} · {item.problem} — {item.happened}
                    </p>
                  ))}
                </div>
                <div className={styles.editorActions}>
                  <button
                    className={styles.primary}
                    disabled={!canSavePattern || working === "pattern:save"}
                    onClick={() => void keepPattern()}
                    type="button"
                  >
                    {working === "pattern:save" ? "Saving…" : "Keep pattern"}
                  </button>
                  <button
                    className={styles.secondary}
                    disabled={working !== null}
                    onClick={() => void proposePattern()}
                    type="button"
                  >
                    Try another
                  </button>
                  <button
                    className={styles.secondary}
                    disabled={working !== null}
                    onClick={() => void rejectPattern()}
                    type="button"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.contextMissing}>
                <strong>Compare the evidence before naming the pattern.</strong>
                <p>
                  Learning has {learning.historyCount} completed Reflections. Ask the
                  system to compare them, then edit the hypothesis before you keep
                  it.
                </p>
                <button
                  className={styles.primary}
                  disabled={working === "pattern:propose"}
                  onClick={() => void proposePattern()}
                  type="button"
                >
                  {working === "pattern:propose"
                    ? "Comparing reflections…"
                    : "Synthesize pattern"}
                </button>
              </div>
            )
          ) : null}

          {editor === "principle" ? (
            <div className={styles.editorGrid}>
              <label className={styles.field}>
                <span>When</span>
                <AutoTextarea
                  aria-label="Principle trigger"
                  onChange={(event) => setTrigger(event.target.value)}
                  rows={2}
                  value={trigger}
                />
              </label>
              <label className={styles.field}>
                <span>Then</span>
                <AutoTextarea
                  aria-label="Principle rule"
                  onChange={(event) => setRule(event.target.value)}
                  rows={3}
                  value={rule}
                />
              </label>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span>Why</span>
                <AutoTextarea
                  aria-label="Principle rationale"
                  onChange={(event) => setRationale(event.target.value)}
                  rows={2}
                  value={rationale}
                />
              </label>
              <div className={styles.editorActions}>
                <button
                  className={styles.primary}
                  disabled={!canSavePrinciple || working === "principle"}
                  onClick={() => void addPrinciple()}
                  type="button"
                >
                  {working === "principle" ? "Saving…" : "Save principle"}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className={styles.chapterDeck} aria-label="Learning working scene">
        <section
          className={styles.chapter}
          id="learning-principle"
          aria-labelledby="principles-title"
        >
          <div className={styles.chapterHeader}>
            <div>
              <p className={styles.eyebrow}>Principle</p>
              <h2 id="principles-title">Rules I am testing</h2>
            </div>
            <button
              className={styles.chapterAction}
              onClick={() => revealEditor("principle")}
              type="button"
            >
              + Add principle
            </button>
          </div>
          <p className={styles.chapterIntro}>
            Write the trigger and the rule clearly enough that reality can prove
            you wrong.
          </p>
          {principles.length > 0 ? (
            <div className={styles.librarySearch}>
              <label htmlFor="principle-search">Find a principle</label>
              <input id="principle-search" type="search" value={principleQuery} onChange={(event) => setPrincipleQuery(event.target.value)} placeholder="Search rule, trigger, or rationale" />
              <span role="status">{matchingPrinciples.length} of {principles.length} principles</span>
            </div>
          ) : null}
          {principles.length > 0 && matchingPrinciples.length === 0 ? <p className={styles.noResults}>No matching principles. Try another word.</p> : null}
          {principles.length > 0 ? (
            <div className={styles.chapterList}>
              {matchingPrinciples.map((principle) => (
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
            <div className={styles.empty}>
              <strong>No principle yet.</strong>
              <span>Add a trigger and a rule to test in your next decision.</span>
            </div>
          )}
        </section>
        <section
          className={styles.chapter}
          id="learning-reflection"
          aria-labelledby="reflections-title"
        >
          <div className={styles.chapterHeader}>
            <div>
              <p className={styles.eyebrow}>Reflection</p>
              <h2 id="reflections-title">Pain worth learning from</h2>
            </div>
            <button
              className={styles.chapterAction}
              onClick={() => revealEditor("reflection")}
              type="button"
            >
              + Reflection
            </button>
          </div>
          <p className={styles.chapterIntro}>
            Record what happened, what surprised you, and the lesson you think is
            worth carrying forward.
          </p>
          {eligibleReflections.length > 0 ? (
            <div className={styles.chapterList}>
              {eligibleReflections.map((reflection) => {
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
            <div className={styles.empty}>
              <strong>No reflection yet.</strong>
              <span>Capture an event to begin your evidence trail.</span>
            </div>
          )}
        </section>

        <section
          className={styles.chapter}
          id="learning-pattern"
          aria-labelledby="patterns-title"
        >
          <div className={styles.chapterHeader}>
            <div>
              <p className={styles.eyebrow}>Pattern</p>
              <h2 id="patterns-title">Recurring reality</h2>
            </div>
            <button
              className={styles.chapterAction}
              onClick={() => revealEditor("pattern")}
              type="button"
            >
              + Pattern
            </button>
          </div>
          <p className={styles.chapterIntro}>
            Compare multiple completed Reflections before you name what repeats.
            Keep evidence for, against, and uncertainty visible beside it.
          </p>
          {activePatterns.length > 0 ? (
            <div className={styles.chapterList}>
              {activePatterns.map((pattern) => (
                <article className={styles.pattern} key={pattern.id}>
                  <div className={styles.patternMeta}>
                    <span>{pattern.lifecycleState}</span>
                    <span>{pattern.cases.length} cases</span>
                  </div>
                  <h3>{pattern.statement}</h3>
                  <p>{pattern.implication}</p>
                  <details>
                    <summary>Inspect evidence</summary>
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
                  {pattern.appliedRevision ? (
                    <span className={styles.revisionState}>
                      Principle revised · testing
                    </span>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <strong>No pattern kept yet.</strong>
              <span>
                {learning.historyCount < 2
                  ? "Not enough history yet. Live the loop before asking the system to define a pattern."
                  : "You have enough history. Synthesize a hypothesis, inspect the cases, then keep only what the evidence supports."}
              </span>
            </div>
          )}
          <a className={styles.chapterLink} href="#pattern-tools">
            Open revision tools →
          </a>
        </section>


      </section>

      <details
        className={styles.lab}
        id="pattern-tools"
        open={
          (activePatterns.length === 0 && learning.historyCount >= 2) ||
          hasImmediatePatternAction
        }
      >
        <summary>
          <span>Revision</span>
          <strong>Pattern synthesis & principle revision</strong>
        </summary>
        <p className={styles.labIntro}>
          Inspect the longer evidence trail, generate another hypothesis, or revise
          a principle when reality no longer supports the rule.
        </p>
        <div className={styles.legacy}>
          <LearningWorkspace
            initialState={learning}
            key={learningKey}
            onStateChange={synchronizeLearning}
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
      <span className={styles.itemMeta}>Experience → Reflection</span>
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
