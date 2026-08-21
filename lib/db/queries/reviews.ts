import "server-only";

import { and, desc, eq } from "drizzle-orm";
import {
  type DecisionAssumptionReview,
  type DecisionOutcome,
  type DecisionPrincipleReview,
  decision,
  decisionAssumptionReview,
  decisionOutcome,
  decisionPrincipleReview,
  principle,
} from "../schema";
import { decisionPersistenceDb } from "./decisions";

interface CreateDecisionOutcomeRecordInput {
  decisionId: string;
  decisionQuality?: "no" | "unclear" | "yes";
  lessons?: string | null;
  reasoningQuality?: "no" | "partially" | "yes";
  result: string;
  userId: string;
  verdict?: "mixed" | "negative" | "positive" | "too_early";
}

interface CreateAssumptionReviewRecordInput {
  assumptionText: string;
  decisionId: string;
  note?: string | null;
  outcomeId: string;
  userId: string;
  verdict?: "correct" | "incorrect" | "unclear";
}

interface CreatePrincipleReviewRecordInput {
  action: "keep" | "retire" | "revise";
  decisionId: string;
  outcomeId: string;
  previousRevision: number;
  previousStatement: string;
  principleId: string;
  resultingRevision: number;
  resultingStatement: string;
  userId: string;
}

export async function createDecisionOutcomeRecord(
  input: CreateDecisionOutcomeRecordInput
): Promise<DecisionOutcome | null> {
  const [ownedDecision] = await decisionPersistenceDb
    .select({ id: decision.id })
    .from(decision)
    .where(
      and(eq(decision.id, input.decisionId), eq(decision.userId, input.userId))
    )
    .limit(1);

  if (!ownedDecision) {
    return null;
  }

  const [created] = await decisionPersistenceDb
    .insert(decisionOutcome)
    .values({
      decisionId: input.decisionId,
      decisionQuality: input.decisionQuality ?? "unclear",
      lessons: input.lessons ?? null,
      reasoningQuality: input.reasoningQuality ?? "partially",
      result: input.result,
      userId: input.userId,
      verdict: input.verdict ?? "too_early",
    })
    .returning();

  return created ?? null;
}

export async function createAssumptionReviewRecord(
  input: CreateAssumptionReviewRecordInput
): Promise<DecisionAssumptionReview | null> {
  const [ownedOutcome] = await decisionPersistenceDb
    .select({ id: decisionOutcome.id })
    .from(decisionOutcome)
    .innerJoin(decision, eq(decisionOutcome.decisionId, decision.id))
    .where(
      and(
        eq(decisionOutcome.id, input.outcomeId),
        eq(decisionOutcome.decisionId, input.decisionId),
        eq(decisionOutcome.userId, input.userId),
        eq(decision.userId, input.userId)
      )
    )
    .limit(1);

  if (!ownedOutcome) {
    return null;
  }

  const [created] = await decisionPersistenceDb
    .insert(decisionAssumptionReview)
    .values({
      assumptionText: input.assumptionText,
      decisionId: input.decisionId,
      note: input.note ?? null,
      outcomeId: input.outcomeId,
      userId: input.userId,
      verdict: input.verdict ?? "unclear",
    })
    .returning();

  return created ?? null;
}

export async function createPrincipleReviewRecord(
  input: CreatePrincipleReviewRecordInput
): Promise<DecisionPrincipleReview | null> {
  const [scope] = await decisionPersistenceDb
    .select({
      outcomeId: decisionOutcome.id,
      principleId: principle.id,
    })
    .from(decisionOutcome)
    .innerJoin(decision, eq(decisionOutcome.decisionId, decision.id))
    .innerJoin(principle, eq(principle.id, input.principleId))
    .where(
      and(
        eq(decisionOutcome.id, input.outcomeId),
        eq(decisionOutcome.decisionId, input.decisionId),
        eq(decisionOutcome.userId, input.userId),
        eq(decision.userId, input.userId),
        eq(principle.userId, input.userId)
      )
    )
    .limit(1);

  if (!scope) {
    return null;
  }

  const [created] = await decisionPersistenceDb
    .insert(decisionPrincipleReview)
    .values({
      action: input.action,
      decisionId: input.decisionId,
      outcomeId: input.outcomeId,
      previousRevision: input.previousRevision,
      previousStatement: input.previousStatement,
      principleId: input.principleId,
      resultingRevision: input.resultingRevision,
      resultingStatement: input.resultingStatement,
      userId: input.userId,
    })
    .returning();

  return created ?? null;
}

export async function markDecisionReviewedRecord(
  decisionId: string,
  userId: string,
  reviewedAt: Date
): Promise<boolean> {
  const [updated] = await decisionPersistenceDb
    .update(decision)
    .set({
      reviewedAt,
      status: "reviewed",
      updatedAt: reviewedAt,
    })
    .where(and(eq(decision.id, decisionId), eq(decision.userId, userId)))
    .returning({ id: decision.id });

  return Boolean(updated);
}

export async function listDecisionOutcomeRecords(
  decisionId: string,
  userId: string
): Promise<DecisionOutcome[]> {
  const [ownedDecision] = await decisionPersistenceDb
    .select({ id: decision.id })
    .from(decision)
    .where(and(eq(decision.id, decisionId), eq(decision.userId, userId)))
    .limit(1);

  if (!ownedDecision) {
    return [];
  }

  return decisionPersistenceDb
    .select()
    .from(decisionOutcome)
    .where(
      and(
        eq(decisionOutcome.decisionId, decisionId),
        eq(decisionOutcome.userId, userId)
      )
    )
    .orderBy(desc(decisionOutcome.createdAt));
}
