import "server-only";

import { parseDecisionBrief } from "@/features/decision/contracts";
import {
  completeDecisionRunRecord,
  createDecisionRunRecord,
  createSavedDecisionRecord,
  failDecisionRunRecord,
  getDecisionDetailRecord,
  getDecisionRunRecord,
  listDueForReviewDecisionRecords,
  listRecentDecisionRecords,
} from "@/lib/db/queries/decisions";
import type {
  Decision as DatabaseDecision,
  DecisionOutcome as DatabaseDecisionOutcome,
  DecisionRun as DatabaseDecisionRun,
  Principle as DatabasePrinciple,
} from "@/lib/db/schema";
import type {
  DecisionDetail,
  DecisionRepository,
  DecisionRun,
  DecisionSummary,
  JsonSnapshot,
  PersistedDecision,
  PersistedDecisionOutcome,
  PersistedPrinciple,
} from "./types";

export type DecisionPersistenceErrorCode =
  | "corrupt_snapshot"
  | "run_not_available"
  | "run_not_writable";

export class DecisionPersistenceError extends Error {
  readonly code: DecisionPersistenceErrorCode;

  constructor(code: DecisionPersistenceErrorCode) {
    super(code);
    this.name = "DecisionPersistenceError";
    this.code = code;
  }
}

function requiredSnapshot(value: unknown): JsonSnapshot {
  if (value === null || value === undefined) {
    throw new DecisionPersistenceError("corrupt_snapshot");
  }

  return value as JsonSnapshot;
}

function optionalSnapshot(value: unknown): JsonSnapshot | null {
  if (value === null || value === undefined) {
    return null;
  }

  return value as JsonSnapshot;
}

function mapDecisionRun(run: DatabaseDecisionRun): DecisionRun {
  return {
    analysisSnapshot: optionalSnapshot(run.analysisSnapshot),
    auditSnapshot: optionalSnapshot(run.auditSnapshot),
    completedAt: run.completedAt,
    contextSnapshot: requiredSnapshot(run.contextSnapshot),
    decisionBrief:
      run.decisionBrief === null
        ? null
        : parseDecisionBrief(run.decisionBrief),
    decisionId: run.decisionId,
    errorCode: run.errorCode,
    evidenceSnapshot: optionalSnapshot(run.evidenceSnapshot),
    failedAt: run.failedAt,
    id: run.id,
    model: run.model,
    promptVersion: run.promptVersion,
    question: run.question,
    retrievalPlan: requiredSnapshot(run.retrievalPlan),
    startedAt: run.startedAt,
    userId: run.userId,
  };
}

function mapDecision(decision: DatabaseDecision): PersistedDecision {
  return {
    createdAt: decision.createdAt,
    decidedAt: decision.decidedAt,
    id: decision.id,
    objective: decision.objective,
    question: decision.question,
    reviewAt: decision.reviewAt,
    reviewedAt: decision.reviewedAt,
    status: decision.status,
    title: decision.title,
    updatedAt: decision.updatedAt,
    userId: decision.userId,
  };
}

function mapDecisionSummary(decision: DecisionSummary): DecisionSummary {
  return decision;
}

function mapOutcome(
  outcome: DatabaseDecisionOutcome
): PersistedDecisionOutcome {
  return {
    createdAt: outcome.createdAt,
    decisionId: outcome.decisionId,
    decisionQuality: outcome.decisionQuality,
    id: outcome.id,
    lessons: outcome.lessons,
    reasoningQuality: outcome.reasoningQuality,
    result: outcome.result,
    updatedAt: outcome.updatedAt,
    userId: outcome.userId,
    verdict: outcome.verdict,
  };
}

function mapPrinciple(principle: DatabasePrinciple): PersistedPrinciple {
  return {
    createdAt: principle.createdAt,
    description: principle.description,
    id: principle.id,
    revision: principle.revision,
    sourceDecisionId: principle.sourceDecisionId,
    statement: principle.statement,
    status: principle.status,
    updatedAt: principle.updatedAt,
    userId: principle.userId,
  };
}

export const decisionRepository: DecisionRepository = {
  async completeRun(input) {
    const run = await completeDecisionRunRecord(input);
    if (!run) {
      throw new DecisionPersistenceError("run_not_writable");
    }

    return mapDecisionRun(run);
  },

  async createDecision(input) {
    const decision = await createSavedDecisionRecord(input);
    if (!decision) {
      throw new DecisionPersistenceError("run_not_available");
    }

    return mapDecision(decision);
  },

  async createRun(input) {
    return mapDecisionRun(await createDecisionRunRecord(input));
  },

  async failRun(input) {
    const run = await failDecisionRunRecord(input);
    if (!run) {
      throw new DecisionPersistenceError("run_not_writable");
    }
  },

  async getDecision(id, userId): Promise<DecisionDetail | null> {
    const detail = await getDecisionDetailRecord(id, userId);
    if (!detail) {
      return null;
    }

    return {
      decision: mapDecision(detail.decision),
      outcomes: detail.outcomes.map(mapOutcome),
      principles: detail.principles.map(mapPrinciple),
      run: detail.run ? mapDecisionRun(detail.run) : null,
    };
  },

  async getRun(id, userId) {
    const run = await getDecisionRunRecord(id, userId);
    return run ? mapDecisionRun(run) : null;
  },

  async listDueForReview(userId) {
    const decisions = await listDueForReviewDecisionRecords(userId);
    return decisions.map(mapDecisionSummary);
  },

  async listRecent(userId, limit) {
    const decisions = await listRecentDecisionRecords(userId, limit);
    return decisions.map(mapDecisionSummary);
  },
};
