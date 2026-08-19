import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { PrincipleOrigin } from "@/lib/principles/provenance";
import {
  decision,
  decisionOutcome,
  decisionPrinciple,
  principle,
  principleRevision,
} from "./schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

export type PrincipleRelatedDecision = {
  createdAt: Date;
  id: string;
  outcomeId: string | null;
  outcomeResult: string | null;
  outcomeVerdict: "positive" | "mixed" | "negative" | "too_early" | null;
  question: string;
  relation: "suggested" | "applied" | "challenged" | "created" | "adopted";
  title: string;
};

export type PrincipleRegistryRecord = typeof principle.$inferSelect & {
  changedCount: number;
  origins: PrincipleOrigin[];
  relatedDecisions: PrincipleRelatedDecision[];
  revisions: (typeof principleRevision.$inferSelect)[];
  timesUsed: number;
};

async function getDecisionOrigin({
  sourceDecisionId,
  userId,
}: {
  sourceDecisionId: string | null;
  userId: string;
}): Promise<PrincipleOrigin[]> {
  if (!sourceDecisionId) {
    return [{ kind: "manual", label: "Manual" }];
  }

  const [source] = await db
    .select({ id: decision.id, title: decision.title })
    .from(decision)
    .where(and(eq(decision.id, sourceDecisionId), eq(decision.userId, userId)))
    .limit(1);

  return source
    ? [
        {
          href: `/decisions/${source.id}`,
          kind: "decision",
          label: source.title,
          sourceId: source.id,
        },
      ]
    : [
        {
          kind: "decision",
          label: "Decision unavailable",
          sourceId: sourceDecisionId,
        },
      ];
}

async function getRelatedDecisions({
  principleId,
  userId,
}: {
  principleId: string;
  userId: string;
}): Promise<PrincipleRelatedDecision[]> {
  return db
    .select({
      createdAt: decisionPrinciple.createdAt,
      id: decision.id,
      outcomeId: decisionOutcome.id,
      outcomeResult: decisionOutcome.result,
      outcomeVerdict: decisionOutcome.verdict,
      question: decision.question,
      relation: decisionPrinciple.relation,
      title: decision.title,
    })
    .from(decisionPrinciple)
    .innerJoin(decision, eq(decisionPrinciple.decisionId, decision.id))
    .leftJoin(
      decisionOutcome,
      and(
        eq(decisionOutcome.decisionId, decision.id),
        eq(decisionOutcome.userId, userId)
      )
    )
    .where(
      and(
        eq(decisionPrinciple.principleId, principleId),
        eq(decisionPrinciple.userId, userId),
        eq(decision.userId, userId)
      )
    )
    .orderBy(desc(decisionPrinciple.createdAt));
}

export async function listPrinciplesForRegistry(
  userId: string
): Promise<PrincipleRegistryRecord[]> {
  const selectedPrinciples = await db
    .select()
    .from(principle)
    .where(eq(principle.userId, userId))
    .orderBy(desc(principle.updatedAt));

  return Promise.all(
    selectedPrinciples.map(async (item) => {
      const [origins, relatedDecisions, revisions] = await Promise.all([
        getDecisionOrigin({ sourceDecisionId: item.sourceDecisionId, userId }),
        getRelatedDecisions({ principleId: item.id, userId }),
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
      const appliedDecisionIds = new Set(
        relatedDecisions
          .filter((row) => row.relation === "applied")
          .map((row) => row.id)
      );

      return {
        ...item,
        changedCount: Math.max(item.revision - 1, 0),
        origins,
        relatedDecisions,
        revisions,
        timesUsed: appliedDecisionIds.size,
      };
    })
  );
}

export async function createManualPrinciple({
  description,
  statement,
  userId,
}: {
  description?: string;
  statement: string;
  userId: string;
}) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(principle)
      .values({ description, statement, userId })
      .returning();

    await tx.insert(principleRevision).values({
      description: created.description,
      principleId: created.id,
      revision: 1,
      statement: created.statement,
      userId,
    });

    return created;
  });
}

export async function revisePrinciple({
  description,
  id,
  statement,
  userId,
}: {
  description?: string;
  id: string;
  statement: string;
  userId: string;
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
  status,
  userId,
}: {
  id: string;
  status: "active" | "retired";
  userId: string;
}) {
  const [updated] = await db
    .update(principle)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(principle.id, id), eq(principle.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function listUserPrinciplesForCortex(userId: string) {
  const rows = await db
    .select({
      id: principle.id,
      revision: principle.revision,
      statement: principle.statement,
      updatedAt: principle.updatedAt,
    })
    .from(principle)
    .where(and(eq(principle.userId, userId), ne(principle.status, "retired")))
    .orderBy(desc(principle.updatedAt));

  return rows.map((row) => ({
    id: row.id,
    provenance: "user_owned" as const,
    revision: row.revision,
    sourceKind: "user_principle" as const,
    statement: row.statement,
    updatedAt: row.updatedAt,
  }));
}
