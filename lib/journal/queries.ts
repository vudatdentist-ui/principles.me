import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { principle, principleRevision } from "@/lib/db/schema";
import {
  journalEntry,
  journalPrincipleLink,
  journalReflection,
} from "./schema";
import type { JournalCandidate } from "./types";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

function candidateFromReflection(
  reflection: typeof journalReflection.$inferSelect | null
): JournalCandidate | null {
  if (
    !reflection?.candidateId ||
    !reflection.candidateStatement ||
    !reflection.candidateStatus
  ) {
    return null;
  }
  return {
    id: reflection.candidateId,
    rationale: reflection.candidateRationale,
    statement: reflection.candidateStatement,
    status: reflection.candidateStatus,
  };
}

export async function listJournalEntries(userId: string) {
  return db
    .select({
      body: journalEntry.body,
      candidateStatus: journalReflection.candidateStatus,
      createdAt: journalEntry.createdAt,
      id: journalEntry.id,
      observation: journalReflection.observation,
      occurredAt: journalEntry.occurredAt,
      reflectedAt: journalReflection.updatedAt,
      reflection: journalReflection.text,
      updatedAt: journalEntry.updatedAt,
    })
    .from(journalEntry)
    .leftJoin(
      journalReflection,
      and(
        eq(journalReflection.entryId, journalEntry.id),
        eq(journalReflection.userId, userId)
      )
    )
    .where(eq(journalEntry.userId, userId))
    .orderBy(desc(journalEntry.occurredAt), desc(journalEntry.createdAt));
}

export async function createJournalEntry({
  body,
  occurredAt,
  userId,
}: {
  body: string;
  occurredAt?: Date;
  userId: string;
}) {
  const [created] = await db
    .insert(journalEntry)
    .values({ body, occurredAt: occurredAt ?? new Date(), userId })
    .returning();
  return created;
}

