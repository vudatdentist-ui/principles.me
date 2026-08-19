import "server-only";

import { and, desc, eq, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { CouncilBrief } from "@/lib/council/types";
import type {
  AssumptionReviewInput,
  DecisionQuality,
  PrincipleReviewAction,
  ReasoningQuality,
} from "@/lib/learning-loop/types";
import { getDecisionDetail } from "./decision-queries";
import {
  decision,
  decisionAssumptionReview,
  decisionOutcome,
  decisionPrinciple,
  decisionPrincipleReview,
  principle,
  principleRevision,
} from "./schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

function assumptionsFromBrief(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }
  const brief = value as Partial<CouncilBrief>;
  if (!Array.isArray(brief.factsVsAssumptions)) {
    return [];
  }
  return brief.factsVsAssumptions
    .filter((item) => item.status === "assumption")
    .map((item) => item.text)
    .filter(Boolean)
    .slice(0, 12);
}

export async function refreshReviewDueStatuses(userId: string) {
  await db
    .update(decision)
    .set({ status: "review_due", updatedAt: new Date() })
    .where(
      and(
        eq(decision.userId, userId),
        eq(decision.status, "decided"),
        lte(decision.reviewAt, new Date())
      )
    );
}

export async function scheduleDecisionReview({
  decisionId,
  reviewAt,
  userId,
}: {
  decisionId: string;
  reviewAt: Date | null;
  userId: string;
}) {
  const [current] = await db
    .select()
    .from(decision)
    .where(and(eq(decision.id, decisionId), eq(decision.userId, userId)))
    .limit(1);
  if (!current) {
    return null;
  }

  let status = current.status;
  if (status !== "reviewed" && status !== "archived") {
    if (reviewAt && reviewAt <= new Date()) {
      status = "review_due";
    } else if (status === "review_due") {
      status = "decided";
    }
  }

  const [updated] = await db
    .update(decision)
    .set({ reviewAt, status, updatedAt: new Date() })
    .where(and(eq(decision.id, decisionId), eq(decision.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function getLearningReviewContext({
  decisionId,
  userId,
}: {
  decisionId: string;
  userId: string;
}) {
  await refreshReviewDueStatuses(userId);
  const detail = await getDecisionDetail({ id: decisionId, userId });
  if (!detail) {
    return null;
  }

  const [assumptionReviews, principleReviews] = await Promise.all([
    db
      .select()
      .from(decisionAssumptionReview)
      .where(
        and(
          eq(decisionAssumptionReview.decisionId, decisionId),
          eq(decisionAssumptionReview.userId, userId)
        )
      )
      .orderBy(desc(decisionAssumptionReview.createdAt)),
    db
      .select()
      .from(decisionPrincipleReview)
      .where(
        and(
          eq(decisionPrincipleReview.decisionId, decisionId),
          eq(decisionPrincipleReview.userId, userId)
        )
      )
      .orderBy(desc(decisionPrincipleReview.createdAt)),
  ]);

  return {
    assumptions: assumptionsFromBrief(detail.decision.councilBrief),
    assumptionReviews,
    decision: detail.decision,
    outcomes: detail.outcomes,
    principleReviews,
    principles: detail.principles,
  };
}

export async function saveDecisionReview({
  assumptionReviews,
  decisionId,
  decisionQuality,
  lessons,
  reasoningQuality,
  result,
  userId,
  verdict,
}: {
  assumptionReviews: AssumptionReviewInput[];
  decisionId: string;
  decisionQuality: DecisionQuality;
  lessons?: string;
  reasoningQuality: ReasoningQuality;
  result: string;
  userId: string;
  verdict: "positive" | "mixed" | "negative" | "too_early";
}) {
  const detail = await getDecisionDetail({ id: decisionId, userId });
  if (!detail) {
    return null;
  }

  return db.transaction(async (tx) => {
    const [createdOutcome] = await tx
      .insert(decisionOutcome)
      .values({
        decisionId,
        decisionQuality,
        lessons,
        reasoningQuality,
        result,
        userId,
        verdict,
      })
      .returning();

    if (assumptionReviews.length) {
      await tx.insert(decisionAssumptionReview).values(
        assumptionReviews.map((item) => ({
          assumptionText: item.assumptionText,
          decisionId,
          note: item.note,
          outcomeId: createdOutcome.id,
          userId,
          verdict: item.verdict,
        }))
      );
    }

    await tx
      .update(decision)
      .set({
        reviewedAt: new Date(),
        status: "reviewed",
        updatedAt: new Date(),
      })
      .where(and(eq(decision.id, decisionId), eq(decision.userId, userId)));

    return createdOutcome;
  });
}

export async function reviewDecisionPrinciple({
  action,
  decisionId,
  outcomeId,
  principleId,
  revisedStatement,
  userId,
}: {
  action: PrincipleReviewAction;
  decisionId: string;
  outcomeId: string;
  principleId: string;
  revisedStatement?: string;
  userId: string;
}) {
  const [[selectedOutcome], [selectedPrinciple], [link], [existingReview]] =
    await Promise.all([
      db
        .select({ id: decisionOutcome.id })
        .from(decisionOutcome)
        .where(
          and(
            eq(decisionOutcome.id, outcomeId),
            eq(decisionOutcome.decisionId, decisionId),
            eq(decisionOutcome.userId, userId)
          )
        )
        .limit(1),
      db
        .select()
        .from(principle)
        .where(and(eq(principle.id, principleId), eq(principle.userId, userId)))
        .limit(1),
      db
        .select({ principleId: decisionPrinciple.principleId })
        .from(decisionPrinciple)
        .where(
          and(
            eq(decisionPrinciple.decisionId, decisionId),
            eq(decisionPrinciple.principleId, principleId),
            eq(decisionPrinciple.userId, userId)
          )
        )
        .limit(1),
      db
        .select({ id: decisionPrincipleReview.id })
        .from(decisionPrincipleReview)
        .where(
          and(
            eq(decisionPrincipleReview.outcomeId, outcomeId),
            eq(decisionPrincipleReview.principleId, principleId),
            eq(decisionPrincipleReview.userId, userId)
          )
        )
        .limit(1),
    ]);

  if (!selectedOutcome || !selectedPrinciple || !link || existingReview) {
    return null;
  }
  if (action === "revise" && !revisedStatement?.trim()) {
    return null;
  }

  return db.transaction(async (tx) => {
    const previousRevision = selectedPrinciple.revision;
    const previousStatement = selectedPrinciple.statement;
    let resultingRevision = previousRevision;
    let resultingStatement = previousStatement;

    if (action === "revise") {
      await tx
        .insert(principleRevision)
        .values({
          description: selectedPrinciple.description,
          principleId,
          revision: selectedPrinciple.revision,
          statement: selectedPrinciple.statement,
          userId,
        })
        .onConflictDoNothing();

      resultingRevision = previousRevision + 1;
      resultingStatement = revisedStatement?.trim() ?? previousStatement;
      await tx.insert(principleRevision).values({
        description: selectedPrinciple.description,
        principleId,
        revision: resultingRevision,
        statement: resultingStatement,
        userId,
      });
      await tx
        .update(principle)
        .set({
          revision: resultingRevision,
          statement: resultingStatement,
          status: "revised",
          updatedAt: new Date(),
        })
        .where(and(eq(principle.id, principleId), eq(principle.userId, userId)));
    } else if (action === "retire") {
      await tx
        .update(principle)
        .set({ status: "retired", updatedAt: new Date() })
        .where(and(eq(principle.id, principleId), eq(principle.userId, userId)));
    }

    const [createdReview] = await tx
      .insert(decisionPrincipleReview)
      .values({
        action,
        decisionId,
        outcomeId,
        previousRevision,
        previousStatement,
        principleId,
        resultingRevision,
        resultingStatement,
        userId,
      })
      .returning();

    return createdReview ?? null;
  });
}
