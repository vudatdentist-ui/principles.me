"use client";

import { T, useI18n } from "@/features/i18n/locale";
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
  const { t } = useI18n();
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
        cause instanceof Error ? cause.message : t("Could not refresh Learning."),
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
      setError(cause instanceof Error ? cause.message : t("Request failed."));
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
          <p className={styles.eyebrow}><T>Learning</T></p>
          <h1 id="learning-title"><T>What is reality teaching you?</T></h1>
        </div>

        <aside
          className={styles.currentScene}
          aria-label={t("Current learning narrative")}
        >
          <span>{t("Now")} · {t(currentLearningLabel)}</span>
          <strong>{currentLearning === "Record an experience, then decide what it teaches you." ? t(currentLearning) : currentLearning}</strong>
          <div className={styles.sceneActions}>
            <button
              className={styles.primaryLight}
              onClick={() => revealEditor("reflection")}
              type="button"
            >
              <T>Capture reflection</T>
            </button>
          </div>
        </aside>
      </section>

      <nav className={styles.chapterRail} aria-label={t("Learning chapters")}>
        <a href="#learning-principle"><T>Principles</T> <span>{principles.length}</span></a>
        <a href="#learning-reflection"><T>Reflections</T> <span>{eligibleReflections.length}</span></a>
        <a href="#learning-pattern"><T>Patterns</T> <span>{activePatterns.length}</span></a>
        <a href="#pattern-tools"><T>Revision tools</T></a>
      </nav>

      {error ? (
        <div className={styles.error} role="alert">
          {t(error)}
        </div>
      ) : null}

      {editor ? (
        <section
          className={styles.editorPanel}
          id="learning-editor"
          ref={editorRef}
          aria-label={t("Add {item}", { item: t(editor === "reflection" ? "Reflection" : editor === "pattern" ? "Pattern" : "Principle") })}
        >
          <div className={styles.editorHeader}>
            <div>
              <p className={styles.eyebrow}>
                {t(editor === "reflection" ? "Reflection" : editor === "pattern" ? "Pattern" : "Principle")}
              </p>
              <h2>
                {t(editor === "reflection" ? "What happened, and what did it teach you?" : editor === "pattern" ? "What seems to repeat across reality?" : "What rule deserves a real-world test?")}
              </h2>
            </div>
            <button
              className={styles.textButton}
              onClick={() => setEditor(null)}
              type="button"
            >
              <T>Close</T>
            </button>
          </div>

          {editor === "reflection" ? (
            usableGoals.length === 0 || people.problems.length === 0 ? (
              <div className={styles.contextMissing}>
                <strong><T>Reflection needs a Dream and a Problem context.</T></strong>
                <p>
                  <T>Start the cycle in Me first. Once a real gap exists, Learning can attach the reflection to that evidence instead of creating an orphan note.</T>
                </p>
                <a href="/"><T>Open Me →</T></a>
              </div>
            ) : (
              <div className={styles.editorGrid}>
                <label className={styles.field}>
                  <span><T>Dream / Goal</T></span>
                  <select
                    aria-label={t("Reflection goal")}
                    onChange={(event) => updateReflectionGoal(event.target.value)}
                    value={reflectionDraft.goalId}
                  >
                    <option value="">{t("Choose a goal")}</option>
                    {usableGoals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.desiredState}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span><T>Problem / Gap</T></span>
                  <select
                    aria-label={t("Reflection problem")}
                    onChange={(event) =>
                      setReflectionDraft((current) => ({
                        ...current,
                        problemId: event.target.value,
                      }))
                    }
                    value={reflectionDraft.problemId}
                  >
                    <option value="">{t("Choose a problem")}</option>
                    {usableProblems.map((problem) => (
                      <option key={problem.id} value={problem.id}>
                        {problem.statement}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span><T>What actually happened?</T></span>
                  <AutoTextarea
                    aria-label={t("Reflection happened")}
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
                  <span><T>What did you expect?</T></span>
                  <AutoTextarea
                    aria-label={t("Reflection expected")}
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
                  <span><T>What surprised you?</T></span>
                  <AutoTextarea
                    aria-label={t("Reflection surprise")}
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
                  <span><T>What did you learn?</T></span>
                  <AutoTextarea
                    aria-label={t("Reflection learning")}
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
                  <span><T>This looks recurring</T></span>
                </label>
                {reflectionDraft.recurring ? (
                  <label className={styles.field}>
                    <span><T>Recurrence note</T></span>
                    <AutoTextarea
                      aria-label={t("Reflection recurrence note")}
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
                    {working === "reflection" ? t("Saving…") : t("Save reflection")}
                  </button>
                </div>
              </div>
            )
          ) : null}

          {editor === "pattern" ? (
            learning.historyCount < 2 ? (
              <div className={styles.contextMissing}>
                <strong><T>Pattern needs at least two completed Reflections.</T></strong>
                <p>
                  <T>A pattern is not a free-floating note. Capture another real case first, then compare the evidence and decide what actually repeats.</T>
                </p>
                <button
                  className={styles.primary}
                  onClick={() => revealEditor("reflection")}
                  type="button"
                >
                  <T>Capture another reflection</T>
                </button>
              </div>
            ) : patternProposal && patternDraft ? (
              <div className={styles.editorGrid}>
                <div className={styles.contextMissing}>
                  <strong>
                    {t("Evidence base · {count} durable cases", { count: patternProposal.cases.length })}
                  </strong>
                  <p>
                    <T>The system compared completed Reflections. Correct the proposal before keeping it if the evidence does not support the wording.</T>
                  </p>
                </div>
                <label className={styles.field}>
                  <span><T>Pattern type</T></span>
                  <select
                    aria-label={t("Pattern kind")}
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
                    <option value="recurring_pattern">{t("Recurring pattern")}</option>
                    <option value="design_learning">{t("Design learning")}</option>
                    <option value="principle_effectiveness">{t("Principle effectiveness")}</option>
                    <option value="constraint_hypothesis">{t("Constraint hypothesis")}</option>
                  </select>
                </label>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span><T>Pattern hypothesis</T></span>
                  <AutoTextarea
                    aria-label={t("Pattern statement")}
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
                  <span><T>If true, what does it imply?</T></span>
                  <AutoTextarea
                    aria-label={t("Pattern implication")}
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
                  <span><T>Evidence for</T></span>
                  <AutoTextarea
                    aria-label={t("Pattern evidence for")}
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
                  <span><T>Evidence against</T></span>
                  <AutoTextarea
                    aria-label={t("Pattern evidence against")}
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
                  <span><T>What remains uncertain?</T></span>
                  <AutoTextarea
                    aria-label={t("Pattern uncertainty")}
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
                  <strong><T>Cases used in this proposal</T></strong>
                  {patternProposal.cases.map((item, index) => (
                    <p key={item.reflectionId}>
                      {t("Case {count}", { count: index + 1 })} · {item.problem} — {item.happened}
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
                    {working === "pattern:save" ? t("Saving…") : t("Keep pattern")}
                  </button>
                  <button
                    className={styles.secondary}
                    disabled={working !== null}
                    onClick={() => void proposePattern()}
                    type="button"
                  >
                    <T>Try another</T>
                  </button>
                  <button
                    className={styles.secondary}
                    disabled={working !== null}
                    onClick={() => void rejectPattern()}
                    type="button"
                  >
                    <T>Reject</T>
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.contextMissing}>
                <strong><T>Compare the evidence before naming the pattern.</T></strong>
                <p>
                  {t("Learning has {count} completed Reflections. Ask the system to compare them, then edit the hypothesis before you keep it.", { count: learning.historyCount })}
                </p>
                <button
                  className={styles.primary}
                  disabled={working === "pattern:propose"}
                  onClick={() => void proposePattern()}
                  type="button"
                >
                  {working === "pattern:propose" ? t("Comparing reflections…") : t("Synthesize pattern")}
                </button>
              </div>
            )
          ) : null}

          {editor === "principle" ? (
            <div className={styles.editorGrid}>
              <label className={styles.field}>
                <span><T>When</T></span>
                <AutoTextarea
                  aria-label={t("Principle trigger")}
                  onChange={(event) => setTrigger(event.target.value)}
                  rows={2}
                  value={trigger}
                />
              </label>
              <label className={styles.field}>
                <span><T>Then</T></span>
                <AutoTextarea
                  aria-label={t("Principle rule")}
                  onChange={(event) => setRule(event.target.value)}
                  rows={3}
                  value={rule}
                />
              </label>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span><T>Why</T></span>
                <AutoTextarea
                  aria-label={t("Principle rationale")}
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
                  {working === "principle" ? t("Saving…") : t("Save principle")}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className={styles.chapterDeck} aria-label={t("Learning working scene")}>
        <section
          className={styles.chapter}
          id="learning-principle"
          aria-labelledby="principles-title"
        >
          <div className={styles.chapterHeader}>
            <div>
              <p className={styles.eyebrow}><T>Principle</T></p>
              <h2 id="principles-title"><T>Rules I am testing</T></h2>
            </div>
            <button
              className={styles.chapterAction}
              onClick={() => revealEditor("principle")}
              type="button"
            >
              <T>+ Add principle</T>
            </button>
          </div>
          <p className={styles.chapterIntro}>
            <T>Write the trigger and the rule clearly enough that reality can prove you wrong.</T>
          </p>
          {principles.length > 0 ? (
            <div className={styles.librarySearch}>
              <label htmlFor="principle-search"><T>Find a principle</T></label>
              <input id="principle-search" type="search" value={principleQuery} onChange={(event) => setPrincipleQuery(event.target.value)} placeholder={t("Search rule, trigger, or rationale")} />
              <span role="status">{t("{shown} of {total} principles", { shown: matchingPrinciples.length, total: principles.length })}</span>
            </div>
          ) : null}
          {principles.length > 0 && matchingPrinciples.length === 0 ? <p className={styles.noResults}><T>No matching principles. Try another word.</T></p> : null}
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
              <strong><T>No principle yet.</T></strong>
              <span><T>Add a trigger and a rule to test in your next decision.</T></span>
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
              <p className={styles.eyebrow}><T>Reflection</T></p>
              <h2 id="reflections-title"><T>Pain worth learning from</T></h2>
            </div>
            <button
              className={styles.chapterAction}
              onClick={() => revealEditor("reflection")}
              type="button"
            >
              <T>+ Reflection</T>
            </button>
          </div>
          <p className={styles.chapterIntro}>
            <T>Record what happened, what surprised you, and the lesson you think is worth carrying forward.</T>
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
              <strong><T>No reflection yet.</T></strong>
              <span><T>Capture an event to begin your evidence trail.</T></span>
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
              <p className={styles.eyebrow}><T>Pattern</T></p>
              <h2 id="patterns-title"><T>Recurring reality</T></h2>
            </div>
            <button
              className={styles.chapterAction}
              onClick={() => revealEditor("pattern")}
              type="button"
            >
              <T>+ Pattern</T>
            </button>
          </div>
          <p className={styles.chapterIntro}>
            <T>Compare multiple completed Reflections before you name what repeats. Keep evidence for, against, and uncertainty visible beside it.</T>
          </p>
          {activePatterns.length > 0 ? (
            <div className={styles.chapterList}>
              {activePatterns.map((pattern) => (
                <article className={styles.pattern} key={pattern.id}>
                  <div className={styles.patternMeta}>
                    <span>{t(pattern.lifecycleState)}</span>
                    <span>{t("{count} cases", { count: pattern.cases.length })}</span>
                  </div>
                  <h3>{pattern.statement}</h3>
                  <p>{pattern.implication}</p>
                  <details>
                    <summary><T>Inspect evidence</T></summary>
                    <dl>
                      <div>
                        <dt><T>For</T></dt>
                        <dd>{pattern.supportingEvidence || t("Not recorded")}</dd>
                      </div>
                      <div>
                        <dt><T>Against</T></dt>
                        <dd>{pattern.contradictingEvidence || t("Not recorded")}</dd>
                      </div>
                      <div>
                        <dt><T>Uncertainty</T></dt>
                        <dd>{pattern.uncertainty || t("Not recorded")}</dd>
                      </div>
                    </dl>
                  </details>
                  {pattern.appliedRevision ? (
                    <span className={styles.revisionState}>
                      <T>Principle revised · testing</T>
                    </span>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <strong><T>No pattern kept yet.</T></strong>
              <span>
                {learning.historyCount < 2
                  ? "Not enough history yet. Live the loop before asking the system to define a pattern."
                  : "You have enough history. Synthesize a hypothesis, inspect the cases, then keep only what the evidence supports."}
              </span>
            </div>
          )}
          <a className={styles.chapterLink} href="#pattern-tools">
            <T>Open revision tools →</T>
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
          <span><T>Revision</T></span>
          <strong><T>Pattern synthesis & principle revision</T></strong>
        </summary>
        <p className={styles.labIntro}>
          <T>Inspect the longer evidence trail, generate another hypothesis, or revise a principle when reality no longer supports the rule.</T>
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
  const { t } = useI18n();
  return (
    <article className={styles.principle}>
      <div className={styles.principleTop}>
        <span>{t(principle.lifecycleState)}</span>
        {principle.originReflectionId ? (
          <span><T>from reflection</T></span>
        ) : (
          <span><T>mine</T></span>
        )}
      </div>
      <p><T>When</T> {principle.trigger}</p>
      <h3>{principle.rule}</h3>
      {principle.rationale ? (
        <details>
          <summary><T>Why</T></summary>
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
            <T>Accept for testing</T>
          </button>
          <button
            className={styles.secondary}
            disabled={working}
            onClick={() => onReview("reject")}
            type="button"
          >
            <T>Reject</T>
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
  const { t } = useI18n();
  return (
    <article className={styles.reflection}>
      <span className={styles.itemMeta}><T>Experience → Reflection</T></span>
      <h3>{reflection.learning || reflection.happened}</h3>
      {reflection.surprise ? <p>{reflection.surprise}</p> : null}
      {linkedPrinciple ? (
        <span className={styles.linked}>
          <T>Principle</T> · {t(linkedPrinciple.lifecycleState)}
        </span>
      ) : (
        <button
          className={styles.secondary}
          disabled={working}
          onClick={onDistill}
          type="button"
        >
          {working ? t("Distilling…") : t("Distill principle")}
        </button>
      )}
    </article>
  );
}
