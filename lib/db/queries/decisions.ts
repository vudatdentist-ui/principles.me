import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  type Decision,
  type DecisionOutcome,
  type DecisionRun,
  decision,
  decisionOutcome,
  decisionPrinciple,
  decisionRun,
  principle,
  type Principle,
} from "../schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
export const decisionPersistenceDb = drizzle(client);

interface CreateDecisionRunRecordInput {
  contextSnapshot: unknown;
  model: string;
  promptVersion: string;
  question: string;
  retrievalPlan: unknown;
  startedAt?: Date;
  userId: string;
}

interface CompleteDecisionRunRecordInput {
  analysisSnapshot: unknown;
  auditSnapshot: unknown;
  completedAt?: Date;
  decisionBrief: unknown;
  evidenceSnapshot: unknown;
  id: string;
  userId: string;
}

interface FailDecisionRunRecordInput {
  errorCode: string;
  failedAt?: Date;
  id: string;
  userId: string;
}

interface CreateSavedDecisionRecordInput {
  context?: string | null;
  objective?: string | null;
  reviewAt?: Date | null;
  runId: string;
  title?: string;
  userId: string;
}

export type DecisionSummaryRecord = Pick<
  Decision,
  | "createdAt"
  | "decidedAt"
  | "id"
  | "question"
  | "reviewAt"
  | "status"
  | "title"
  | "updatedAt"
>;

export interface DecisionDetailRecord {
  decision: Decision;
  outcomes: DecisionOutcome[];
  principles: Principle[];
  run: DecisionRun | null;
}

function normalizeRecentLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return 20;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

export async function createDecisionRunRecord(
  input: CreateDecisionRunRecordInput
): Promise<DecisionRun> {
  const [created] = await decisionPersistenceDb
    .insert(decisionRun)
    .values({
      contextSnapshot: input.contextSnapshot,
      model: input.model,
      promptVersion: input.promptVersion,
      question: input.question,
      retrievalPlan: input.retrievalPlan,
      startedAt: input.startedAt ?? new Date(),
      userId: input.userId,
    })
    .returning();

  if (!created) {
    throw new Error("Decision run was not created.");
  }

  return created;
}

export async function completeDecisionRunRecord(
  input: CompleteDecisionRunRecordInput
): Promise<DecisionRun | null> {
  const [updated] = await decisionPersistenceDb
    .update(decisionRun)
    .set({
      analysisSnapshot: input.analysisSnapshot,
      auditSnapshot: input.auditSnapshot,
      completedAt: input.completedAt ?? new Date(),
      decisionBrief: input.decisionBrief,
      evidenceSnapshot: input.evidenceSnapshot,
    })
    .where(
      and(
        eq(decisionRun.id, input.id),
        eq(decisionRun.userId, input.userId),
        isNull(decisionRun.completedAt),
        isNull(decisionRun.failedAt)
      )
    )
    .returning();

  return updated ?? null;
}

export async function failDecisionRunRecord(
  input: FailDecisionRunRecordInput
): Promise<DecisionRun | null> {
  const [updated] = await decisionPersistenceDb
    .update(decisionRun)
    .set({
      errorCode: input.errorCode,
      failedAt: input.failedAt ?? new Date(),
    })
    .where(
      and(
        eq(decisionRun.id, input.id),
        eq(decisionRun.userId, input.userId),
        isNull(decisionRun.completedAt),
        isNull(decisionRun.failedAt)
      )
    )
    .returning();

  return updated ?? null;
}

export async function getDecisionRunRecord(
  id: string,
  userId: string
): Promise<DecisionRun | null> {
  const [selected] = await decisionPersistenceDb
    .select()
    .from(decisionRun)
    .where(and(eq(decisionRun.id, id), eq(decisionRun.userId, userId)))
    .limit(1);

  return selected ?? null;
}

