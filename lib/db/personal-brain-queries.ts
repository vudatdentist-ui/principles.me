import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  possibleContradiction,
  relevanceScore,
} from "@/lib/personal-brain/relevance";
import type {
  PersonalBrainSummary,
  PersonalContext,
  PersonalPrincipleMemory,
  SimilarDecisionMemory,
} from "@/lib/personal-brain/types";
import {
  decision,
  decisionOutcome,
  decisionPrinciple,
  judgment,
  principle,
} from "./schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

function asIso(value: Date) {
  return value.toISOString();
}

export async function getPersonalContext({
  context,
  currentDecisionId,
  question,
  userId,
}: {
  context: string;
  currentDecisionId?: string;
  question: string;
  userId: string;
}): Promise<PersonalContext> {
  const [principles, decisions, judgments, links] = await Promise.all([
    db
      .select()
      .from(principle)
      .where(eq(principle.userId, userId))
      .orderBy(desc(principle.updatedAt)),
    db
      .select()
      .from(decision)
      .where(eq(decision.userId, userId))
      .orderBy(desc(decision.updatedAt)),
    db
      .select()
      .from(judgment)
      .where(eq(judgment.userId, userId))
      .orderBy(desc(judgment.createdAt)),
    db
      .select()
      .from(decisionPrinciple)
      .where(eq(decisionPrinciple.userId, userId)),
  ]);

  const currentText = `${question}\n${context}`.trim();
  const decisionsById = new Map(decisions.map((item) => [item.id, item]));
  const latestJudgmentByDecision = new Map<string, (typeof judgments)[number]>();
  for (const item of judgments) {
    if (!latestJudgmentByDecision.has(item.decisionId)) {
      latestJudgmentByDecision.set(item.decisionId, item);
    }
  }

  const currentLinks = currentDecisionId
    ? links.filter((item) => item.decisionId === currentDecisionId)
    : [];

  const principleMemories: PersonalPrincipleMemory[] = principles
    .filter((item) => item.status !== "retired")
    .map((item) => {
      const origin = item.sourceDecisionId
        ? decisionsById.get(item.sourceDecisionId) ?? null
        : null;
      const directScore = relevanceScore(
        currentText,
        `${item.statement}\n${item.description ?? ""}`
      );
      const originScore = origin
        ? relevanceScore(
            currentText,
            `${origin.question}\n${origin.context ?? ""}\n${origin.title}`
          )
        : 0;
      const relevance = Math.max(directScore, originScore * 0.92);
      return {
        applied: currentLinks.some(
          (link) =>
            link.principleId === item.id &&
            (link.relation === "applied" || link.relation === "adopted")
        ),
        createdAt: asIso(item.createdAt),
        description: item.description,
        id: item.id,
        originDecision: origin
          ? {
              createdAt: asIso(origin.createdAt),
              id: origin.id,
              title: origin.question || origin.title,
            }
          : null,
        relevance,
        revision: item.revision,
        statement: item.statement,
        status: item.status,
      } satisfies PersonalPrincipleMemory;
    })
    .filter((item) => item.relevance >= 0.025)
    .sort((a, b) => b.relevance - a.relevance || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const similarDecisions: SimilarDecisionMemory[] = decisions
    .filter((item) => {
      if (currentDecisionId && item.id === currentDecisionId) {
        return false;
      }
      if (!currentDecisionId) {
        return !(
          item.question.trim() === question.trim() &&
          (item.context ?? "").trim() === context.trim()
        );
      }
      return true;
    })
    .map((item) => {
      const latestJudgment = latestJudgmentByDecision.get(item.id) ?? null;
      const relevance = relevanceScore(
        currentText,
        `${item.question}\n${item.context ?? ""}\n${item.title}\n${latestJudgment?.summary ?? ""}`
      );
      return {
        createdAt: asIso(item.createdAt),
        id: item.id,
        judgment: latestJudgment?.summary ?? null,
        question: item.question,
        relevance,
        status: item.status,
        title: item.title,
      } satisfies SimilarDecisionMemory;
    })
    .filter((item) => item.relevance >= 0.04)
    .sort((a, b) => b.relevance - a.relevance || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  const currentJudgment = currentDecisionId
    ? latestJudgmentByDecision.get(currentDecisionId) ?? null
    : null;
  const contradictions = currentJudgment
    ? principleMemories
        .filter((item) =>
          possibleContradiction({
            judgment: currentJudgment.summary,
            principle: item.statement,
          })
        )
        .slice(0, 3)
        .map((item) => ({
          principleId: item.id,
          principleStatement: item.statement,
          prompt:
            "Has your principle changed, or is this situation materially different?",
          reason:
            "Your latest judgment appears to move against a previously adopted principle on a similar topic.",
        }))
    : [];

  return {
    contradictions,
    generatedAt: new Date().toISOString(),
    principles: principleMemories,
    similarDecisions,
  };
}

export async function applyExistingPrinciple({
  decisionId,
  principleId,
  userId,
}: {
  decisionId: string;
  principleId: string;
  userId: string;
}) {
  const [[selectedDecision], [selectedPrinciple], [existing]] =
    await Promise.all([
      db
        .select({ id: decision.id })
        .from(decision)
        .where(and(eq(decision.id, decisionId), eq(decision.userId, userId)))
        .limit(1),
      db
        .select({ id: principle.id, status: principle.status })
        .from(principle)
        .where(and(eq(principle.id, principleId), eq(principle.userId, userId)))
        .limit(1),
      db
        .select()
        .from(decisionPrinciple)
        .where(
          and(
            eq(decisionPrinciple.decisionId, decisionId),
            eq(decisionPrinciple.principleId, principleId),
            eq(decisionPrinciple.userId, userId)
          )
        )
        .limit(1),
    ]);

  if (!selectedDecision || !selectedPrinciple || selectedPrinciple.status === "retired") {
    return null;
  }
  if (existing) {
    return existing;
  }

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(decisionPrinciple)
      .values({ decisionId, principleId, relation: "applied", userId })
      .returning();
    await tx
      .update(decision)
      .set({ updatedAt: new Date() })
      .where(and(eq(decision.id, decisionId), eq(decision.userId, userId)));
    return created ?? null;
  });
}