export async function getJournalEntryDetail({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  const [entry] = await db
    .select()
    .from(journalEntry)
    .where(and(eq(journalEntry.id, id), eq(journalEntry.userId, userId)))
    .limit(1);
  if (!entry) {
    return null;
  }

  const [reflection] = await db
    .select()
    .from(journalReflection)
    .where(
      and(
        eq(journalReflection.entryId, id),
        eq(journalReflection.userId, userId)
      )
    )
    .limit(1);

  const principles = await db
    .select({
      id: principle.id,
      relation: journalPrincipleLink.relation,
      revision: principle.revision,
      statement: principle.statement,
      status: principle.status,
    })
    .from(journalPrincipleLink)
    .innerJoin(principle, eq(journalPrincipleLink.principleId, principle.id))
    .where(
      and(
        eq(journalPrincipleLink.entryId, id),
        eq(journalPrincipleLink.userId, userId),
        eq(principle.userId, userId)
      )
    )
    .orderBy(desc(journalPrincipleLink.createdAt));

  return {
    candidate: candidateFromReflection(reflection ?? null),
    entry,
    principles,
    reflection: reflection ?? null,
  };
}

export async function updateJournalEntry({
  body,
  id,
  occurredAt,
  userId,
}: {
  body?: string;
  id: string;
  occurredAt?: Date;
  userId: string;
}) {
  const patch: Partial<typeof journalEntry.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (body !== undefined) {
    patch.body = body;
  }
  if (occurredAt !== undefined) {
    patch.occurredAt = occurredAt;
  }
  const [updated] = await db
    .update(journalEntry)
    .set(patch)
    .where(and(eq(journalEntry.id, id), eq(journalEntry.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function deleteJournalEntry({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  const [deleted] = await db
    .delete(journalEntry)
    .where(and(eq(journalEntry.id, id), eq(journalEntry.userId, userId)))
    .returning({ id: journalEntry.id });
  return deleted ?? null;
}

export async function saveJournalReflection({
  candidateRationale,
  candidateStatement,
  entryId,
  observation,
  text,
  userId,
}: {
  candidateRationale?: string | null;
  candidateStatement?: string | null;
  entryId: string;
  observation?: string | null;
  text: string;
  userId: string;
}) {
  const detail = await getJournalEntryDetail({ id: entryId, userId });
  if (!detail) {
    return null;
  }

  const existing = detail.reflection;
  const shouldSetCandidate = Boolean(candidateStatement?.trim());
  const canWriteCandidate =
    shouldSetCandidate &&
    (!existing?.candidateStatus || existing.candidateStatus === "pending");
  const candidateId = canWriteCandidate
    ? existing?.candidateId ?? crypto.randomUUID()
    : existing?.candidateId ?? null;
  const candidateStatus = canWriteCandidate
    ? "pending"
    : existing?.candidateStatus ?? null;

  const values = {
    candidateId,
    candidateRationale: canWriteCandidate
      ? candidateRationale?.trim() || null
      : existing?.candidateRationale ?? null,
    candidateStatement: canWriteCandidate
      ? candidateStatement?.trim() || null
      : existing?.candidateStatement ?? null,
    candidateStatus,
    entryId,
    observation: observation?.trim() || null,
    text,
    updatedAt: new Date(),
    userId,
  } as const;

  if (existing) {
    const [updated] = await db
      .update(journalReflection)
      .set(values)
      .where(
        and(
          eq(journalReflection.id, existing.id),
          eq(journalReflection.userId, userId)
        )
      )
      .returning();
    return updated ?? null;
  }

  const [created] = await db.insert(journalReflection).values(values).returning();
  return created;
}

export async function updateJournalCandidate({
  action,
  candidateId,
  entryId,
  rationale,
  statement,
  userId,
}: {
  action: "edit" | "reject";
  candidateId: string;
  entryId: string;
  rationale?: string | null;
  statement?: string;
  userId: string;
}) {
  const detail = await getJournalEntryDetail({ id: entryId, userId });
  const reflection = detail?.reflection;
  if (
    !reflection ||
    reflection.candidateId !== candidateId ||
    reflection.candidateStatus !== "pending"
  ) {
    return null;
  }

  const [updated] = await db
    .update(journalReflection)
    .set(
      action === "reject"
        ? { candidateStatus: "rejected", updatedAt: new Date() }
        : {
            candidateRationale: rationale?.trim() || null,
            candidateStatement: statement?.trim(),
            updatedAt: new Date(),
          }
    )
    .where(
      and(
        eq(journalReflection.id, reflection.id),
        eq(journalReflection.userId, userId),
        eq(journalReflection.candidateId, candidateId),
        eq(journalReflection.candidateStatus, "pending")
      )
    )
    .returning();
  return updated ?? null;
}

export async function adoptJournalCandidate({
  candidateId,
  description,
  entryId,
  statement,
  userId,
}: {
  candidateId: string;
  description?: string | null;
  entryId: string;
  statement?: string;
  userId: string;
}) {
  const detail = await getJournalEntryDetail({ id: entryId, userId });
  const reflection = detail?.reflection;
  if (
    !detail ||
    !reflection ||
    reflection.candidateId !== candidateId ||
    reflection.candidateStatus !== "pending" ||
    !reflection.candidateStatement
  ) {
    return null;
  }

  const adoptedStatement = statement?.trim() || reflection.candidateStatement;
  const adoptedDescription =
    description?.trim() || reflection.candidateRationale || undefined;

  return db.transaction(async (tx) => {
    const [createdPrinciple] = await tx
      .insert(principle)
      .values({
        description: adoptedDescription,
        statement: adoptedStatement,
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

    await tx.insert(journalPrincipleLink).values({
      entryId,
      principleId: createdPrinciple.id,
      reflectionId: reflection.id,
      relation: "origin",
      userId,
    });

    const [updatedReflection] = await tx
      .update(journalReflection)
      .set({
        adoptedPrincipleId: createdPrinciple.id,
        candidateRationale: adoptedDescription ?? null,
        candidateStatement: adoptedStatement,
        candidateStatus: "adopted",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(journalReflection.id, reflection.id),
          eq(journalReflection.userId, userId),
          eq(journalReflection.candidateId, candidateId),
          eq(journalReflection.candidateStatus, "pending")
        )
      )
      .returning();

    if (!updatedReflection) {
      throw new Error("JOURNAL_CANDIDATE_ALREADY_RESOLVED");
    }
    return createdPrinciple;
  });
}

/**
 * Structured owner-scoped boundary for future Personal Memory/Cortex retrieval.
 * It deliberately performs no embeddings, vector search, or cross-user lookup.
 */
export async function listJournalMemoryContext({
  limit = 50,
  userId,
}: {
  limit?: number;
  userId: string;
}) {
  const rows = await db
    .select({
      entryId: journalEntry.id,
      experience: journalEntry.body,
      observation: journalReflection.observation,
      occurredAt: journalEntry.occurredAt,
      reflection: journalReflection.text,
    })
    .from(journalEntry)
    .leftJoin(
      journalReflection,
      and(
        eq(journalReflection.entryId, journalEntry.id),
        eq(journalReflection.userId, userId)
      )
    )
    .where(eq(journalEntry.userId, userId))
    .orderBy(desc(journalEntry.occurredAt))
    .limit(Math.max(1, Math.min(limit, 100)));

  return rows;
}
