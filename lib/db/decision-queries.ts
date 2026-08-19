import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { CouncilBrief, CouncilPlan } from "@/lib/council/types";
import type { PrincipleCandidate } from "@/lib/judgment/types";
import {
  type Decision,
  decision,
  decisionOutcome,
  decisionPrinciple,
  judgment,
  principle,
  principleRevision,
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

function asPrincipleCandidate(value: unknown): PrincipleCandidate | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Partial<PrincipleCandidate>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.statement !== "string" ||
    typeof candidate.rationale !== "string" ||
    typeof candidate.basedOnJudgmentId !== "string" ||
    typeof candidate.generatedAt !== "string" ||
    typeof candidate.updatedAt !== "string" ||
    !["pending", "adopted", "rejected"].includes(String(candidate.status))
  ) {
    return null;
  }
  return candidate as PrincipleCandidate;
}

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
  councilBrief,
  councilPlan,
  evidence,
}: {
  id: string;
  userId: string;
  councilAnalysis: string;
  councilBrief: CouncilBrief | null;
  councilPlan: CouncilPlan;
  evidence: DecisionEvidence[];
}) {
  const [updatedDecision] = await db
    .update(decision)
    .set({
      councilAnalysis,
      councilBrief,
      councilPlan,
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
  confidencePercent,
}: {
  decisionId: string;
  userId: string;
  summary: string;
  selectedOption?: string;
  rationale?: string;
  confidence?: "low" | "medium" | "high";
  confidencePercent?: number;
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
        confidencePercent,
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

export async function savePrincipleCandidate({
  decisionId,
  userId,
  basedOnJudgmentId,
  statement,
  rationale,
}: {
  decisionId: string;
  userId: string;
  basedOnJudgmentId: string;
  statement: string;
  rationale: string;
}) {
  const detail = await getDecisionDetail({ id: decisionId, userId });
  const latestJudgment = detail?.judgments[0];
  if (!detail || !latestJudgment || latestJudgment.id !== basedOnJudgmentId) {
    return null;
  }

  const now = new Date().toISOString();
  const candidate: PrincipleCandidate = {
    basedOnJudgmentId,
    generatedAt: now,
    id: crypto.randomUUID(),
    rationale,
    statement,
    status: "pending",
    updatedAt: now,
  };

  const [updatedDecision] = await db
    .update(decision)
    .set({ principleCandidate: candidate, updatedAt: new Date() })
    .where(and(eq(decision.id, decisionId), eq(decision.userId, userId)))
    .returning();

  return updatedDecision ? candidate : null;
}

export async function updatePrincipleCandidate({
  decisionId,
  userId,
  candidateId,
  action,
  statement,
  rationale,
}: {
  decisionId: string;
  userId: string;
  candidateId: string;
  action: "edit" | "reject";
  statement?: string;
  rationale?: string;
}) {
  const detail = await getDecisionDetail({ id: decisionId, userId });
  if (!detail) {
    return null;
  }
  const current = asPrincipleCandidate(detail.decision.principleCandidate);
  if (!current || current.id !== candidateId || current.status !== "pending") {
    return null;
  }

  const next: PrincipleCandidate = {
    ...current,
    rationale:
      action === "edit"
        ? rationale?.trim() || current.rationale
        : current.rationale,
    statement:
      action === "edit"
        ? statement?.trim() || current.statement
        : current.statement,
    status: action === "reject" ? "rejected" : "pending",
    updatedAt: new Date().toISOString(),
  };

  const [updatedDecision] = await db
    .update(decision)
    .set({ principleCandidate: next, updatedAt: new Date() })
    .where(and(eq(decision.id, decisionId), eq(decision.userId, userId)))
    .returning();

  return updatedDecision ? next : null;
}

export async function addDecisionPrinciple({
  decisionId,
  userId,
  statement,
  description,
  candidateId,
}: {
  decisionId: string;
  userId: string;
  statement: string;
  description?: string;
  candidateId?: string;
}) {
  const detail = await getDecisionDetail({ id: decisionId, userId });
  if (!detail) {
    return null;
  }

  const currentCandidate = asPrincipleCandidate(
    detail.decision.principleCandidate
  );
  if (
    candidateId &&
    (!currentCandidate ||
      currentCandidate.id !== candidateId ||
      currentCandidate.status !== "pending")
  ) {
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

    await tx.insert(principleRevision).values({
      description: createdPrinciple.description,
      principleId: createdPrinciple.id,
      revision: 1,
      statement: createdPrinciple.statement,
      userId,
    });

    await tx.insert(decisionPrinciple).values({
      decisionId,
      principleId: createdPrinciple.id,
      relation: "adopted",
      userId,
    });

    const adoptedCandidate =
      candidateId && currentCandidate
        ? {
            ...currentCandidate,
            status: "adopted" as const,
            updatedAt: new Date().toISOString(),
          }
        : detail.decision.principleCandidate;

    await tx
      .update(decision)
      .set({
        principleCandidate: adoptedCandidate,
        updatedAt: new Date(),
      })
      .where(and(eq(decision.id, decisionId), eq(decision.userId, userId)));

    return createdPrinciple;
  });
}

export async function revisePrinciple({
  id,
  userId,
  statement,
  description,
}: {
  id: string;
  userId: string;
  statement: string;
  description?: string;
}) {
  const [current] = await db
    .select()
    .from(principle)
    .where(and(eq(principle.id, id), eq(principle.userId, userId)))
    .limit(1);
  if (!current) {
    return null;
  }

  return db.transaction(async (tx) => {
    await tx
      .insert(principleRevision)
      .values({
        description: current.description,
        principleId: current.id,
        revision: current.revision,
        statement: current.statement,
        userId,
      })
      .onConflictDoNothing();

    const nextRevision = current.revision + 1;
    await tx.insert(principleRevision).values({
      description,
      principleId: current.id,
      revision: nextRevision,
      statement,
      userId,
    });

    const [updated] = await tx
      .update(principle)
      .set({
        description,
        revision: nextRevision,
        statement,
        status: "revised",
        updatedAt: new Date(),
      })
      .where(and(eq(principle.id, id), eq(principle.userId, userId)))
      .returning();

    return updated ?? null;
  });
}

export async function setPrincipleStatus({
  id,
  userId,
  status,
}: {
  id: string;
  userId: string;
  status: "active" | "retired";
}) {
  const [updated] = await db
    .update(principle)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(principle.id, id), eq(principle.userId, userId)))
    .returning();
  return updated ?? null;
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

export async function listPrinciples(userId: string) {
  const selectedPrinciples = await db
    .select()
    .from(principle)
    .where(eq(principle.userId, userId))
    .orderBy(desc(principle.updatedAt));

  return Promise.all(
    selectedPrinciples.map(async (item) => {
      const [originRows, appliedRows, revisions] = await Promise.all([
        item.sourceDecisionId
          ? db
              .select({
                id: decision.id,
                question: decision.question,
                title: decision.title,
              })
              .from(decision)
              .where(
                and(
                  eq(decision.id, item.sourceDecisionId),
                  eq(decision.userId, userId)
                )
              )
              .limit(1)
          : Promise.resolve([]),
        db
          .select({ decisionId: decisionPrinciple.decisionId })
          .from(decisionPrinciple)
          .where(
            and(
              eq(decisionPrinciple.principleId, item.id),
              eq(decisionPrinciple.userId, userId),
              eq(decisionPrinciple.relation, "applied")
            )
          ),
        db
          .select()
          .from(principleRevision)
          .where(
            and(
              eq(principleRevision.principleId, item.id),
              eq(principleRevision.userId, userId)
            )
          )
          .orderBy(desc(principleRevision.revision)),
      ]);

      return {
        ...item,
        originDecision: originRows[0] ?? null,
        revisions,
        timesApplied: appliedRows.length,
      };
    })
  );
}
