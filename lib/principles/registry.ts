import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { listPrinciplesForRegistry } from "@/lib/db/principle-queries";
import { goal, problem, problemPrinciple } from "@/lib/goals/schema";
import { journalEntry, journalPrincipleLink } from "@/lib/journal/schema";
import type { PrincipleOrigin } from "./provenance";

const db = drizzle(postgres(process.env.POSTGRES_URL ?? ""));

export async function listPrinciplesWithProvenance(userId: string) {
  const base = await listPrinciplesForRegistry(userId);
  const ids = base.map((item) => item.id);
  if (!ids.length) {
    return base;
  }
  const [journalRows, problemRows] = await Promise.all([
    db
      .select({
        body: journalEntry.body,
        entryId: journalEntry.id,
        principleId: journalPrincipleLink.principleId,
        relation: journalPrincipleLink.relation,
      })
      .from(journalPrincipleLink)
      .innerJoin(
        journalEntry,
        eq(journalPrincipleLink.entryId, journalEntry.id)
      )
      .where(
        and(
          eq(journalPrincipleLink.userId, userId),
          eq(journalEntry.userId, userId),
          inArray(journalPrincipleLink.principleId, ids)
        )
      ),
    db
      .select({
        goalTitle: goal.title,
        principleId: problemPrinciple.principleId,
        problemId: problem.id,
        problemTitle: problem.title,
        relation: problemPrinciple.relation,
      })
      .from(problemPrinciple)
      .innerJoin(problem, eq(problemPrinciple.problemId, problem.id))
      .innerJoin(goal, eq(problem.goalId, goal.id))
      .where(
        and(
          eq(problemPrinciple.userId, userId),
          eq(problem.userId, userId),
          eq(goal.userId, userId),
          inArray(problemPrinciple.principleId, ids)
        )
      ),
  ]);
  const extended = new Map<string, PrincipleOrigin[]>();
  for (const row of journalRows) {
    const origin: PrincipleOrigin = {
      href: `/journal/${row.entryId}`,
      kind: "journal",
      label: row.body.length > 72 ? `${row.body.slice(0, 72)}…` : row.body,
      relation: row.relation === "origin" ? "created" : "applied",
      sourceId: row.entryId,
    };
    extended.set(row.principleId, [
      ...(extended.get(row.principleId) ?? []),
      origin,
    ]);
  }
  for (const row of problemRows) {
    const origin: PrincipleOrigin = {
      href: "/goals",
      kind: "problem",
      label: `${row.goalTitle} · ${row.problemTitle}`,
      relation: row.relation,
      sourceId: row.problemId,
    };
    extended.set(row.principleId, [
      ...(extended.get(row.principleId) ?? []),
      origin,
    ]);
  }
  return base.map((item) => {
    const extra = extended.get(item.id) ?? [];
    const origins = extra.length
      ? [...item.origins.filter((origin) => origin.kind !== "manual"), ...extra]
      : item.origins;
    return { ...item, origins };
  });
}
