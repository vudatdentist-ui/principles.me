"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type GoalRow = {
  id: string;
  status: "active" | "completed" | "archived";
  title: string;
};

type ActionRow = {
  id: string;
  status: "todo" | "doing" | "done" | "cancelled";
  title: string;
};

type PrincipleRow = {
  id: string;
  relation?: "applied" | "created";
  statement: string;
};

type ProblemRow = {
  actions: ActionRow[];
  diagnosis: { rootCause: string } | null;
  id: string;
  principleCandidate: string | null;
  principles: PrincipleRow[];
  status: "open" | "resolved" | "archived";
  title: string;
};

type GoalDetail = {
  availablePrinciples: PrincipleRow[];
  goal: GoalRow;
  problems: ProblemRow[];
};

async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }
  return body;
}

export function GoalsWorkspace() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(
    null
  );
  const [detail, setDetail] = useState<GoalDetail | null>(null);
  const [goalTitle, setGoalTitle] = useState("");
  const [problemTitle, setProblemTitle] = useState("");
  const [diagnosisText, setDiagnosisText] = useState("");
  const [candidateText, setCandidateText] = useState("");
  const [actionTitle, setActionTitle] = useState("");
  const [principleId, setPrincipleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cortexSuggestion, setCortexSuggestion] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    const body = await jsonRequest("/api/goals");
    setGoals(body.goals);
    setSelectedGoalId((current) => current ?? body.goals[0]?.id ?? null);
  }, []);

  const loadDetail = useCallback(async (goalId: string) => {
    const body = await jsonRequest(`/api/goals/${goalId}`);
    setDetail(body);
    setSelectedProblemId((current) => {
      if (
        current &&
        body.problems.some((item: ProblemRow) => item.id === current)
      ) {
        return current;
      }
      return body.problems[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    loadGoals().catch((cause) => setError(String(cause.message ?? cause)));
  }, [loadGoals]);

  useEffect(() => {
    if (!selectedGoalId) {
      setDetail(null);
      return;
    }
    loadDetail(selectedGoalId).catch((cause) =>
      setError(String(cause.message ?? cause))
    );
  }, [loadDetail, selectedGoalId]);

  const selectedProblem = useMemo(
    () =>
      detail?.problems.find((item) => item.id === selectedProblemId) ?? null,
    [detail, selectedProblemId]
  );

  useEffect(() => {
    setDiagnosisText(selectedProblem?.diagnosis?.rootCause ?? "");
    setCandidateText(selectedProblem?.principleCandidate ?? "");
    setCortexSuggestion(null);
  }, [selectedProblem]);

  async function createGoal(event: React.FormEvent) {
    event.preventDefault();
    if (!goalTitle.trim()) {
      return;
    }
    setError(null);
    const body = await jsonRequest("/api/goals", {
      body: JSON.stringify({ title: goalTitle }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    setGoalTitle("");
    await loadGoals();
    setSelectedGoalId(body.goal.id);
  }

  async function addProblem(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedGoalId || !problemTitle.trim()) {
      return;
    }
    const body = await jsonRequest(`/api/goals/${selectedGoalId}/problems`, {
      body: JSON.stringify({ title: problemTitle }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    setProblemTitle("");
    await loadDetail(selectedGoalId);
    setSelectedProblemId(body.problem.id);
  }

  async function problemCommand(payload: Record<string, unknown>) {
    if (!selectedGoalId || !selectedProblemId) {
      return null;
    }
    setError(null);
    const body = await jsonRequest(
      `/api/goals/${selectedGoalId}/problems/${selectedProblemId}`,
      {
        body: JSON.stringify(payload),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      }
    );
    await loadDetail(selectedGoalId);
    return body;
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-10 text-zinc-950 dark:text-zinc-50">
      <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
          </div>

          <form className="flex gap-2" onSubmit={createGoal}>
            <input
              aria-label="New goal"
              className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-800"
              onChange={(event) => setGoalTitle(event.target.value)}
              placeholder="Goal"
              value={goalTitle}
            />
            <button
              className="rounded-md border border-zinc-200 px-3 text-sm dark:border-zinc-800"
              type="submit"
            >
              Add
            </button>
          </form>

          <div className="space-y-1">
            {goals.map((item) => (
              <button
                className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                  item.id === selectedGoalId
                    ? "bg-zinc-100 font-medium dark:bg-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-950"
                }`}
                key={item.id}
                onClick={() => setSelectedGoalId(item.id)}
                type="button"
              >
                <span className="block truncate">{item.title}</span>
                <span className="text-xs font-normal text-zinc-400">
                  {item.status}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0">
          {error ? (
            <div className="mb-5 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 dark:border-red-950 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {detail ? (
            <div className="space-y-8">
              <header className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {detail.goal.title}
                  </h2>
                  <span className="text-sm text-zinc-400">
                    {detail.goal.status}
                  </span>
                </div>
                <select
                  aria-label="Goal status"
                  className="rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-800"
                  onChange={async (event) => {
                    await jsonRequest(`/api/goals/${detail.goal.id}`, {
                      body: JSON.stringify({ status: event.target.value }),
                      headers: { "content-type": "application/json" },
                      method: "PATCH",
                    });
                    await Promise.all([
                      loadGoals(),
                      loadDetail(detail.goal.id),
                    ]);
                  }}
                  value={detail.goal.status}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </header>

              <div className="grid gap-8 md:grid-cols-[260px_1fr]">
                <div className="space-y-4">
                  <div className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Problems
                  </div>
                  <div className="space-y-1">
                    {detail.problems.map((item) => (
                      <button
                        className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                          item.id === selectedProblemId
                            ? "bg-zinc-100 dark:bg-zinc-900"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-950"
                        }`}
                        key={item.id}
                        onClick={() => setSelectedProblemId(item.id)}
                        type="button"
                      >
                        <span className="block">{item.title}</span>
                        <span className="text-xs text-zinc-400">
                          {item.status}
                        </span>
                      </button>
                    ))}
                  </div>
                  <form className="flex gap-2" onSubmit={addProblem}>
                    <input
                      aria-label="Add problem"
                      className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-800"
                      onChange={(event) => setProblemTitle(event.target.value)}
                      placeholder="Problem"
                      value={problemTitle}
                    />
                    <button className="text-sm" type="submit">
                      + Add
                    </button>
                  </form>
                </div>

                {selectedProblem ? (
                  <div className="space-y-9">
                    <section className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-medium">1 Problem</h3>
                        <select
                          aria-label="Problem status"
                          className="bg-transparent text-sm text-zinc-500"
                          onChange={(event) =>
                            problemCommand({
                              command: "update_problem",
                              status: event.target.value,
                            })
                          }
                          value={selectedProblem.status}
                        >
                          <option value="open">Open</option>
                          <option value="resolved">Resolved</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                      <div className="rounded-md border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                        {selectedProblem.title}
                      </div>
                    </section>

                    <section className="space-y-3">
                      <h3 className="text-lg font-medium">2 Diagnosis</h3>
                      <textarea
                        aria-label="Diagnosis"
                        className="min-h-28 w-full resize-y rounded-md border border-zinc-200 bg-transparent px-4 py-3 text-sm outline-none focus:border-zinc-500 dark:border-zinc-800"
                        onChange={(event) =>
                          setDiagnosisText(event.target.value)
                        }
                        placeholder="Root cause"
                        value={diagnosisText}
                      />
                      <div className="flex gap-3">
                        <button
                          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-800"
                          onClick={() =>
                            problemCommand({
                              command: "save_diagnosis",
                              rootCause: diagnosisText,
                            })
                          }
                          type="button"
                        >
                          Save
                        </button>
                        <button
                          className="text-sm text-zinc-500"
                          onClick={async () => {
                            try {
                              const body = await problemCommand({
                                command: "cortex",
                              });
                              const suggestion = body?.suggestion;
                              setCortexSuggestion(
                                [
                                  suggestion?.diagnosis,
                                  suggestion?.principleCandidate,
                                  ...(suggestion?.actions ?? []),
                                ]
                                  .filter(Boolean)
                                  .join("\n") || "No suggestion"
                              );
                            } catch (cause) {
                              setError(String((cause as Error).message));
                            }
                          }}
                          type="button"
                        >
                          Ask Cortex
                        </button>
                      </div>
                      {cortexSuggestion ? (
                        <pre className="whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
                          {cortexSuggestion}
                        </pre>
                      ) : null}
                    </section>

                    <section className="space-y-3">
                      <h3 className="text-lg font-medium">3 Principle</h3>
                      {selectedProblem.principles.map((item) => (
                        <div
                          className="rounded-md border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
                          key={item.id}
                        >
                          {item.statement}
                        </div>
                      ))}
                      <textarea
                        aria-label="Candidate principle"
                        className="min-h-20 w-full resize-y rounded-md border border-zinc-200 bg-transparent px-4 py-3 text-sm dark:border-zinc-800"
                        onChange={(event) =>
                          setCandidateText(event.target.value)
                        }
                        placeholder="Candidate principle"
                        value={candidateText}
                      />
                      <div className="flex flex-wrap gap-3">
                        <button
                          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-800"
                          onClick={() =>
                            problemCommand({
                              command: "update_problem",
                              principleCandidate: candidateText || null,
                            })
                          }
                          type="button"
                        >
                          Save candidate
                        </button>
                        <button
                          className="text-sm disabled:text-zinc-300"
                          disabled={!candidateText.trim()}
                          onClick={() =>
                            problemCommand({ command: "adopt_candidate" })
                          }
                          type="button"
                        >
                          Adopt
                        </button>
                      </div>
                      {detail.availablePrinciples.length > 0 ? (
                        <div className="flex gap-2">
                          <select
                            aria-label="Existing principle"
                            className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-800"
                            onChange={(event) =>
                              setPrincipleId(event.target.value)
                            }
                            value={principleId}
                          >
                            <option value="">Existing principle</option>
                            {detail.availablePrinciples.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.statement}
                              </option>
                            ))}
                          </select>
                          <button
                            className="text-sm disabled:text-zinc-300"
                            disabled={!principleId}
                            onClick={() =>
                              problemCommand({
                                command: "link_principle",
                                principleId,
                              })
                            }
                            type="button"
                          >
                            Link
                          </button>
                        </div>
                      ) : null}
                    </section>

                    <section className="space-y-3">
                      <h3 className="text-lg font-medium">4 Action</h3>
                      <div className="space-y-2">
                        {selectedProblem.actions.map((item) => (
                          <div
                            className="flex items-center gap-3 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                            key={item.id}
                          >
                            <input
                              aria-label={`Complete ${item.title}`}
                              checked={item.status === "done"}
                              onChange={(event) =>
                                problemCommand({
                                  actionId: item.id,
                                  command: "update_action",
                                  status: event.target.checked
                                    ? "done"
                                    : "todo",
                                })
                              }
                              type="checkbox"
                            />
                            <span
                              className={`flex-1 text-sm ${item.status === "done" ? "text-zinc-400 line-through" : ""}`}
                            >
                              {item.title}
                            </span>
                            <span className="text-xs text-zinc-400">
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                      <form
                        className="flex gap-2"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          if (!actionTitle.trim()) {
                            return;
                          }
                          await problemCommand({
                            command: "add_action",
                            title: actionTitle,
                          });
                          setActionTitle("");
                        }}
                      >
                        <input
                          aria-label="Add action"
                          className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-800"
                          onChange={(event) =>
                            setActionTitle(event.target.value)
                          }
                          placeholder="Action"
                          value={actionTitle}
                        />
                        <button className="text-sm" type="submit">
                          + Add
                        </button>
                      </form>
                    </section>
                  </div>
                ) : (
                  <div className="py-20 text-sm text-zinc-400">
                    Add a problem.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-20 text-sm text-zinc-400">No goal selected.</div>
          )}
        </section>
      </div>
    </main>
  );
}
