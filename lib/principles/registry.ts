import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { listPrinciplesForRegistry } from "@/lib/db/principle-queries";
import { journalEntry, journalPrincipleLink } from "@/lib/journal/schema";
import { goal, problem, problemPrinciple } from "@/lib/goals/schema";
import type { PrincipleOrigin } from "./provenance";

const db = drizzle(postgres(process.env.POSTGRES_URL ?? ""));

export async function listPrinciplesWithProvenance(userId: string) {
  const base = await listPrinciplesForRegistry(userId);
  const ids = base.map((item) => item.id);
  if (!ids.length) return base;
  const [journalRows, problemRows] = await Promise.all([
    db.select({ principleId: journalPrincipleLink.principleId, entryId: journalEntry.id, body: journalEntry.body, relation: journalPrincipleLink.relation }).from(journalPrincipleLink).innerJoin(journalEntry, eq(journalPrincipleLink.entryId, journalEntry.id)).where(and(eq(journalPrincipleLink.userId,userId),eq(journalEntry.userId,userId),inArray(journalPrincipleLink.principleId,ids))),
    db.select({ principleId: problemPrinciple.principleId, problemId: problem.id, problemTitle: problem.title, goalTitle: goal.title, relation: problemPrinciple.relation }).from(problemPrinciple).innerJoin(problem,eq(problemPrinciple.problemId,problem.id)).innerJoin(goal,eq(problem.goalId,goal.id)).where(and(eq(problemPrinciple.userId,userId),eq(problem.userId,userId),eq(goal.userId,userId),inArray(problemPrinciple.principleId,ids))),
  ]);
  const extended = new Map<string, PrincipleOrigin[]>();
  for (const row of journalRows) { const origin: PrincipleOrigin = { kind:"journal", sourceId:row.entryId, href:`/journal/${row.entryId}`, label:row.body.length > 72 ? `${row.body.slice(0,72)}…` : row.body, relation:row.relation === "origin" ? "created" : "applied" }; extended.set(row.principleId,[...(extended.get(row.principleId)??[]),origin]); }
  for (const row of problemRows) { const origin: PrincipleOrigin = { kind:"problem", sourceId:row.problemId, href:"/goals", label:`${row.goalTitle} · ${row.problemTitle}`, relation:row.relation }; extended.set(row.principleId,[...(extended.get(row.principleId)??[]),origin]); }
  return base.map((item) => { const extra = extended.get(item.id) ?? []; const origins = extra.length ? [...item.origins.filter((origin)=>origin.kind!=="manual"),...extra] : item.origins; return { ...item, origins }; });
}
