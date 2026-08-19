import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  type Decision,
  decision,
  decisionOutcome,
  decisionPrinciple,
  judgment,
  principle,
  type User,
  user,
} from "./schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

export type DecisionEvidence = Record<string, unknown>;

export type DecisionDetail = {
  decision: Decision;
  judgments: (typeof judgment.$inferSelect)[];
  outcomes: (typeof decisionOutcome.$inferSelect)[];
  principles: {
    id: string;
    statement: string;
    description: string | null;
    revision: number;
    status: "active" | "revised" | "retired";
    relation: "suggested" | "applied" | "challenged" | "created" | "adopted";
    createdAt: Date;
  }[];
};

export async function getWorkspaceUserById(id: string): Promise<User | null> {
  const [selectedUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  return selectedUser ?? null;
}

export async function createWorkspaceUser() {
  const token = crypto.randomUUID();
  const [createdUser] = await db
    .insert(user)
    .values({
      email: `workspace-${token}@local.principles`,
      isAnonymous: true,
      name: "Your Workspace",
    })
    .returning();
  return createdUser;
}

export function listDecisions(userId: string) {
  return db
    .select()
    .from(decision)
    .where(eq(decision.userId, userId))
    .orderBy(desc(decision.updatedAt));
}

export async function createDecision({
  userId,
  title,
  question,
  context,
}: {
  userId: string;
  title: string;
  question: string;
  context: string;
}) {
  const [createdDecision] = await db
    .insert(decision)
    .values({ context, question, title, userId })
    .returning();
  return createdDecision;
}

export async function getDecisionDetail({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<DecisionDetail | null> {
  const [selectedDecision] = await db
    .select()
    .from(decision)
    .where(and(eq(decision.id, id), eq(decision.userId, userId)))
    .limit(1);

  if (!selectedDecision) {
    return null;
  }

  const [judgments, outcomes, linkedPrinciples] = await Promise.all([
    db
      .select()
      .from(judgment)
      .where(and(eq(judgment.decisionId, id), eq(judgment.userId, userId)))
      .orderBy(desc(judgment.createdAt)),
    db
      .select()
      .from(decisionOutcome)
      .where(
        and(
          eq(decisionOutcome.decisionId, id),
          eq(decisionOutcome.userId, userId)
        )
      )
      .orderBy(desc(decisionOutcome.createdAt)),
    db
      .select({
        createdAt: principle.createdAt,
        description: principle.description,
        id: principle.id,
        relation: decisionPrinciple.relation,
        revision: principle.revision,
        statement: principle.statement,
        status: principle.status,
      })
      .from(decisionPrinciple)
      .innerJoin(principle, eq(decisionPrinciple.principleId, principle.id))
      .where(
        and(
          eq(decisionPrinciple.decisionId, id),
          eq(decisionPrinciple.userId, userId),
          eq(principle.userId, userId)
        )
      )
      .orderBy(desc(decisionPrinciple.createdAt)),
  ]);

  return {
    decision: selectedDecision,
    judgments,
    outcomes,
    principles: linkedPrinciples,
  };
}

export async function saveDecisionAnalysis({
  id,
  userId,
  councilAnalysis,
  evidence,
}: {
  id: string;
  userId: string;
  councilAnalysis: string;
  evidence: DecisionEvidence[];
}) {
  const [updatedDecision] = await db
    .update(decision)
    .set({
      councilAnalysis,
      evidence,
      status: "exploring",
      updatedAt: new Date(),
    })
    .where(and(eq(decision.id, id), eq(decision.userId, userId)))
    .returning();
  return updatedDecision ?? null;
}

export async function saveJudgment({
  decisionId,
  userId,
  summary,
  selectedOption,
  rationale,
  confidence,
}: {
  decisionId: string;
  userId: string;
  summary: string;
  selectedOption?: string;
  rationale?: string;
  confidence?: "low" | "medium" | "high";
}) {
  const detail = await getDecisionDetail({ id: decisionId, userId });
  if (!detail) {
    return null;
  }

  return db.transaction(async (tx) => {
    const [createdJudgment] = await tx
      .insert(judgment)
      .values({
        confidence,
        decisionId,
        rationale,
        selectedOption,
        summary,
        userId,
      })
      .returning();

    await tx
      .update(decision)
      .set({ decidedAt: new Date(), status: "decided", updatedAt: new Date() })
      .where(and(eq(decision.id, decisionId), eq(decision.userId, userId)));

    return createdJudgment;
  });
}

export async function addDecisionPrinciple({
  decisionId,
  userId,
  statement,
  description,
}: {
  decisionId: string;
  userId: string;
  statement: string;
  description?: string;
}) {
  const detail = await getDecisionDetail({ id: decisionId, userId });
  if (!detail) {
    return null;
  }

  return db.transaction(async (tx) => {
    const [createdPrinciple] = await tx
      .insert(principle)
      .values({
        description,
        sourceDecisionId: decisionId,
        statement,
        userId,
      })
      .returning();

    await tx.insert(decisionPrinciple).values({
      decisionId,
      principleId: createdPrinciple.id,
      relation: "adopted",
      userId,
    });

    await tx
      .update(decision)
      .set({ updatedAt: new Date() })
      .where(and(eq(decision.id, decisionId), eq(decision.userId, userId)));

    return createdPrinciple;
  });
}

export async function saveDecisionOutcome({
  decisionId,
  userId,
  result,
  lessons,
  verdict,
}: {
  decisionId: string;
  userId: string;
  result: string;
  lessons?: string;
  verdict: "positive" | "mixed" | "negative" | "too_early";
}) {
  const detail = await getDecisionDetail({ id: decisionId, userId });
  if (!detail) {
    return null;
  }

  return db.transaction(async (tx) => {
    const [createdOutcome] = await tx
      .insert(decisionOutcome)
      .values({ decisionId, lessons, result, userId, verdict })
      .returning();

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

export function listPrinciples(userId: string) {
  return db
    .select()
    .from(principle)
    .where(eq(principle.userId, userId))
    .orderBy(desc(principle.updatedAt));
}
