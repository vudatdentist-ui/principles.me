import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { principle, principleRevision } from "@/lib/db/schema";
import {
  diagnosis,
  goal,
  goalAction,
  problem,
  problemPrinciple,
  type Goal,
} from "./schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

async function ownedGoal(id: string, userId: string) {
  const [row] = await db
    .select()
    .from(goal)
    .where(and(eq(goal.id, id), eq(goal.userId, userId)))
    .limit(1);
  return row ?? null;
}

async function ownedProblem(id: string, goalId: string, userId: string) {
  const [row] = await db
    .select()
    .from(problem)
    .where(
      and(
        eq(problem.id, id),
        eq(problem.goalId, goalId),
        eq(problem.userId, userId)
      )
    )
    .limit(1);
  return row ?? null;
}

export function listGoals(userId: string) {
  return db
    .select()
    .from(goal)
    .where(eq(goal.userId, userId))
    .orderBy(desc(goal.updatedAt));
}

export async function createGoal({ userId, title }: { userId: string; title: string }) {
  const [created] = await db.insert(goal).values({ title, userId }).returning();
  return created;
}

export async function updateGoal({
  id,
  userId,
  title,
  status,
}: {
  id: string;
  userId: string;
  title?: string;
  status?: Goal["status"];
}) {
  const [updated] = await db
    .update(goal)
    .set({
      ...(title ? { title } : {}),
      ...(status ? { status } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(goal.id, id), eq(goal.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function getGoalDetail(id: string, userId: string) {
  const selectedGoal = await ownedGoal(id, userId);
  if (!selectedGoal) return null;

  const problems = await db
    .select()
    .from(problem)
    .where(and(eq(problem.goalId, id), eq(problem.userId, userId)))
    .orderBy(desc(problem.updatedAt));

  const enrichedProblems = await Promise.all(
    problems.map(async (item) => {
      const [diagnoses, actions, principles] = await Promise.all([
        db
          .select()
          .from(diagnosis)
          .where(
            and(eq(diagnosis.problemId, item.id), eq(diagnosis.userId, userId))
          )
          .limit(1),
        db
          .select()
          .from(goalAction)
          .where(
            and(eq(goalAction.problemId, item.id), eq(goalAction.userId, userId))
          )
          .orderBy(desc(goalAction.createdAt)),
        db
          .select({
            id: principle.id,
            relation: problemPrinciple.relation,
            revision: principle.revision,
            statement: principle.statement,
            status: principle.status,
          })
          .from(problemPrinciple)
          .innerJoin(principle, eq(problemPrinciple.principleId, principle.id))
          .where(
            and(
              eq(problemPrinciple.problemId, item.id),
              eq(problemPrinciple.userId, userId),
              eq(principle.userId, userId)
            )
          )
          .orderBy(desc(problemPrinciple.createdAt)),
      ]);

      return {
        ...item,
        actions,
        diagnosis: diagnoses[0] ?? null,
        principles,
      };
    })
  );

  return { goal: selectedGoal, problems: enrichedProblems };
}

export async function createProblem({
  goalId,
  userId,
  title,
}: {
  goalId: string;
  userId: string;
  title: string;
}) {
  if (!(await ownedGoal(goalId, userId))) return null;
  const [created] = await db
    .insert(problem)
    .values({ goalId, title, userId })
    .returning();
  await db
    .update(goal)
    .set({ updatedAt: new Date() })
    .where(and(eq(goal.id, goalId), eq(goal.userId, userId)));
  return created;
}

export async function updateProblem({
  goalId,
  problemId,
  userId,
  title,
  status,
  principleCandidate,
}: {
  goalId: string;
  problemId: string;
  userId: string;
  title?: string;
  status?: "open" | "resolved" | "archived";
  principleCandidate?: string | null;
}) {
  const [updated] = await db
    .update(problem)
    .set({
      ...(title ? { title } : {}),
      ...(status ? { status } : {}),
      ...(principleCandidate !== undefined ? { principleCandidate } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(problem.id, problemId),
        eq(problem.goalId, goalId),
        eq(problem.userId, userId)
      )
    )
    .returning();
  return updated ?? null;
}

export async function saveDiagnosis({
  goalId,
  problemId,
  userId,
  rootCause,
}: {
  goalId: string;
  problemId: string;
  userId: string;
  rootCause: string;
}) {
  if (!(await ownedProblem(problemId, goalId, userId))) return null;
  const [saved] = await db
    .insert(diagnosis)
    .values({ problemId, rootCause, userId })
    .onConflictDoUpdate({
      target: diagnosis.problemId,
      set: { rootCause, updatedAt: new Date() },
    })
    .returning();
  return saved;
}

export async function createAction({
  goalId,
  problemId,
  userId,
  title,
}: {
  goalId: string;
  problemId: string;
  userId: string;
  title: string;
}) {
  if (!(await ownedProblem(problemId, goalId, userId))) return null;
  const [created] = await db
    .insert(goalAction)
    .values({ problemId, title, userId })
    .returning();
  return created;
}

export async function updateAction({
  goalId,
  problemId,
  actionId,
  userId,
  title,
  status,
}: {
  goalId: string;
  problemId: string;
  actionId: string;
  userId: string;
  title?: string;
  status?: "todo" | "doing" | "done" | "cancelled";
}) {
  if (!(await ownedProblem(problemId, goalId, userId))) return null;
  const [updated] = await db
    .update(goalAction)
    .set({
      ...(title ? { title } : {}),
      ...(status ? { status } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(goalAction.id, actionId),
        eq(goalAction.problemId, problemId),
        eq(goalAction.userId, userId)
      )
    )
    .returning();
  return updated ?? null;
}

export async function linkPrinciple({
  goalId,
  problemId,
  principleId,
  userId,
}: {
  goalId: string;
  problemId: string;
  principleId: string;
  userId: string;
}) {
  if (!(await ownedProblem(problemId, goalId, userId))) return null;
  const [ownedPrinciple] = await db
    .select({ id: principle.id })
    .from(principle)
    .where(and(eq(principle.id, principleId), eq(principle.userId, userId)))
    .limit(1);
  if (!ownedPrinciple) return null;

  const [linked] = await db
    .insert(problemPrinciple)
    .values({ principleId, problemId, relation: "applied", userId })
    .onConflictDoNothing()
    .returning();
  return linked ?? { principleId, problemId, relation: "applied" as const, userId };
}

export async function adoptProblemCandidate({
  goalId,
  problemId,
  userId,
}: {
  goalId: string;
  problemId: string;
  userId: string;
}) {
  const selectedProblem = await ownedProblem(problemId, goalId, userId);
  const statement = selectedProblem?.principleCandidate?.trim();
  if (!selectedProblem || !statement) return null;

  return db.transaction(async (tx) => {
    const [createdPrinciple] = await tx
      .insert(principle)
      .values({ statement, userId })
      .returning();

    await tx.insert(principleRevision).values({
      principleId: createdPrinciple.id,
      revision: 1,
      statement,
      userId,
    });

    await tx.insert(problemPrinciple).values({
      principleId: createdPrinciple.id,
      problemId,
      relation: "created",
      userId,
    });

    await tx
      .update(problem)
      .set({ principleCandidate: null, updatedAt: new Date() })
      .where(
        and(
          eq(problem.id, problemId),
          eq(problem.goalId, goalId),
          eq(problem.userId, userId)
        )
      );

    return createdPrinciple;
  });
}

export async function listAvailablePrinciples(userId: string) {
  return db
    .select({
      id: principle.id,
      revision: principle.revision,
      statement: principle.statement,
      status: principle.status,
    })
    .from(principle)
    .where(eq(principle.userId, userId))
    .orderBy(desc(principle.updatedAt));
}
