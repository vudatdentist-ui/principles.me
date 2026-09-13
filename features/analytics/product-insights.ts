import { db } from "@/lib/db/client";

export type ProductEvent = {
  eventType: string;
  happenedAt: string;
  workspaceId: string;
};

export type ProductInsights = {
  activationRate: number | null;
  activatedWorkspaces: number;
  fullLearningLoops: number;
  learningLoopRate: number | null;
  medianSecondsToFirstProblem: number | null;
  newWorkspaces: number;
  period: { from: string; to: string };
  reflectionReturnRate: number | null;
  repeatReflectionWorkspaces: number;
  stageReach: Record<string, number>;
  workspacesObserved: number;
  workspacesWithReflection: number;
};

const STAGES = [
  ["workspace", "workspace.created"],
  ["goal", "goal.chosen"],
  ["reality", "reality.observed"],
  ["problem", "problem.recognized"],
  ["diagnosis", "diagnosis.accepted", "diagnosis.revised"],
  ["design", "design.accepted", "design.revised"],
  ["do", "action.completed"],
  ["outcome", "outcome.recorded"],
  ["reflection", "reflection.completed"],
  ["principle", "principle.accepted", "principle.revised"],
] as const;

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? Number((numerator / denominator).toFixed(4)) : null;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? null;
  }
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function firstTime(events: readonly ProductEvent[], eventTypes: readonly string[]): number | null {
  const wanted = new Set(eventTypes);
  for (const event of events) {
    if (wanted.has(event.eventType)) {
      return new Date(event.happenedAt).getTime();
    }
  }
  return null;
}

export function summarizeProductEvents(
  inputEvents: readonly ProductEvent[],
  period: { from: string; to: string },
): ProductInsights {
  const byWorkspace = new Map<string, ProductEvent[]>();
  for (const event of inputEvents) {
    const events = byWorkspace.get(event.workspaceId) ?? [];
    events.push(event);
    byWorkspace.set(event.workspaceId, events);
  }
  for (const events of byWorkspace.values()) {
    events.sort(
      (a, b) => new Date(a.happenedAt).getTime() - new Date(b.happenedAt).getTime(),
    );
  }

  const stageReach: Record<string, number> = {};
  for (const [stage, ...eventTypes] of STAGES) {
    stageReach[stage] = [...byWorkspace.values()].filter((events) =>
      events.some((event) => eventTypes.includes(event.eventType as never)),
    ).length;
  }

  let activatedWorkspaces = 0;
  let fullLearningLoops = 0;
  let repeatReflectionWorkspaces = 0;
  let workspacesWithReflection = 0;
  const timeToFirstProblemSeconds: number[] = [];

  for (const events of byWorkspace.values()) {
    const created = firstTime(events, ["workspace.created"]);
    const goal = firstTime(events, ["goal.chosen"]);
    const reality = firstTime(events, ["reality.observed"]);
    const problem = firstTime(events, ["problem.recognized"]);
    const outcomeReview = firstTime(events, ["outcome.reviewed"]);
    const principle = firstTime(events, ["principle.accepted", "principle.revised"]);

    const activated =
      goal !== null &&
      reality !== null &&
      problem !== null &&
      goal <= reality &&
      reality <= problem;
    if (activated) {
      activatedWorkspaces += 1;
    }
    if (created !== null && problem !== null && problem >= created) {
      timeToFirstProblemSeconds.push((problem - created) / 1000);
    }
    if (outcomeReview !== null && principle !== null && principle >= outcomeReview) {
      fullLearningLoops += 1;
    }

    const reflectionDays = new Set(
      events
        .filter((event) => event.eventType === "reflection.completed")
        .map((event) => new Date(event.happenedAt).toISOString().slice(0, 10)),
    );
    if (reflectionDays.size > 0) {
      workspacesWithReflection += 1;
    }
    if (reflectionDays.size >= 2) {
      repeatReflectionWorkspaces += 1;
    }
  }

  const newWorkspaces = stageReach.workspace ?? 0;
  return {
    activationRate: ratio(activatedWorkspaces, newWorkspaces),
    activatedWorkspaces,
    fullLearningLoops,
    learningLoopRate: ratio(fullLearningLoops, activatedWorkspaces),
    medianSecondsToFirstProblem: median(timeToFirstProblemSeconds),
    newWorkspaces,
    period,
    reflectionReturnRate: ratio(repeatReflectionWorkspaces, workspacesWithReflection),
    repeatReflectionWorkspaces,
    stageReach,
    workspacesObserved: byWorkspace.size,
    workspacesWithReflection,
  };
}

export async function loadProductInsights(input: {
  days?: number;
  now?: Date;
} = {}): Promise<ProductInsights> {
  const days = Math.min(Math.max(Math.trunc(input.days ?? 30), 1), 365);
  const to = input.now ?? new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const rows = await db()`
    SELECT workspace_id, event_type, happened_at
    FROM activity_events
    WHERE happened_at >= ${from} AND happened_at <= ${to}
    ORDER BY workspace_id, happened_at ASC
  `;
  const events: ProductEvent[] = rows.map((row) => ({
    eventType: String(row.event_type),
    happenedAt: new Date(String(row.happened_at)).toISOString(),
    workspaceId: String(row.workspace_id),
  }));
  return summarizeProductEvents(events, {
    from: from.toISOString(),
    to: to.toISOString(),
  });
}