export async function createSavedDecisionRecord(
  input: CreateSavedDecisionRecordInput
): Promise<Decision | null> {
  return decisionPersistenceDb.transaction(async (tx) => {
    const [run] = await tx
      .select()
      .from(decisionRun)
      .where(
        and(
          eq(decisionRun.id, input.runId),
          eq(decisionRun.userId, input.userId)
        )
      )
      .limit(1);

    if (!run?.completedAt || run.failedAt || run.decisionBrief === null) {
      return null;
    }

    if (run.decisionId) {
      const [existingDecision] = await tx
        .select()
        .from(decision)
        .where(
          and(
            eq(decision.id, run.decisionId),
            eq(decision.userId, input.userId)
          )
        )
        .limit(1);

      return existingDecision ?? null;
    }

    const [createdDecision] = await tx
      .insert(decision)
      .values({
        context: input.context ?? null,
        councilBrief: run.decisionBrief,
        councilPlan: run.retrievalPlan,
        decidedAt: run.completedAt,
        evidence: run.evidenceSnapshot,
        objective: input.objective ?? null,
        question: run.question,
        reviewAt: input.reviewAt ?? null,
        status: "decided",
        title: input.title?.trim() || run.question,
        userId: input.userId,
      })
      .returning();

    if (!createdDecision) {
      return null;
    }

    const [linkedRun] = await tx
      .update(decisionRun)
      .set({ decisionId: createdDecision.id })
      .where(
        and(
          eq(decisionRun.id, input.runId),
          eq(decisionRun.userId, input.userId),
          isNotNull(decisionRun.completedAt),
          isNull(decisionRun.failedAt),
          isNull(decisionRun.decisionId)
        )
      )
      .returning({ id: decisionRun.id });

    if (linkedRun) {
      return createdDecision;
    }

    await tx
      .delete(decision)
      .where(
        and(
          eq(decision.id, createdDecision.id),
          eq(decision.userId, input.userId)
        )
      );

    const [nowLinkedRun] = await tx
      .select({ decisionId: decisionRun.decisionId })
      .from(decisionRun)
      .where(
        and(
          eq(decisionRun.id, input.runId),
          eq(decisionRun.userId, input.userId)
        )
      )
      .limit(1);

    if (!nowLinkedRun?.decisionId) {
      return null;
    }

    const [existingDecision] = await tx
      .select()
      .from(decision)
      .where(
        and(
          eq(decision.id, nowLinkedRun.decisionId),
          eq(decision.userId, input.userId)
        )
      )
      .limit(1);

    return existingDecision ?? null;
  });
}

export async function getDecisionDetailRecord(
  id: string,
  userId: string
): Promise<DecisionDetailRecord | null> {
  const [selectedDecision] = await decisionPersistenceDb
    .select()
    .from(decision)
    .where(and(eq(decision.id, id), eq(decision.userId, userId)))
    .limit(1);

  if (!selectedDecision) {
    return null;
  }

  const [runs, outcomes, principleRows] = await Promise.all([
    decisionPersistenceDb
      .select()
      .from(decisionRun)
      .where(
        and(
          eq(decisionRun.decisionId, id),
          eq(decisionRun.userId, userId),
          isNotNull(decisionRun.completedAt)
        )
      )
      .orderBy(asc(decisionRun.completedAt), asc(decisionRun.startedAt))
      .limit(1),
    decisionPersistenceDb
      .select()
      .from(decisionOutcome)
      .where(
        and(
          eq(decisionOutcome.decisionId, id),
          eq(decisionOutcome.userId, userId)
        )
      )
      .orderBy(desc(decisionOutcome.createdAt)),
    decisionPersistenceDb
      .select({ principle })
      .from(decisionPrinciple)
      .innerJoin(principle, eq(decisionPrinciple.principleId, principle.id))
      .where(
        and(
          eq(decisionPrinciple.decisionId, id),
          eq(decisionPrinciple.userId, userId),
          eq(principle.userId, userId)
        )
      ),
  ]);

  return {
    decision: selectedDecision,
    outcomes,
    principles: principleRows.map((row) => row.principle),
    run: runs[0] ?? null,
  };
}

export async function listRecentDecisionRecords(
  userId: string,
  limit: number
): Promise<DecisionSummaryRecord[]> {
  return decisionPersistenceDb
    .select({
      createdAt: decision.createdAt,
      decidedAt: decision.decidedAt,
      id: decision.id,
      question: decision.question,
      reviewAt: decision.reviewAt,
      status: decision.status,
      title: decision.title,
      updatedAt: decision.updatedAt,
    })
    .from(decision)
    .where(eq(decision.userId, userId))
    .orderBy(desc(decision.decidedAt), desc(decision.createdAt))
    .limit(normalizeRecentLimit(limit));
}

export async function listDueForReviewDecisionRecords(
  userId: string
): Promise<DecisionSummaryRecord[]> {
  return decisionPersistenceDb
    .select({
      createdAt: decision.createdAt,
      decidedAt: decision.decidedAt,
      id: decision.id,
      question: decision.question,
      reviewAt: decision.reviewAt,
      status: decision.status,
      title: decision.title,
      updatedAt: decision.updatedAt,
    })
    .from(decision)
    .where(
      and(
        eq(decision.userId, userId),
        inArray(decision.status, ["decided", "review_due"]),
        isNotNull(decision.reviewAt),
        lte(decision.reviewAt, new Date())
      )
    )
    .orderBy(asc(decision.reviewAt), desc(decision.createdAt));
}