export async function getPersonalBrainSummary(
  userId: string
): Promise<PersonalBrainSummary> {
  const [decisions, principles, links, outcomes] = await Promise.all([
    db.select().from(decision).where(eq(decision.userId, userId)),
    db.select().from(principle).where(eq(principle.userId, userId)),
    db
      .select()
      .from(decisionPrinciple)
      .where(eq(decisionPrinciple.userId, userId)),
    db
      .select()
      .from(decisionOutcome)
      .where(eq(decisionOutcome.userId, userId)),
  ]);

  const statusCounts: PersonalBrainSummary["statusCounts"] = {
    archived: 0,
    decided: 0,
    draft: 0,
    exploring: 0,
    review_due: 0,
    reviewed: 0,
  };
  for (const item of decisions) {
    statusCounts[item.status] += 1;
  }

  const applicationCounts = new Map<string, number>();
  for (const link of links) {
    if (link.relation === "applied") {
      applicationCounts.set(
        link.principleId,
        (applicationCounts.get(link.principleId) ?? 0) + 1
      );
    }
  }

  const reusedPrinciples = principles
    .map((item) => ({
      id: item.id,
      statement: item.statement,
      timesApplied: applicationCounts.get(item.id) ?? 0,
    }))
    .filter((item) => item.timesApplied > 0)
    .sort((a, b) => b.timesApplied - a.timesApplied)
    .slice(0, 5);

  return {
    decisionCount: decisions.length,
    principleCount: principles.length,
    principlesReused: applicationCounts.size,
    reviewCount: new Set(outcomes.map((item) => item.decisionId)).size,
    reusedPrinciples,
    statusCounts,
  };
}
